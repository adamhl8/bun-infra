import { $ } from "bun"
import type { StatefulPluginFactory } from "../types.ts"

interface BrewFormulaDiff {
  added: string[]
  removed: string[]
}

const brewFormula: StatefulPluginFactory<string[], BrewFormulaDiff> = (desired) => ({
  name: "Brew Formula",
  current: async () => {
    return (await $`brew ls --installed-on-request --formula`.quiet()).text().trim().split("\n")
  },
  change: (_, current) => {
    const currentSet = new Set(current)
    const desiredSet = new Set(desired)

    const added = desired.filter((x) => !currentSet.has(x))
    const removed = current.filter((x) => !desiredSet.has(x))

    if (added.length === 0 && removed.length === 0) return
    return { added, removed }
  },
  handle: async (_, change) => {
    if (change.added.length > 0) {
      await $`brew install ${change.added.join(" ")}`
    }
    if (change.removed.length > 0) {
      await $`brew uninstall ${change.removed.join(" ")}`
    }
  },
  update: async () => {
    await $`brew update`
  },
})

export { brewFormula }
