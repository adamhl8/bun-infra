import { $ } from "bun"
import type { StatelessPluginFactory } from "../types.ts"

interface InstallFishOptions {
  fishConfigPath: string
}

const installFish: StatelessPluginFactory<InstallFishOptions> = (options) => ({
  name: "Install Fish",
  check: () => !Bun.which("fish"),
  handle: async () => {
    await $`mkdir -p ~/.config/fish/conf.d/`
    await $`ln -f -s ${options.fishConfigPath} ~/.config/fish/`

    await $`brew install fish`
    await $`$HOMEBREW_PREFIX/bin/brew shellenv fish >~/.config/fish/conf.d/homebrew.fish`

    const fishPath = { raw: "$HOMEBREW_PREFIX/bin/fish" }
    await $`echo ${fishPath}`
    try {
      await $`grep -q fish /etc/shells`
      console.info("fish is already in /etc/shells")
    } catch {
      await $`echo ${fishPath} | sudo tee -a /etc/shells >/dev/null`
      console.info(`Added ${fishPath.raw} to /etc/shells`)
    }

    await $`chsh -s ${fishPath}`
    console.info(`Set ${fishPath.raw} as default shell`)
  },
  update: () => {
    return
  },
})

export { installFish }
