import { $ } from "bun"
import type { StatelessPluginFactory } from "../types.ts"

const installFish: StatelessPluginFactory = () => ({
  name: "Install Fish",
  check: () => !Bun.which("fish"),
  handle: async () => {
    await $`mkdir -p ~/.config/fish/conf.d/`
    await $`ln -f -s {paths.configs.fish_config} ~/.config/fish/`
  },
})

export { installFish }
