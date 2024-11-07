import { $ } from "bun"
import type { StatelessPluginFactory } from "../types.ts"
import { runFishCmd } from "./utils/utils.ts"

interface InstallFishOptions {
  fishConfigPath: string
}

async function install(options: InstallFishOptions) {
  await $`mkdir -p ~/.config/fish/conf.d/`
  await $`ln -f -s ${options.fishConfigPath} ~/.config/fish/`

  await $`brew install fish`
  await $`$HOMEBREW_PREFIX/bin/brew shellenv fish >~/.config/fish/conf.d/homebrew.fish`
}

async function setDefaultShell() {
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
}

async function configure() {
  await runFishCmd(
    "curl -sL https://raw.githubusercontent.com/jorgebucaran/fisher/main/functions/fisher.fish | source && fisher install jorgebucaran/fisher",
  )
  await runFishCmd("fisher install IlanCosman/tide")
  await runFishCmd("echo 2 1 2 3 1 1 1 1 1 1 1 y | tide configure >/dev/null")

  await runFishCmd("fisher install daleeidd/natural-selection")
  await runFishCmd("fisher install PatrickF1/fzf.fish")
}

const installFish: StatelessPluginFactory<InstallFishOptions> = (options) => ({
  name: "Install Fish",
  check: () => !Bun.which("fish"),
  handle: async () => {
    await install(options)
    await setDefaultShell()
    await configure()

    if (Bun.which("rye")) {
      await $`rye self completion -s fish >~/.config/fish/completions/rye.fish`
    }
  },
  update: () => {
    return
  },
})

export { installFish }
