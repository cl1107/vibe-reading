// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  resolveContentScriptAssetBlobMock,
  shouldProxyAssetUrlMock,
  createImageBitmapMock,
  clearRectMock,
  drawImageMock,
  setTransformMock,
} = vi.hoisted(() => ({
  resolveContentScriptAssetBlobMock: vi.fn(),
  shouldProxyAssetUrlMock: vi.fn(),
  createImageBitmapMock: vi.fn(),
  clearRectMock: vi.fn(),
  drawImageMock: vi.fn(),
  setTransformMock: vi.fn(),
}))

vi.mock("@/utils/content-script/background-asset-url", () => ({
  resolveContentScriptAssetBlob: resolveContentScriptAssetBlobMock,
  shouldProxyAssetUrl: shouldProxyAssetUrlMock,
}))

describe("provider icon", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubGlobal("createImageBitmap", createImageBitmapMock)
    Object.defineProperty(globalThis, "devicePixelRatio", {
      configurable: true,
      value: 1,
    })
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: vi.fn(() => ({
        clearRect: clearRectMock,
        drawImage: drawImageMock,
        setTransform: setTransformMock,
      })),
    })
  })

  it("renders a normal image when the logo does not need proxying", async () => {
    shouldProxyAssetUrlMock.mockReturnValue(false)
    const { default: ProviderIcon } = await import("../provider-icon")

    render(<ProviderIcon logo="https://cdn.example.com/logo.webp" name="OpenAI" size="md" />)

    expect(screen.getByRole("img", { name: "OpenAI" })).toHaveAttribute("src", "https://cdn.example.com/logo.webp")
    expect(resolveContentScriptAssetBlobMock).not.toHaveBeenCalled()
  })

  it("normalizes local extension asset paths before rendering", async () => {
    shouldProxyAssetUrlMock.mockReturnValue(false)
    const { default: ProviderIcon } = await import("../provider-icon")

    render(<ProviderIcon logo="/assets/providers/custom-provider.svg" name="Custom Provider" size="md" />)

    const image = screen.getByRole("img", { name: "Custom Provider" })
    expect(image.getAttribute("src")).not.toBe("/assets/providers/custom-provider.svg")
    expect(image.getAttribute("src")).toMatch(/assets\/providers\/custom-provider\.svg$/)
  })

  it("renders proxied logos through a canvas instead of an img tag", async () => {
    const bitmap = {
      width: 32,
      height: 16,
      close: vi.fn(),
    }

    shouldProxyAssetUrlMock.mockReturnValue(true)
    resolveContentScriptAssetBlobMock.mockResolvedValue(new Blob([Uint8Array.from([1, 2, 3])], { type: "image/webp" }))
    createImageBitmapMock.mockResolvedValue(bitmap)
    const { default: ProviderIcon } = await import("../provider-icon")

    const view = render(<ProviderIcon logo="https://cdn.example.com/logo.webp" name="OpenAI" size="md" />)

    await waitFor(() => {
      expect(resolveContentScriptAssetBlobMock).toHaveBeenCalledWith("https://cdn.example.com/logo.webp")
    })
    await waitFor(() => {
      expect(drawImageMock).toHaveBeenCalledWith(bitmap, 0, 5, 20, 10)
    })

    expect(view.container.querySelector("canvas")).toBeInTheDocument()
    expect(view.container.querySelector("img")).not.toBeInTheDocument()
    expect(screen.getByRole("img", { name: "OpenAI" }).tagName).toBe("CANVAS")

    view.unmount()
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })
})
