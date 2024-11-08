import * as v from "valibot"
import type { HostContext } from "./types.ts"

type AsyncOrSync<T> = Promise<T> | T

const BasePluginSchema = v.strictObject({
  name: v.string(),
  update: v.optional(v.function()),
})
interface BasePlugin {
  name: string
  update?: (ctx: HostContext) => AsyncOrSync<void>
}

const StatelessPluginSchema = v.strictObject({
  ...BasePluginSchema.entries,
  check: v.function(),
  handle: v.function(),
})
interface StatelessPlugin extends BasePlugin {
  check: (ctx: HostContext) => AsyncOrSync<boolean>
  handle: (ctx: HostContext) => AsyncOrSync<void>
}

const StatefulPluginSchema = v.strictObject({
  ...BasePluginSchema.entries,
  current: v.function(),
  change: v.function(),
  handle: v.function(),
})
interface StatefulPlugin<T, D> extends BasePlugin {
  current: (ctx: HostContext) => AsyncOrSync<T>
  change: (ctx: HostContext, current: T) => AsyncOrSync<D | undefined>
  handle: (ctx: HostContext, change: D) => AsyncOrSync<void>
}

const PluginSchema = v.union([StatelessPluginSchema, StatefulPluginSchema])
type Plugin<T = unknown, D = unknown> = StatelessPlugin | StatefulPlugin<T, D>

interface Optional<T> {
  type: T
}
/*
Case 1: No type argument (T = undefined)
const plugin1: StatelessPluginFactory = () => ({ ... })
plugin1() // ✅ OK

Case 2: Optional argument (T = Options | undefined)
const plugin2: StatelessPluginFactory<Options | undefined> = (options?) => ({ ... })
plugin2() // ✅ OK
plugin2({ some: 'option' }) // ✅ OK

Case 3: Required argument (T = Options)
const plugin3: StatelessPluginFactory<Options> = (options) => ({ ... })
plugin3() // ❌ Error
plugin3({ some: 'option' }) // ✅ OK
*/
type StatelessPluginFactory<T = undefined> = T extends undefined
  ? () => StatelessPlugin
  : T extends Optional<infer U>
    ? (value?: U) => StatelessPlugin
    : (value: T) => StatelessPlugin
type StatefulPluginFactory<T, D> = (desired: T) => StatefulPlugin<T, D>

function isStatelessPlugin(plugin: Plugin): plugin is StatelessPlugin {
  return v.is(StatelessPluginSchema, plugin)
}

function isStatefulPlugin(plugin: Plugin): plugin is StatefulPlugin<unknown, unknown> {
  return v.is(StatefulPluginSchema, plugin)
}

export { PluginSchema, isStatelessPlugin, isStatefulPlugin }
export type { Optional, Plugin, StatelessPluginFactory, StatefulPluginFactory, StatelessPlugin, StatefulPlugin }
