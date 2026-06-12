import { describe, expect, it } from "vitest"
import { getProviderHeadersWithOverride } from "../headers"

describe("provider headers", () => {
  it("uses user headers as a full override without merging defaults", () => {
    expect(getProviderHeadersWithOverride("openai", { "X-Test": "1" })).toEqual({
      "X-Test": "1",
    })
  })

  it("treats an explicit empty object as a user override that disables defaults", () => {
    expect(getProviderHeadersWithOverride("openai", {})).toBeUndefined()
  })

  it("filters empty and non-string header values", () => {
    expect(getProviderHeadersWithOverride("openai", {
      "X-Empty": "",
      "X-Count": 1,
      "X-Test": "1",
    })).toEqual({
      "X-Test": "1",
    })
  })
})
