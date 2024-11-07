import { brewFormula } from "./plugins/brew-formula.ts"
import { hostname } from "./plugins/hostname.ts"
import { installHomebrew } from "./plugins/install-homebrew.ts"
import { installRye } from "./plugins/install-rye.ts"
import type { HostConfig } from "./types.ts"

const brewFormulaList = [
  "age",
  "bash",
  "bat",
  "bun",
  "caddy",
  "coreutils",
  "curl",
  "delve",
  "diffutils",
  "dua-cli",
  "eza",
  "fclones",
  "fd",
  "ffmpeg",
  "findutils",
  "fish",
  "fzf",
  "gawk",
  "git",
  "git-delta",
  "gnu-sed",
  "gnu-tar",
  "go",
  "grep",
  "gzip",
  "jq",
  "just",
  "ko",
  "mas",
  "micro",
  "sops",
  "unzip",
  "wget",
  "xq",
  "yq",
  "zip",
]

const config = {
  sid: {
    host: "sid.lan",
    user: "adam",
    port: 22,
    plugins: [
      // packages(["curl", "git"]),
    ],
  },
  macbook: {
    host: "localhost",
    plugins: [hostname("adam-macbook"), installHomebrew(), brewFormula(brewFormulaList), installRye()],
  },
} satisfies Record<string, HostConfig>

export { config }
