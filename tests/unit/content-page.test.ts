import { beforeEach, describe, expect, it } from "vitest"

import {
  getBatchItemFromAnchor,
  getDetailAnchors,
  getSourceAdapterForLocation
} from "../../lib/content-page"

describe("content page helpers", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
  })

  it("detects kisssub list pages and returns source-aware batch items", () => {
    const location = new URL("https://www.kisssub.org/list-test.html")
    document.body.innerHTML = `
      <ul>
        <li><a href="/show-deadbeef.html">Episode 01</a></li>
        <li><a href="/show-feedface.html">Episode 02</a></li>
      </ul>
    `

    const source = getSourceAdapterForLocation(location)

    expect(source?.id).toBe("kisssub")
    expect(
      getDetailAnchors(source!, document, location).map((anchor) =>
        getBatchItemFromAnchor(source!, anchor, location)
      )
    ).toEqual([
      {
        sourceId: "kisssub",
        detailUrl: "https://www.kisssub.org/show-deadbeef.html",
        title: "Episode 01"
      },
      {
        sourceId: "kisssub",
        detailUrl: "https://www.kisssub.org/show-feedface.html",
        title: "Episode 02"
      }
    ])
  })

  it("detects dongmanhuayuan list pages and returns source-aware batch items", () => {
    const location = new URL("https://www.dongmanhuayuan.com/")
    document.body.innerHTML = `
      <table>
        <tbody>
          <tr>
            <td><a href="/detail/7XROA.html">资源一</a></td>
          </tr>
          <tr>
            <td><a href="/detail/69Q29.html">资源二</a></td>
          </tr>
        </tbody>
      </table>
    `

    const source = getSourceAdapterForLocation(location)

    expect(source?.id).toBe("dongmanhuayuan")
    expect(
      getDetailAnchors(source!, document, location).map((anchor) =>
        getBatchItemFromAnchor(source!, anchor, location)
      )
    ).toEqual([
      {
        sourceId: "dongmanhuayuan",
        detailUrl: "https://www.dongmanhuayuan.com/detail/7XROA.html",
        title: "资源一"
      },
      {
        sourceId: "dongmanhuayuan",
        detailUrl: "https://www.dongmanhuayuan.com/detail/69Q29.html",
        title: "资源二"
      }
    ])
  })

  it("detects acg.rip list pages and preserves the pre-resolved torrent link", () => {
    const location = new URL("https://acg.rip/")
    document.body.innerHTML = `
      <table>
        <tbody>
          <tr>
            <td><a href="/user/1917">LoliHouse</a></td>
            <td>
              <a href="/team/12">LoliHouse</a>
              <a href="/t/350361">[LoliHouse] Hell Mode - 11</a>
            </td>
            <td><a href="/t/350361.torrent">下载</a></td>
            <td>542.7 MB</td>
          </tr>
          <tr>
            <td><a href="/user/1106">丸子家族</a></td>
            <td><a href="/t/350360">[丸子家族] 海螺小姐</a></td>
            <td><a href="/t/350360.torrent">下载</a></td>
            <td>313.4 MB</td>
          </tr>
        </tbody>
      </table>
    `

    const source = getSourceAdapterForLocation(location)

    expect(source?.id).toBe("acgrip")
    expect(
      getDetailAnchors(source!, document, location).map((anchor) =>
        getBatchItemFromAnchor(source!, anchor, location)
      )
    ).toEqual([
      {
        sourceId: "acgrip",
        detailUrl: "https://acg.rip/t/350361",
        title: "[LoliHouse] Hell Mode - 11",
        torrentUrl: "https://acg.rip/t/350361.torrent"
      },
      {
        sourceId: "acgrip",
        detailUrl: "https://acg.rip/t/350360",
        title: "[丸子家族] 海螺小姐",
        torrentUrl: "https://acg.rip/t/350360.torrent"
      }
    ])
  })

  it("detects acg.rip series pages and skips team links in the title column", () => {
    const location = new URL("https://acg.rip/series/1170")
    document.body.innerHTML = `
      <table>
        <tbody>
          <tr>
            <td><a href="/user/7218">我为新代盐</a></td>
            <td>
              <a href="/team/189">新Sub</a>
              <a href="/t/287166">[新Sub&萌樱字幕组][满怀美梦的少年是现实主义者][09]</a>
            </td>
            <td><a href="/t/287166.torrent">下载</a></td>
            <td>271.0 MB</td>
          </tr>
        </tbody>
      </table>
    `

    const source = getSourceAdapterForLocation(location)

    expect(source?.id).toBe("acgrip")
    expect(getDetailAnchors(source!, document, location)).toHaveLength(1)
    expect(getBatchItemFromAnchor(source!, getDetailAnchors(source!, document, location)[0]!, location)).toEqual({
      sourceId: "acgrip",
      detailUrl: "https://acg.rip/t/287166",
      title: "[新Sub&萌樱字幕组][满怀美梦的少年是现实主义者][09]",
      torrentUrl: "https://acg.rip/t/287166.torrent"
    })
  })
})
