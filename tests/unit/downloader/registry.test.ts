import { describe, expect, it } from "vitest"

import { SUPPORTED_DOWNLOADERS, getDownloaderAdapter, getDownloaderMeta } from "../../../src/lib/downloader"

describe("downloader registry", () => {
  it("registers both qBittorrent and Transmission in the supported downloader registry", () => {
    const qbAdapter = getDownloaderAdapter("qbittorrent")
    const qbMeta = getDownloaderMeta("qbittorrent")
    const transmissionAdapter = getDownloaderAdapter("transmission")
    const transmissionMeta = getDownloaderMeta("transmission")

    expect(qbAdapter.id).toBe("qbittorrent")
    expect(qbAdapter.displayName).toBe("qBittorrent")
    expect(qbMeta).toEqual({
      id: "qbittorrent",
      displayName: "qBittorrent"
    })

    expect(transmissionAdapter.id).toBe("transmission")
    expect(transmissionAdapter.displayName).toBe("Transmission")
    expect(transmissionMeta).toEqual({
      id: "transmission",
      displayName: "Transmission"
    })

    expect(SUPPORTED_DOWNLOADERS).toEqual([qbMeta, transmissionMeta])
  })
})
