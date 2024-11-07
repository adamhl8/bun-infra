import { $ } from "bun"
import type { StatefulPluginFactory } from "../types.ts"

interface BrewFormulaDiff {
  added: string[]
  removed: string[]
}

const brewFormula: StatefulPluginFactory<string[], BrewFormulaDiff> = (desired) => ({
  name: "Brew Formula",
  desired,
  current: async () => {
    return (await $`brew ls --installed-on-request --formula`.quiet()).text().trim().split("\n")
  },
  diff: (_, current, desired) => {
    const currentSet = new Set(current)
    const desiredSet = new Set(desired)

    const added = desired.filter((x) => !currentSet.has(x))
    const removed = current.filter((x) => !desiredSet.has(x))

    if (added.length === 0 && removed.length === 0) return
    return { added, removed }
  },
  handle: async (_, diff) => {
    if (diff.added.length > 0) {
      await $`brew install ${diff.added.join(" ")}`
    }
    if (diff.removed.length > 0) {
      await $`brew uninstall ${diff.removed.join(" ")}`
    }
  },
  update: async () => {
    await $`brew update`
  },
})

export { brewFormula }
