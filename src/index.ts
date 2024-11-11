#!/usr/bin/env bun
import util from "node:util"
import type { JsonValue } from "type-fest"
import * as v from "valibot"
import { db } from "./db.ts"
import { logger } from "./logger.ts"
import type { Plugin, PluginDetails } from "./plugin.ts"
import { BunInfraSchema, type HostContext, HostContextSchema } from "./types.ts"

// TODO: plugin dependencies

async function getConfig() {
  const configPath = `${process.cwd()}/bun-infra.config.ts`
  const configImport = (await import(configPath)) as { default: unknown }
  const result = v.safeParse(BunInfraSchema, configImport.default)
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
  const config = result.output

  return config
}

function stringify(value: unknown) {
  return util.inspect(value, { depth: null, colors: true, maxArrayLength: null, maxStringLength: null })
}

async function main() {
  const hosts = process.argv.slice(2)

  if (hosts.length === 0) {
    logger.fatal("No hosts provided")
    process.exit(1)
  }

  const config = await getConfig()

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
    })
    if (!result.success) {
      hostLogger.fatal("Failed to build context for host")
      process.exit(1)
    }
    const context = result.output

    const plugins = config[host]?.plugins
    if (!plugins || plugins.length === 0) {
      hostLogger.warn("No plugins found for host")
      continue
    }

    for (const plugin of plugins as Plugin[]) {
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
  await plugin.handle(context, diff, input)
  await updateState(host, plugin.details.name, input)
  pluginLogger.success()
}

function getDiffString(diff: unknown) {
  const diffString = stringify(diff)
  const hasMultipleLines = diffString.includes("\n")
  return (hasMultipleLines ? "\n" : "") + diffString
}

await main()
