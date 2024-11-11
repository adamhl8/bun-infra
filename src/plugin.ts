import type { JsonValue, Jsonify } from "type-fest"
import * as v from "valibot"
import type { HostContext } from "./types.ts"

type AsyncOrSync<T> = Promise<T> | T

interface PluginDetails {
  name: string
  /** @default true */
  printDiff?: boolean
}

interface PluginHandlers<I extends JsonValue, D> {
  diff: (ctx: HostContext, previous: I | undefined, input: I) => AsyncOrSync<D | undefined>
  handle: (ctx: HostContext, diff: D, input: I) => AsyncOrSync<void>
  update?: (ctx: HostContext) => AsyncOrSync<void>
}

interface Plugin<I extends JsonValue = JsonValue, D = unknown> extends PluginHandlers<I, D> {
  details: PluginDetails
  input: () => AsyncOrSync<I>
}
const PluginSchema = v.strictObject({
  details: v.strictObject({
    name: v.string(),
    printDiff: v.optional(v.boolean()),
  }),
  input: v.function(),
  diff: v.function(),
  handle: v.function(),
  update: v.optional(v.function()),
})

// If createPlugin is provided null for the first type argument, it means that the plugin does not accept an input.
type PluginFactory<I extends JsonValue, D> = I extends null ? () => Plugin<I, D> : (input: I) => Plugin<I, D>

const createPlugin = <Input, Diff>(
  details: PluginDetails,
  handlers: PluginHandlers<Jsonify<Input>, Diff>,
  transform?: (input: Jsonify<Input>) => AsyncOrSync<Jsonify<Input>>,
): PluginFactory<Jsonify<Input>, Diff> =>
  ((input?: Jsonify<Input>) => ({
    details: {
      ...details,
      printDiff: details.printDiff ?? true,
    },
    input: async () => (input ? (transform ? await transform(input) : input) : null),
    ...handlers,
  })) as PluginFactory<Jsonify<Input>, Diff>

export { createPlugin, PluginSchema }
export type { Plugin, PluginDetails, PluginFactory }
