import * as v from "valibot"
import type { Logger } from "./logger.ts"
import { type Plugin, PluginSchema } from "./plugin.ts"

const HostContextSchema = v.strictObject({
  host: v.string(),
  user: v.string(),
  arch: v.string(),
  os: v.string(),
  logger: v.custom<Logger>(() => true),
})
type HostContext = v.InferOutput<typeof HostContextSchema>

// added and modified handlers should always handle the case where there is no state
// that is, it should handle any potential errors that may occur when the value already exists
// e.g. say brew throws an error if the package is already installed, we would check if it's installed first in the added handler
// idempotent

const HostConfigSchema = v.strictObject({
  host: v.string(),
  user: v.optional(v.string()),
  port: v.optional(v.number()),
  plugins: v.array(PluginSchema),
})
// PluginSchema doesn't properly type the plugin functions, so we can't just infer the type for HostConfig
type BaseHostConfig = v.InferOutput<typeof HostConfigSchema>
type HostConfigWithoutPlugins = Omit<BaseHostConfig, "plugins">
type HostConfig = HostConfigWithoutPlugins & {
  plugins: Plugin<any, any>[]
}

const BunInfraSchema = v.record(v.string(), HostConfigSchema)
type BunInfraConfig = Record<string, HostConfig>

export { BunInfraSchema, HostContextSchema }
export type { HostContext, BunInfraConfig }
