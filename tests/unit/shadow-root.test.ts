import { beforeEach, describe, expect, it, vi } from "vitest"

describe("shadow-root helpers", () => {
  beforeEach(() => {
    vi.resetModules()
    document.head.innerHTML = ""
    document.body.innerHTML = ""
  })

  it("does not expose the legacy document stylesheet readback helper", async () => {
    const shadowRootModule = await import("../../lib/content/shadow-root")

    expect("getDocumentStylesheetText" in shadowRootModule).toBe(false)
  })

  it("creates a shadow host with dataset and inserts its container before the requested marker", async () => {
    const { createShadowMountHost } = await import("../../lib/content/shadow-root")

    const marker = document.createElement("div")
    marker.dataset.marker = "after-host"
    document.body.appendChild(marker)

    const mount = createShadowMountHost({
      hostTagName: "span",
      containerTagName: "section",
      dataset: {
        animeBtBatchCheckboxRoot: "1"
      },
      parent: document.body,
      before: marker
    })

    expect(document.body.firstElementChild).toBe(mount.host)
    expect(mount.host.dataset.animeBtBatchCheckboxRoot).toBe("1")
    expect(mount.shadowRoot).toBe(mount.host.shadowRoot)
    expect(mount.container.tagName).toBe("SECTION")
    expect(mount.shadowRoot.contains(mount.container)).toBe(true)
  })

  it("reuses the same fallback style tag when styles are injected repeatedly", async () => {
    const { createShadowMountHost, ensureShadowStyle } = await import("../../lib/content/shadow-root")

    const mount = createShadowMountHost({
      hostTagName: "div",
      dataset: {
        animeBtBatchPanelRoot: "1"
      },
      parent: document.body
    })

    const firstStyle = ensureShadowStyle(
      mount.shadowRoot,
      "content-ui",
      ".anime-bt-content-root { color: rgb(37, 99, 235); }"
    )
    const secondStyle = ensureShadowStyle(
      mount.shadowRoot,
      "content-ui",
      ".anime-bt-content-root { color: rgb(37, 99, 235); }"
    )

    expect(firstStyle).toBe(secondStyle)
    expect(
      mount.shadowRoot.querySelectorAll("[data-anime-bt-batch-shadow-style='content-ui']")
    ).toHaveLength(1)
  })
})
