import { describe, expect, it, vi } from "vitest"

import {
  fetchTorrentForUpload,
  getTorrentFilename
} from "../../../lib/background/torrent-file"

describe("background torrent-file helpers", () => {
  it("prefers the filename from content-disposition", () => {
    expect(
      getTorrentFilename(
        "https://acg.rip/t/350361.torrent",
        "attachment; filename*=UTF-8''Episode%2001.torrent"
      )
    ).toBe("Episode 01.torrent")
  })

  it("falls back to the URL pathname when the response header is missing", () => {
    expect(getTorrentFilename("https://acg.rip/files/episode-01.torrent", null)).toBe(
      "episode-01.torrent"
    )
  })

  it("falls back to a generic filename when the url cannot be parsed", () => {
    expect(getTorrentFilename("not-a-valid-url", null)).toBe("download.torrent")
  })

  it("downloads torrent files for upload and keeps the derived filename", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("torrent-data", {
        status: 200,
        headers: {
          "content-disposition": 'attachment; filename="episode-02.torrent"'
        }
      })
    )

    await expect(
      fetchTorrentForUpload("https://acg.rip/t/350362.torrent", fetchImpl)
    ).resolves.toMatchObject({
      filename: "episode-02.torrent"
    })
  })

  it("throws when the torrent download fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("", {
        status: 403
      })
    )

    await expect(
      fetchTorrentForUpload("https://acg.rip/t/350362.torrent", fetchImpl)
    ).rejects.toThrow("Torrent download failed with HTTP 403.")
  })
})
