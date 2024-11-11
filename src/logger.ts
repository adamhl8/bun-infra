import figures from "figures"
import signale from "signale"

const logger = new signale.Signale({
  scope: "bun-infra",
  types: {
    start: { label: "start", badge: figures.triangleRight, color: "magenta" },
    done: { label: "no diff", badge: figures.tick, color: "cyan" },
    diff: { label: "diff", badge: figures.triangleUp, color: "yellow" },
  },
})

type Logger = typeof logger

export { logger }
export type { Logger }
