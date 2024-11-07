import { $ } from "bun"

async function runFishCmd(cmd: string) {
  await $`fish -l -c ${cmd}`
}

export { runFishCmd }
