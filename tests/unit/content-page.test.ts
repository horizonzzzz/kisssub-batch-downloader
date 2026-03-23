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
})
