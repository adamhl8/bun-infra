#!/usr/bin/env bun
import { rm } from "node:fs/promises"
import util from "node:util"
import type { JsonValue } from "type-fest"
import * as v from "valibot"
import { db } from "./db.ts"
import { attempt, type error, fmtError } from "./errs.ts"
import { sudo } from "./lib.ts"
import { logger } from "./logger.ts"
import type { Plugin, PluginDetails } from "./plugin.ts"
import { type BunInfraConfig, BunInfraSchema, type HostContext, HostContextSchema } from "./types.ts"
import { continuep } from "./utils.ts"

// TODO: plugin dependencies

function getConfig(config: BunInfraConfig) {
  const result = v.safeParse(BunInfraSchema, config)
  if (!result.success) {
    logger.fatal("Invalid config:")
    for (const issue of result.issues) {
      const path = v.getDotPath(issue) ?? ""
      const pathParts = path.split(".")
      const isPluginIssue = pathParts.length > 2 && pathParts[1] === "plugins"
      const pluginName = isPluginIssue
        ? (issue.input as { details?: PluginDetails } | undefined)?.details?.name
        : undefined

      let friendlyPath = path
      if (pluginName) friendlyPath = `${path ? `${path} ` : ""}(${pluginName})`

      const flatIssues = v.flatten(issue.issues ?? [issue])
      const singleNestedIssue =
        Object.keys(flatIssues.nested ?? {}).length === 1 ? flatIssues.nested?.[path] : undefined
      const filteredIssues = [singleNestedIssue ?? flatIssues.nested, flatIssues.root, flatIssues.other].filter(Boolean)

      const formattedIssues = filteredIssues.map(stringify)
      const issuesMessage = formattedIssues.join("\n")
      friendlyPath = friendlyPath && (issuesMessage.includes("\n") ? `${friendlyPath}:\n` : `${friendlyPath}: `)
      console.warn(`${friendlyPath}${issuesMessage}`)
    }
    process.exit(1)
  }
  const validatedConfig = result.output

  return validatedConfig
}

function stringify(value: unknown) {
  return util.inspect(value, { depth: null, colors: true, maxArrayLength: null, maxStringLength: null })
}

async function sesame(config: BunInfraConfig) {
  if (process.env.SESAME_COMPILED === "TRUE") await main(config)
  else {
    const error = await bootstrap()
    if (error) logger.fatal(fmtError("failed to bootstrap sesame", error))
  }
}

async function bootstrap(): Promise<error> {
  const sesameBinaryPath = `${process.cwd()}/sesame`

  const [result, error] = attempt(() =>
    Bun.spawnSync(
      [
        "bun",
        "build",
        `${process.cwd()}/sesame.ts`,
        "--compile",
        "--target=bun",
        "--minify",
        `--outfile=${sesameBinaryPath}`,
      ],
      {
        stdout: "pipe",
        stderr: "pipe",
      },
    ),
  )
  if (error) return fmtError("failed to compile sesame binary", error)
  if (result.exitCode !== 0) return fmtError("failed to compile sesame binary", result.stderr.toString().trim())

  const [sesameResult, sesameError] = attempt(() =>
    Bun.spawnSync([sesameBinaryPath, ...process.argv.slice(2)], {
      env: { ...Bun.env, SESAME_COMPILED: "TRUE" },
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    }),
  )
  if (sesameError) return fmtError("failed to run sesame binary", sesameError)

  // If the parent process is killed (e.g. via SIGINT), exitCode from the child process will be null since it's immediately killed
  // ^Only relevant if we are capturing/handling the exit signal (which we aren't right now), otherwise this line is never reached anyway
  // We propagate the exit code from the child process if there is one for whatever reason
  if (sesameResult.exitCode) process.exitCode = sesameResult.exitCode

  await rm(`${process.cwd()}/sesame`, { force: true })
}

async function main(sesameConfig: BunInfraConfig) {
  const hosts = process.argv.slice(2)

  if (hosts.length === 0) {
    logger.fatal("No hosts provided")
    process.exit(1)
  }

  const config = getConfig(sesameConfig)

  for (const host of hosts) {
    if (!Object.hasOwn(config, host)) {
      logger.fatal(`Host ${host} not found in config`)
      process.exit(1)
    }
  }

  logger.start(`Running for hosts: ${hosts.join(", ")}`)

  for (const host of hosts) {
    const hostLogger = logger.scope("bun-infra", host)
    process.stdout.write("\n")
    hostLogger.start()

    const result = v.safeParse(HostContextSchema, {
      host,
      user: "",
      arch: process.arch,
      os: process.platform,
      logger: hostLogger,
      sudo: await sudo(host),
    })
    if (!result.success) {
      hostLogger.fatal("Failed to build context for host")
      process.exit(1)
    }
    const context = result.output

    const plugins = config[host]?.plugins as Plugin[] | undefined
    if (!plugins || plugins.length === 0) {
      hostLogger.warn("No plugins found for host")
      continue
    }

    const pluginNames = new Set<string>()
    for (const plugin of plugins) {
      if (pluginNames.has(plugin.details.name)) {
        hostLogger.fatal(`Duplicate plugin name found: ${plugin.details.name}`)
        process.exit(1)
      }
      pluginNames.add(plugin.details.name)
    }

    for (const plugin of plugins) {
      const pluginLogger = hostLogger.scope(host, plugin.details.name)
      context.logger = pluginLogger
      process.stdout.write("\n")
      await handlePlugin(plugin, context)
    }

    hostLogger.success()
  }

  logger.success("Done!")
}

async function updateState(host: string, pluginName: string, state: JsonValue) {
  await db.update((data) => {
    if (!data[host]) data[host] = {}
    data[host][pluginName] = { state }
  })
}

async function handlePlugin(plugin: Plugin, context: HostContext) {
  const { host, logger: pluginLogger } = context

  pluginLogger.start()
  const input = await plugin.input()
  const previous = db.data[host]?.[plugin.details.name]?.state
  const diff = await plugin.diff(context, previous, input)
  if (diff === undefined) {
    pluginLogger.done()
    await updateState(host, plugin.details.name, input)
    return
  }

  if (plugin.details.printDiff) pluginLogger.diff(getDiffString(diff))
  else pluginLogger.diff()
  if (!(await continuep())) return
  await plugin.handle(context, diff, input)
  await updateState(host, plugin.details.name, input)
  pluginLogger.success()
}

function getDiffString(diff: unknown) {
  const diffString = stringify(diff)
  const hasMultipleLines = diffString.includes("\n")
  return (hasMultipleLines ? "\n" : "") + diffString
}

export { sesame }
