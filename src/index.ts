import { highlight } from "cli-highlight"
import figures from "figures"
import signale from "signale"
import { config } from "./config.ts"
import type { HostContext, Plugin, StatefulPlugin, StatelessPlugin } from "./types.ts"
// TODO: plugin dependencies

const logger = new signale.Signale({
  types: {
    start: { label: "start", badge: figures.triangleRight, color: "magenta" },
    statelessDone: { label: "already done", badge: figures.tick, color: "cyan" },
    statefulDone: { label: "no change", badge: figures.tick, color: "cyan" },
    change: { label: "change", badge: figures.triangleUp, color: "magenta" },
  },
})

type Logger = typeof logger

async function main() {
  const hosts = process.argv.slice(2) as (keyof typeof config)[]

  for (const host of hosts) {
    if (!Object.hasOwn(config, host)) {
      logger.fatal(`Host ${host} not found in config`)
      process.exit(1)
    }
  }

  for (const host of hosts) {
    const hostLogger = logger.scope(host)
    hostLogger.start()

    const context: HostContext = {
      host: config[host].host,
      user: "",
      arch: process.arch,
      os: process.platform,
    }

    const plugins = config[host].plugins as Plugin[]

    for (const plugin of plugins) {
      const pluginLogger = hostLogger.scope(plugin.name)
      if (isStatelessPlugin(plugin)) await handleStatelessPlugin(plugin, context, pluginLogger)
      else if (isStatefulPlugin(plugin)) await handleStatefulPlugin(plugin, context, pluginLogger)
    }

    hostLogger.success()
  }
}

async function handleStatelessPlugin(plugin: StatelessPlugin, context: HostContext, pluginLogger: Logger) {
  if (!(await plugin.check(context))) {
    pluginLogger.statelessDone()
    return
  }

  await plugin.handle(context)
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
}

function getChangeString(change: unknown) {
  const jsonString = JSON.stringify(change, null, 2)
  const hasMultipleLines = jsonString.includes("\n")
  return (hasMultipleLines ? "\n" : "") + highlight(jsonString)
}

function isStatelessPlugin(plugin: Plugin): plugin is StatelessPlugin {
  return Object.hasOwn(plugin, "check")
}

function isStatefulPlugin(plugin: Plugin): plugin is StatefulPlugin<unknown, unknown> {
  return Object.hasOwn(plugin, "change")
}

await main()
