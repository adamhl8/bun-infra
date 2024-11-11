import { describe, expect, test } from "bun:test"
import os from "node:os"
import { resolvePath } from "../lib.ts"

describe("resolvePath", () => {
  const homeDir = os.homedir()
  const cwd = process.cwd()

  test("resolves tilde", async () => {
    expect(await resolvePath("~")).toBe(homeDir)
  })

  test("resolves non-existent paths", async () => {
    expect(await resolvePath("~/foo")).toBe(`${homeDir}/foo`)
  })

  test("resolves relative paths", async () => {
    expect(await resolvePath(".")).toBe(cwd)
    expect(await resolvePath("~/foo/..")).toBe(homeDir)
    expect(await resolvePath("~/foo/../bar")).toBe(`${homeDir}/bar`)
  })

  test("resolves environment variables", async () => {
    expect(await resolvePath("$HOME")).toBe(homeDir)
  })

  test("handles spaces", async () => {
    expect(await resolvePath("~/path with spaces")).toBe(`${homeDir}/path with spaces`)
  })

  test("all", async () => {
    expect(await resolvePath("~/foo/../bar/$HOME/path with spaces")).toBe(`${homeDir}/bar${homeDir}/path with spaces`)
  })
})
