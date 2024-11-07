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

interface StatelessPlugin<T> extends BasePlugin {
  value?: T
  check: (ctx: HostContext, value: T) => AsyncOrSync<boolean>
  handle: (ctx: HostContext, value: T) => AsyncOrSync<void>
}

interface StatefulPlugin<T, D> extends BasePlugin {
  desired: T
  current: (ctx: HostContext) => AsyncOrSync<T>
  diff: (ctx: HostContext, current: T, desired: T) => AsyncOrSync<D | undefined>
  handle: (ctx: HostContext, diff: D) => AsyncOrSync<void>
}

type Plugin<T = unknown, D = unknown> = StatelessPlugin<T> | StatefulPlugin<T, D>

type StatelessPluginFactory<T = undefined> = (value?: T) => StatelessPlugin<T | undefined>
type StatefulPluginFactory<T, D> = (desired: T) => StatefulPlugin<T, D>

interface HostConfig {
  host: string
  user?: string
  port?: number
  plugins: Plugin<any, any>[]
}

export type {
  HostConfig,
  HostContext,
  Plugin,
  StatelessPluginFactory,
  StatefulPluginFactory,
  StatelessPlugin,
  StatefulPlugin,
}
