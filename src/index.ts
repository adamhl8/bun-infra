import { config } from "./config.ts"
import type { HostContext, Plugin, StatefulPlugin, StatelessPlugin } from "./types.ts"

// TODO: plugin dependencies

async function main() {
  const hosts = process.argv.slice(2) as (keyof typeof config)[]

  for (const host of hosts) {
    if (!Object.hasOwn(config, host)) {
      throw new Error(`Host ${host} not found in config`)
    }
  }

  for (const host of hosts) {
    console.info(`=== ${host} ===`)

    const context: HostContext = {
      host: config[host].host,
      user: "",
      arch: process.arch,
      os: process.platform,
    }

    const plugins = config[host].plugins as Plugin[]

    for (const plugin of plugins) {
      console.info(`Running "${plugin.name}"`)

      if (isStatelessPlugin(plugin)) {
        if (!(await plugin.check(context))) continue
        await plugin.handle(context)
      }

      if (isStatefulPlugin(plugin)) {
        const current = await plugin.current(context)
        const diff = await plugin.diff(context, current)
        if (diff === undefined) {
          console.info("No changes needed")
          continue
        }

        console.info("Changes needed:", diff)
        await plugin.handle(context, diff)
      }
    }
  }
}

function isStatelessPlugin(plugin: Plugin): plugin is StatelessPlugin {
  return Object.hasOwn(plugin, "check")
}

function isStatefulPlugin(plugin: Plugin): plugin is StatefulPlugin<unknown, unknown> {
  return Object.hasOwn(plugin, "diff")
}

await main()
