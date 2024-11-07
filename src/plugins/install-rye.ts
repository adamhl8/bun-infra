import { $ } from "bun"
import type { Optional, StatelessPluginFactory } from "../types.ts"

interface InstallRyeOptions {
  pythonVersion?: string
}

const installRye: StatelessPluginFactory<Optional<InstallRyeOptions>> = (options) => ({
  name: "Install Rye",
  check: () => !Bun.which("rye"),
  handle: async () => {
    const pythonVersion = options?.pythonVersion ?? "3.12"
    await $`RYE_TOOLCHAIN_VERSION="${pythonVersion}" RYE_INSTALL_OPTION="--yes" /bin/bash -c "$(curl -fsSL https://rye.astral.sh/get)"`
    await $`export PATH="$HOME/.rye/shims:$PATH"`
    await $`rye config --set-bool behavior.global-python=true`
    await $`rye config --set default.toolchain=${pythonVersion}`
    await $`rye toolchain fetch ${pythonVersion}`
  },
  update: () => {
    return
  },
})

export { installRye }
