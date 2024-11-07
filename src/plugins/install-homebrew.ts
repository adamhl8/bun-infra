import { $ } from "bun"
import type { StatelessPluginFactory } from "../types.ts"

const installHomebrew: StatelessPluginFactory = () => ({
  name: "Install Homebrew",
  check: () => !Bun.which("brew"),
  handle: async () => {
    await $`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
  },
  update: () => {
    return
  },
})

export { installHomebrew }
