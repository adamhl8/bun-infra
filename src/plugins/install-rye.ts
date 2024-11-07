import { $ } from "bun"
import type { StatelessPluginFactory } from "../types.ts"

interface InstallRyeOptions {
  pythonVersion: string
}

const installRye: StatelessPluginFactory<InstallRyeOptions> = (options) => ({
  name: "Install Rye",
  value: options,
  check: () => !Bun.which("rye"),
  handle: async (_, options) => {
    const pythonVersion = options?.pythonVersion ?? "3.12"
    await $`RYE_TOOLCHAIN_VERSION="${pythonVersion}" RYE_INSTALL_OPTION="--yes" /bin/bash -c "$(curl -fsSL https://rye.astral.sh/get)"`
    await $`export PATH="$HOME/.rye/shims:$PATH"`
    await $`rye config --set-bool behavior.global-python=true`
    await $`rye config --set default.toolchain=${pythonVersion}`
    await $`rye toolchain fetch ${pythonVersion}`
  },
})

export { installRye }
