import { $ } from "bun"
import type { StatefulPluginFactory } from "../types.ts"

const hostname: StatefulPluginFactory<string, string> = (desired) => ({
  name: "hostname",
  current: async (ctx) => {
    if (ctx.os === "darwin") {
      return (await $`sudo scutil --get LocalHostName`.quiet()).text().trim()
    }
    return ""
  },
  diff: (_, current) => (current === desired ? undefined : desired),
  handle: async (ctx, diff) => {
    if (ctx.os === "darwin") {
      await $`sudo scutil --set HostName ${diff}`
      await $`sudo scutil --set LocalHostName ${diff}`
    }
  },
  update: () => {
    return
  },
})

export { hostname }
