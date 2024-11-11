/* eslint-disable @typescript-eslint/consistent-indexed-object-style */
import path from "node:path"
import { JSONFilePreset } from "lowdb/node"
import type { JsonValue } from "type-fest"

interface State {
  [host: string]: {
    [plugin: string]: {
      state: JsonValue
    }
  }
}

const defaultData: State = {}
const db = await JSONFilePreset<State>(path.join(process.cwd(), "bun-infra.state.json"), defaultData)

export { db }
