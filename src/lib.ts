import { $ } from "bun"
import untildify from "untildify"
import type { Logger } from "./logger.ts"

async function resolvePath(path: string) {
  const untildified = untildify(path)
  const rawPath = { raw: untildified }
  return (await $`realpath --canonicalize-missing --no-symlinks "${rawPath}"`.quiet().text()).trim()
}

function getAddedRemovedDiff(input: string[], current: string[]) {
  const currentSet = new Set(current)
  const desiredSet = new Set(input)

  const added = input.filter(Boolean).filter((x) => !currentSet.has(x))
  const removed = current.filter(Boolean).filter((x) => !desiredSet.has(x))
  if (added.length === 0 && removed.length === 0) return
  return { added, removed }
}

const EX_TEMPFAIL = 75

function requestRestart(logger: Logger, message: string) {
  logger.warn(message)
  process.exit(EX_TEMPFAIL)
}

export { resolvePath, getAddedRemovedDiff, requestRestart }
