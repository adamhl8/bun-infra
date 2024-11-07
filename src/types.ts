interface HostContext {
  host: string
  user: string
  arch: string
  os: string
}

type AsyncOrSync<T> = Promise<T> | T

// added and modified handlers should always handle the case where there is no state
// that is, it should handle any potential errors that may occur when the value already exists
// e.g. say brew throws an error if the package is already installed, we would check if it's installed first in the added handler
// idempotent

interface BasePlugin {
  name: string
  update: (ctx: HostContext) => AsyncOrSync<void>
}

interface StatelessPlugin extends BasePlugin {
  check: (ctx: HostContext) => AsyncOrSync<boolean>
  handle: (ctx: HostContext) => AsyncOrSync<void>
}

interface StatefulPlugin<T, D> extends BasePlugin {
  current: (ctx: HostContext) => AsyncOrSync<T>
  diff: (ctx: HostContext, current: T) => AsyncOrSync<D | undefined>
  handle: (ctx: HostContext, diff: D) => AsyncOrSync<void>
}

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

interface HostConfig {
  host: string
  user?: string
  port?: number
  plugins: Plugin<any, any>[]
}

export type {
  Optional,
  HostConfig,
  HostContext,
  Plugin,
  StatelessPluginFactory,
  StatefulPluginFactory,
  StatelessPlugin,
  StatefulPlugin,
}
