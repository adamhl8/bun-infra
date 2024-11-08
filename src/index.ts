#!/usr/bin/env bun
import { highlight } from "cli-highlight"
import figures from "figures"
import signale from "signale"
import * as v from "valibot"
import {
  type Plugin,
  type StatefulPlugin,
  type StatelessPlugin,
  isStatefulPlugin,
  isStatelessPlugin,
} from "./plugin.ts"
import { BunInfraSchema, type HostContext, HostContextSchema } from "./types.ts"
// TODO: plugin dependencies
// TODO: better output for invalid config/plugin

const logger = new signale.Signale({
  scope: "bun-infra",
  types: {
    start: { label: "start", badge: figures.triangleRight, color: "magenta" },
    statelessDone: { label: "already done", badge: figures.tick, color: "cyan" },
    statefulDone: { label: "no change", badge: figures.tick, color: "cyan" },
    change: { label: "change", badge: figures.triangleUp, color: "yellow" },
  },
})

type Logger = typeof logger

async function getConfig() {
  const configPath = `${process.cwd()}/bun-infra.config.ts`
  const configImport = (await import(configPath)) as { default: unknown }
  const result = v.safeParse(BunInfraSchema, configImport.default)
  if (!result.success) {
    logger.fatal("Invalid config")
    process.exit(1)
  }
  const config = result.output

  return config
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
      host: config[host]?.host,
      user: "",
      arch: process.arch,
      os: process.platform,
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
      const pluginLogger = hostLogger.scope(host, plugin.name)
      process.stdout.write("\n")
      pluginLogger.start()

      if (isStatelessPlugin(plugin)) await handleStatelessPlugin(plugin, context, pluginLogger)
      else if (isStatefulPlugin(plugin)) await handleStatefulPlugin(plugin, context, pluginLogger)
    }

    hostLogger.success()
  }

  logger.success("Done!")
}

async function handleStatelessPlugin(plugin: StatelessPlugin, context: HostContext, pluginLogger: Logger) {
  if (!(await plugin.check(context))) {
    pluginLogger.statelessDone()
    return
  }

  await plugin.handle(context)
  pluginLogger.success()
}

async function handleStatefulPlugin(
  plugin: StatefulPlugin<unknown, unknown>,
  context: HostContext,
  pluginLogger: Logger,
) {
  const current = await plugin.current(context)
  const change = await plugin.change(context, current)
  if (change === undefined) {
    pluginLogger.statefulDone()
    return
  }

  pluginLogger.change(getChangeString(change))
  await plugin.handle(context, change)
  pluginLogger.success()
}

function getChangeString(change: unknown) {
  const jsonString = JSON.stringify(change, null, 2)
  const hasMultipleLines = jsonString.includes("\n")
  return (hasMultipleLines ? "\n" : "") + highlight(jsonString)
}

await main()
