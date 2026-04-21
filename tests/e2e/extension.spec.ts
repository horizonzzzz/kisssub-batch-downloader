import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { chromium, expect, test } from "@playwright/test"

const extensionPath = path.join(process.cwd(), "build", "chrome-mv3-prod")
const supportedSiteFixtures = [
  {
    url: "https://www.kisssub.org/list-test.html",
    fixtureName: "kisssub-list.html",
    title: "Kisssub 爱恋动漫 批量下载"
  },
  {
    url: "https://www.dongmanhuayuan.com/",
    fixtureName: "dongmanhuayuan-list.html",
    title: "动漫花园 批量下载"
  },
  {
    url: "https://acg.rip/",
    fixtureName: "acgrip-list.html",
    title: "ACG.RIP 批量下载"
  },
  {
    url: "https://bangumi.moe/",
    fixtureName: "bangumimoe-list.html",
    title: "Bangumi.moe 批量下载"
  }
] as const

function getBundledBrowserExecutable() {
  const executablePath = chromium.executablePath()
  return executablePath && fs.existsSync(executablePath) ? executablePath : null
}

function getExtensionTestBrowserExecutable() {
  const executablePath = getBundledBrowserExecutable()

  if (executablePath) {
    return executablePath
  }

  throw new Error(
    [
      "Playwright Chromium is required for extension E2E tests, but the bundled browser executable is missing.",
      "Run `pnpm exec playwright install chromium` and retry."
    ].join(" ")
  )
}

async function launchExtensionContext() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "anime-bt-batch-wxt-"))
  const executablePath = getExtensionTestBrowserExecutable()
  const context = await chromium.launchPersistentContext(userDataDir, {
    executablePath,
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  })

  let serviceWorker = context.serviceWorkers()[0]
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker")
  }

  const extensionId = new URL(serviceWorker.url()).host

  return {
    context,
    extensionId,
    serviceWorker,
    async close() {
      await context.close()
      fs.rmSync(userDataDir, { recursive: true, force: true })
    }
  }
}

async function mockDownloaderPermissions(
  extension: Awaited<ReturnType<typeof launchExtensionContext>>
) {
  await extension.context.addInitScript(() => {
    const runtimeBrowser = (globalThis as typeof globalThis & {
      browser?: typeof chrome
      chrome?: typeof chrome
    }).browser ?? (globalThis as typeof globalThis & { chrome?: typeof chrome }).chrome

    if (!runtimeBrowser) {
      return
    }

    ;(globalThis as typeof globalThis & { browser?: typeof chrome }).browser = {
      ...runtimeBrowser,
      permissions: {
        ...runtimeBrowser.permissions,
        contains: async () => true,
        request: async () => true
      }
    }
  })

  await extension.serviceWorker.evaluate(() => {
    const runtimeBrowser = (globalThis as typeof globalThis & {
      browser?: typeof chrome
      chrome?: typeof chrome
    }).browser ?? (globalThis as typeof globalThis & { chrome?: typeof chrome }).chrome

    if (!runtimeBrowser) {
      return
    }

    ;(globalThis as typeof globalThis & { browser?: typeof chrome }).browser = {
      ...runtimeBrowser,
      permissions: {
        ...runtimeBrowser.permissions,
        contains: async () => true,
        request: async () => true
      }
    }
  })
}

async function mockSubscriptionHitDownloadRuntime(
  extension: Awaited<ReturnType<typeof launchExtensionContext>>
) {
  await extension.context.addInitScript(() => {
    const subscriptionDbVersion = 20
    const runtimeBrowser = (globalThis as typeof globalThis & {
      browser?: typeof chrome
      chrome?: typeof chrome
    }).browser ?? (globalThis as typeof globalThis & { chrome?: typeof chrome }).chrome

    if (!runtimeBrowser?.runtime?.sendMessage) {
      return
    }

    const originalSendMessage = runtimeBrowser.runtime.sendMessage.bind(runtimeBrowser.runtime)

    ;(globalThis as typeof globalThis & { browser?: typeof chrome }).browser = {
      ...runtimeBrowser,
      runtime: {
        ...runtimeBrowser.runtime,
        sendMessage: async (message: unknown) => {
          if (
            typeof message !== "object" ||
            message === null ||
            (message as { type?: unknown }).type !== "DOWNLOAD_SUBSCRIPTION_HITS"
          ) {
            return originalSendMessage(message as Parameters<typeof originalSendMessage>[0])
          }

          const hitIds = Array.isArray((message as { hitIds?: unknown }).hitIds)
            ? ((message as { hitIds: string[] }).hitIds)
            : []
          const now = new Date().toISOString()

          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open("anime-bt-subscription-state", subscriptionDbVersion)
            request.onerror = () => reject(request.error)
            request.onsuccess = () => resolve(request.result)
          })

          const hits = await Promise.all(
            hitIds.map(
              (hitId) =>
                new Promise<any>((resolve, reject) => {
                  const tx = db.transaction(["subscriptionHits"], "readonly")
                  const request = tx.objectStore("subscriptionHits").get(hitId)
                  request.onerror = () => reject(request.error)
                  request.onsuccess = () => resolve(request.result)
                })
            )
          )

          await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(["subscriptionHits"], "readwrite")
            const store = tx.objectStore("subscriptionHits")

            for (const hit of hits.filter(Boolean)) {
              store.put({
                ...hit,
                readAt: hit.readAt ?? now,
                downloadStatus: "submitted",
                downloadedAt: now,
                resolvedAt: now
              })
            }

            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error)
            tx.onabort = () => reject(tx.error)
          })

          db.close()

          return {
            ok: true,
            result: {
              attemptedHits: hitIds.length,
              submittedHits: hitIds.length,
              duplicateHits: 0,
              failedHits: 0
            }
          }
        }
      }
    }
  })
}

async function assertBatchPanelInjection(
  extension: Awaited<ReturnType<typeof launchExtensionContext>>,
  options: {
    url: string
    fixtureName: string
    title: string
  }
) {
  const fixturePath = path.join(process.cwd(), "tests", "e2e", "fixtures", options.fixtureName)

  await extension.context.route(options.url, async (route) => {
    await route.fulfill({
      path: fixturePath,
      contentType: "text/html"
    })
  })

  const page = await extension.context.newPage()
  await page.goto(options.url)

  await expect(page.getByText(options.title)).toBeVisible()
  await expect(page.locator("[data-anime-bt-batch-panel-root]")).toHaveCount(1)
  await expect(page.locator("[data-anime-bt-batch-checkbox-root]")).toHaveCount(2)
  await expect
    .poll(async () => {
      return page.locator("[data-anime-bt-batch-panel-root]").evaluate((host) => {
        return Boolean((host as HTMLElement).shadowRoot)
      })
    })
    .toBe(true)
  await expect
    .poll(async () => {
      return page.locator("[data-anime-bt-batch-checkbox-root]").first().evaluate((host) => {
        return Boolean((host as HTMLElement).shadowRoot)
      })
    })
    .toBe(true)
  await expect.poll(() => countInjectedCheckboxes(page)).toBe(2)
  await expect(page.getByRole("button", { name: "高级选项" })).toBeVisible()

  await page.getByRole("button", { name: "高级选项" }).click()
  await expect(page.getByLabel("临时下载路径")).toBeVisible()

  await page.getByLabel("临时下载路径").fill("D:/Anime")
  await expect(page.getByLabel("临时下载路径")).toHaveValue("D:/Anime")

  await clickInjectedCheckbox(page, 0)
  await expect(page.getByText("已选 1 项，可直接发起批量下载。")).toBeVisible()
  await expect(page.getByRole("button", { name: "批量下载", exact: true })).toBeEnabled()

  await page.getByRole("button", { name: "最小化批量下载面板" }).click()
  await expect(page.getByRole("button", { name: "展开批量下载面板" })).toBeVisible()
  await expect(page.getByLabel("当前已选 1 项")).toBeVisible()

  await page.getByRole("button", { name: "展开批量下载面板" }).click()
  await expect(page.getByText(options.title)).toBeVisible()

  const popupPromise = extension.context.waitForEvent("page")

  await page.getByRole("button", { name: "打开设置页" }).click()

  const popup = await popupPromise
  await expect(popup).toHaveURL(/options\.html#\/filters$/)
}

async function countInjectedCheckboxes(page: import("@playwright/test").Page) {
  return page.locator("[data-anime-bt-batch-checkbox-root]").evaluateAll((hosts) => {
    return hosts.reduce((count, host) => {
      return (
        count +
        ((host as HTMLElement).shadowRoot?.querySelectorAll("[data-anime-bt-batch-checkbox]")
          .length ?? 0)
      )
    }, 0)
  })
}

async function clickInjectedCheckbox(page: import("@playwright/test").Page, index: number) {
  await page.locator("[data-anime-bt-batch-checkbox-root]").nth(index).evaluate((host) => {
    const label = (host as HTMLElement).shadowRoot?.querySelector<HTMLElement>(
      '[data-anime-bt-role="selection-pill"]'
    )
    if (!label) {
      throw new Error("Injected checkbox label was not found inside the shadow root.")
    }

    label.click()
  })
}

async function getInjectedStyleSignature(page: import("@playwright/test").Page) {
  const panel = await page.locator("[data-anime-bt-batch-panel-root]").evaluate((host) => {
    const shadowRoot = (host as HTMLElement).shadowRoot
    const surface = shadowRoot?.querySelector<HTMLElement>('[data-anime-bt-role="panel-shell"]')
    const advancedToggle = shadowRoot?.querySelector<HTMLElement>(
      '[data-anime-bt-role="advanced-toggle"]'
    )
    const footerButton = shadowRoot?.querySelector<HTMLElement>('[data-anime-bt-role="select-all"]')
    const downloadButton = shadowRoot?.querySelector<HTMLElement>(
      '[data-anime-bt-role="footer-primary"]'
    )

    if (!surface || !advancedToggle || !footerButton || !downloadButton) {
      throw new Error("Panel style signature target is missing inside the shadow root.")
    }

    const surfaceStyle = getComputedStyle(surface)
    const toggleStyle = getComputedStyle(advancedToggle)
    const footerButtonStyle = getComputedStyle(footerButton)
    const downloadButtonStyle = getComputedStyle(downloadButton)

    return {
      surfaceWidth: surfaceStyle.width,
      surfaceBorderRadius: surfaceStyle.borderRadius,
      togglePaddingTop: toggleStyle.paddingTop,
      togglePaddingInline: `${toggleStyle.paddingLeft}/${toggleStyle.paddingRight}`,
      footerButtonHeight: footerButtonStyle.height,
      footerButtonRadius: footerButtonStyle.borderRadius,
      downloadButtonHeight: downloadButtonStyle.height,
      downloadButtonRadius: downloadButtonStyle.borderRadius
    }
  })

  const checkbox = await page.locator("[data-anime-bt-batch-checkbox-root]").first().evaluate((host) => {
    const shadowRoot = (host as HTMLElement).shadowRoot
    const label = shadowRoot?.querySelector<HTMLElement>('[data-anime-bt-role="selection-pill"]')
    const input = shadowRoot?.querySelector<HTMLInputElement>('[data-anime-bt-role="selection-input"]')
    const dot = shadowRoot?.querySelector<HTMLElement>('[data-anime-bt-role="selection-dot"]')

    if (!label || !input || !dot) {
      throw new Error("Checkbox style signature target is missing inside the shadow root.")
    }

    const labelStyle = getComputedStyle(label)
    const inputStyle = getComputedStyle(input)
    const dotStyle = getComputedStyle(dot)

    return {
      checkboxDisplay: labelStyle.display,
      checkboxMinHeight: labelStyle.minHeight,
      checkboxPaddingInline: `${labelStyle.paddingLeft}/${labelStyle.paddingRight}`,
      checkboxRadius: labelStyle.borderRadius,
      inputSize: `${inputStyle.width}/${inputStyle.height}`,
      dotSize: `${dotStyle.width}/${dotStyle.height}`
    }
  })

  return {
    ...panel,
    ...checkbox
  }
}

async function openOptionsPage(
  extension: Awaited<ReturnType<typeof launchExtensionContext>>,
  options?: {
    route?: "/general" | "/sites" | "/filters" | "/subscriptions" | "/history" | "/overview"
    heading?: string
  }
) {
  const route = options?.route ?? ""
  const expectedRoute = options?.route ?? "/general"
  const expectedHeading = options?.heading ?? "下载器与基础设置"
  const page = await extension.context.newPage()
  await page.goto(`chrome-extension://${extension.extensionId}/options.html${route ? `#${route}` : ""}`)
  await expect(page).toHaveURL(new RegExp(`options\\.html#${expectedRoute.replace("/", "\\/")}$`))
  await expect(page.getByRole("heading", { name: expectedHeading, exact: true }).first()).toBeVisible()

  if (expectedRoute === "/general" || expectedRoute === "/sites" || expectedRoute === "/filters") {
    await expect(page.getByRole("status")).toContainText("设置已加载。")
  }

  return page
}

async function routeSupportedSiteFixtures(
  extension: Awaited<ReturnType<typeof launchExtensionContext>>
) {
  for (const site of supportedSiteFixtures) {
    const fixturePath = path.join(process.cwd(), "tests", "e2e", "fixtures", site.fixtureName)

    await extension.context.route(site.url, async (route) => {
      await route.fulfill({
        path: fixturePath,
        contentType: "text/html"
      })
    })
  }
}

async function readLauncherHoverState(page: import("@playwright/test").Page) {
  return page.getByRole("button", { name: "展开批量下载面板" }).evaluate((button) => {
    const style = getComputedStyle(button)
    const rect = button.getBoundingClientRect()

    return {
      transform: style.transform,
      translate: style.translate,
      scale: style.scale,
      boxShadow: style.boxShadow,
      hovered: button.matches(":hover"),
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      }
    }
  })
}

test("options page saves settings through the background worker", async () => {
  const extension = await launchExtensionContext()

  try {
    const page = await openOptionsPage(extension)
    await expect(page.getByRole("link", { name: "查看 GitHub 仓库" })).toHaveAttribute(
      "href",
      "https://github.com/horizonzzzz/anime-bt-batch-downloader"
    )

    await page.getByLabel("qBittorrent WebUI 地址").fill("http://127.0.0.1:17474")
    await page.getByLabel("用户名").fill("admin")
    await page.getByRole("button", { name: "保存基础设置" }).click()

    await expect(page.getByText("设置已保存。")).toBeVisible()
  } finally {
    await extension.close()
  }
})

test("options page persists simplified filter edits after saving settings", async () => {
  const extension = await launchExtensionContext()

  try {
    const page = await openOptionsPage(extension, {
      route: "/filters",
      heading: "过滤规则"
    })

    await expect(page.getByRole("heading", { name: "筛选器", exact: true })).toBeVisible()

    await page.getByRole("button", { name: "新增筛选器" }).click()
    await page.getByLabel("筛选器名称").fill("爱恋 1080 简繁")
    await page.getByLabel("必须条件字段 1").click()
    await page.getByRole("option", { name: "字幕组" }).click()
    await page.getByLabel("必须条件值 1").fill("爱恋字幕社")
    await page.getByRole("button", { name: "添加必须条件" }).click()
    await page.getByLabel("必须条件值 2").fill("1080")
    await page.getByRole("button", { name: "添加任一条件" }).click()
    await page.getByLabel("任一条件值 1").fill("简")
    await page.getByRole("button", { name: "保存筛选器" }).click()

    await expect(page.getByRole("heading", { name: "爱恋 1080 简繁", exact: true })).toBeVisible()

    await page.getByRole("button", { name: "保存筛选器配置" }).click()

    await expect(page.getByText("设置已保存。")).toBeVisible()

    const reopenedPage = await openOptionsPage(extension, {
      route: "/filters",
      heading: "过滤规则"
    })

    await expect(
      reopenedPage.getByRole("heading", { name: "爱恋 1080 简繁", exact: true })
    ).toBeVisible()

    await reopenedPage
      .getByLabel("资源标题")
      .fill("[爱恋字幕社][1月新番][金牌得主 第二季][Medalist][08][1080p][MP4][GB][简中]")
    await reopenedPage.getByRole("button", { name: "开始测试" }).click()

    await expect(
      reopenedPage.getByText("命中筛选器「爱恋 1080 简繁」，该资源会被保留。")
    ).toBeVisible()

    await reopenedPage.close()
  } finally {
    await extension.close()
  }
})

test("filters page shows the simplified list and quick-test layout", async () => {
  const extension = await launchExtensionContext()

  try {
    const page = await openOptionsPage(extension, {
      route: "/filters",
      heading: "过滤规则"
    })

    await page.setViewportSize({
      width: 1000,
      height: 1200
    })

    await expect(page.getByRole("button", { name: "新增筛选器" })).toBeVisible()
    await expect(page.getByTestId("filters-list")).toBeVisible()
    await expect(page.getByText("快速测试")).toBeVisible()
    await expect(page.getByText("还没有筛选器")).toBeVisible()

    await page.setViewportSize({
      width: 1400,
      height: 1200
    })

    await expect(page.getByText("推荐一条筛选器对应一个真实场景")).toBeVisible()
    await expect(page.getByText("输入资源标题，确认当前筛选器会不会保留它。")).toBeVisible()

    await page.close()
  } finally {
    await extension.close()
  }
})

test("filter builder site tags stay interactable inside the sheet", async () => {
  const extension = await launchExtensionContext()

  try {
    const page = await openOptionsPage(extension, {
      route: "/filters",
      heading: "过滤规则"
    })

    await page.getByRole("button", { name: "新增筛选器" }).click()

    await page.getByTestId("filter-source-tag-kisssub").click()
    await page.getByTestId("filter-source-tag-dongmanhuayuan").click()
    await page.getByTestId("filter-source-tag-acgrip").click()

    await expect(page.getByTestId("filter-source-tag-bangumimoe")).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByText("已选 1 个站点")).toBeVisible()
    await expect(page.getByText(/适用站点：Bangumi\.moe/)).toBeVisible()

    await page.close()
  } finally {
    await extension.close()
  }
})

test("filter builder prioritizes width for the condition value input", async () => {
  const extension = await launchExtensionContext()

  try {
    const page = await openOptionsPage(extension, {
      route: "/filters",
      heading: "过滤规则"
    })

    await page.setViewportSize({
      width: 1400,
      height: 1200
    })

    await page.getByRole("button", { name: "新增筛选器" }).click()

    const fieldWidth = await page.getByLabel("必须条件字段 1").evaluate((element) =>
      Math.round(element.getBoundingClientRect().width)
    )
    const valueWidth = await page.getByLabel("必须条件值 1").evaluate((element) =>
      Math.round(element.getBoundingClientRect().width)
    )

    expect(valueWidth).toBeGreaterThan(fieldWidth)

    await page.close()
  } finally {
    await extension.close()
  }
})

test("subscriptions page refreshes from background Dexie mutations without reloading", async () => {
  const extension = await launchExtensionContext()

  try {
    const page = await openOptionsPage(extension, {
      route: "/subscriptions",
      heading: "订阅"
    })

    await page.getByRole("button", { name: "新增订阅" }).first().click()
    await expect(page.getByRole("dialog", { name: "新增订阅" })).toBeVisible()
    await page.getByLabel("订阅名称").fill("Medalist")
    await page.getByLabel("标题关键词").fill("Medalist")
    await page.getByRole("button", { name: "保存订阅" }).click()

    const createdCard = page.getByTestId(/subscription-card-/).filter({
      has: page.getByRole("heading", { name: "Medalist", exact: true })
    })
    await expect(createdCard).toHaveCount(1)

    await createdCard.getByRole("button", { name: "编辑" }).click()
    await expect(page.getByRole("dialog", { name: "编辑订阅" })).toBeVisible()
    await page.getByLabel("订阅名称").fill("Medalist S2")
    await page.getByRole("button", { name: "保存订阅" }).click()

    const updatedCard = page.getByTestId(/subscription-card-/).filter({
      has: page.getByRole("heading", { name: "Medalist S2", exact: true })
    })
    await expect(updatedCard).toHaveCount(1)

    await updatedCard.getByRole("button", { name: "删除" }).click()
    await expect(page.getByText("确定删除订阅“Medalist S2”吗？")).toBeVisible()
    await page.getByRole("button", { name: "删除" }).last().click()

    await expect(page.getByRole("heading", { name: "Medalist S2", exact: true })).toHaveCount(0)
    await expect(page.getByText("还没有订阅规则")).toBeVisible()

    await page.close()
  } finally {
    await extension.close()
  }
})

test("content script injects the batch panel on a Kisssub list page", async () => {
  const extension = await launchExtensionContext()

  try {
    await assertBatchPanelInjection(extension, {
      url: "https://www.kisssub.org/list-test.html",
      fixtureName: "kisssub-list.html",
      title: "Kisssub 爱恋动漫 批量下载"
    })
  } finally {
    await extension.close()
  }
})

test("content script keeps injected control metrics consistent across supported sites", async () => {
  const extension = await launchExtensionContext()

  try {
    await routeSupportedSiteFixtures(extension)

    const signatures: Array<Record<string, string>> = []

    for (const site of supportedSiteFixtures) {
      const page = await extension.context.newPage()
      await page.goto(site.url)

      await expect(page.getByText(site.title)).toBeVisible()
      await expect.poll(() => countInjectedCheckboxes(page)).toBe(2)
      signatures.push(await getInjectedStyleSignature(page))
      await page.close()
    }

    expect(signatures).toHaveLength(4)
    expect(signatures[0]).toEqual(signatures[1])
    expect(signatures[0]).toEqual(signatures[2])
    expect(signatures[0]).toEqual(signatures[3])
    expect(signatures[0]).toMatchObject({
      surfaceWidth: "336px",
      footerButtonRadius: "14px",
      downloadButtonRadius: "14px",
      checkboxDisplay: "inline-flex",
      checkboxMinHeight: "24px",
      inputSize: "13px/13px",
      dotSize: "6px/6px"
    })
  } finally {
    await extension.close()
  }
})

test("content script keeps the minimized launcher hover transform consistent across supported sites", async () => {
  const extension = await launchExtensionContext()

  try {
    await routeSupportedSiteFixtures(extension)

    for (const site of supportedSiteFixtures) {
      const page = await extension.context.newPage()
      await page.goto(site.url)

      await expect(page.getByText(site.title)).toBeVisible()
      await page.getByRole("button", { name: "最小化批量下载面板" }).click()

      const launcher = page.getByRole("button", { name: "展开批量下载面板" })
      await expect(launcher).toBeVisible()

      const beforeHover = await readLauncherHoverState(page)
      expect(beforeHover.hovered).toBe(false)

      await launcher.hover()

      await expect
        .poll(async () => {
          const state = await readLauncherHoverState(page)
          const changedVisuals =
            state.boxShadow !== beforeHover.boxShadow ||
            state.transform !== beforeHover.transform ||
            state.translate !== beforeHover.translate ||
            state.scale !== beforeHover.scale ||
            state.rect.x !== beforeHover.rect.x ||
            state.rect.y !== beforeHover.rect.y ||
            state.rect.width !== beforeHover.rect.width ||
            state.rect.height !== beforeHover.rect.height

          return {
            ...state,
            changedVisuals
          }
        })
        .toMatchObject({
          hovered: true,
          changedVisuals: true
        })

      const afterHover = await readLauncherHoverState(page)
      expect(
        afterHover.boxShadow !== beforeHover.boxShadow ||
          afterHover.transform !== beforeHover.transform ||
          afterHover.translate !== beforeHover.translate ||
          afterHover.scale !== beforeHover.scale
      ).toBe(true)
      expect(
        afterHover.rect.x !== beforeHover.rect.x ||
          afterHover.rect.y !== beforeHover.rect.y ||
          afterHover.rect.width !== beforeHover.rect.width ||
          afterHover.rect.height !== beforeHover.rect.height
      ).toBe(true)

      await page.close()
    }
  } finally {
    await extension.close()
  }
})

test("content script injects the batch panel on a Dongmanhuayuan list page", async () => {
  const extension = await launchExtensionContext()

  try {
    await assertBatchPanelInjection(extension, {
      url: "https://www.dongmanhuayuan.com/",
      fixtureName: "dongmanhuayuan-list.html",
      title: "动漫花园 批量下载"
    })
  } finally {
    await extension.close()
  }
})

test("content script injects the batch panel on an ACG.RIP list page", async () => {
  const extension = await launchExtensionContext()

  try {
    await assertBatchPanelInjection(extension, {
      url: "https://acg.rip/",
      fixtureName: "acgrip-list.html",
      title: "ACG.RIP 批量下载"
    })
  } finally {
    await extension.close()
  }
})

test("content script injects the batch panel on a Bangumi.moe list page", async () => {
  const extension = await launchExtensionContext()

  try {
    await assertBatchPanelInjection(extension, {
      url: "https://bangumi.moe/",
      fixtureName: "bangumimoe-list.html",
      title: "Bangumi.moe 批量下载"
    })
  } finally {
    await extension.close()
  }
})

test("clicking the Bangumi.moe batch checkbox does not trigger the host detail dialog", async () => {
  const extension = await launchExtensionContext()

  try {
    const fixturePath = path.join(process.cwd(), "tests", "e2e", "fixtures", "bangumimoe-list.html")

    await extension.context.route("https://bangumi.moe/", async (route) => {
      await route.fulfill({
        path: fixturePath,
        contentType: "text/html"
      })
    })

    const page = await extension.context.newPage()
    await page.goto("https://bangumi.moe/")

    await expect(page.getByText("Bangumi.moe 批量下载")).toBeVisible()
    await expect.poll(() => countInjectedCheckboxes(page)).toBe(2)

    await clickInjectedCheckbox(page, 0)

    await expect(page.getByRole("dialog", { name: "Bangumi.moe 站内详情" })).toBeHidden()
    await expect(page.getByText("已选 1 项，可直接发起批量下载。")).toBeVisible()

    await page.getByText("[LoliHouse] Episode 01").click()
    await expect(page.getByRole("dialog", { name: "Bangumi.moe 站内详情" })).toBeVisible()

    await page.getByRole("button", { name: "关闭详情浮层" }).click()
    await expect(page.getByRole("dialog", { name: "Bangumi.moe 站内详情" })).toBeHidden()
  } finally {
    await extension.close()
  }
})

test("content script keeps watching a Bangumi.moe search page until results appear", async () => {
  const extension = await launchExtensionContext()

  try {
    const fixturePath = path.join(
      process.cwd(),
      "tests",
      "e2e",
      "fixtures",
      "bangumimoe-search-list.html"
    )

    await extension.context.route("https://bangumi.moe/search/index", async (route) => {
      await route.fulfill({
        path: fixturePath,
        contentType: "text/html"
      })
    })

    const page = await extension.context.newPage()
    await page.goto("https://bangumi.moe/search/index")

    await expect(page.getByText("Bangumi.moe 批量下载")).toBeVisible()
    await expect.poll(() => countInjectedCheckboxes(page), {
      timeout: 5000
    }).toBe(2)
  } finally {
    await extension.close()
  }
})

test("disabling a source stops injection until it is enabled again", async () => {
  const extension = await launchExtensionContext()

  try {
    const fixturePath = path.join(process.cwd(), "tests", "e2e", "fixtures", "acgrip-list.html")

    await extension.context.route("https://acg.rip/", async (route) => {
      await route.fulfill({
        path: fixturePath,
        contentType: "text/html"
      })
    })

    const optionsPage = await openOptionsPage(extension, {
      route: "/sites",
      heading: "站点配置"
    })

    const acgripSwitch = optionsPage.getByRole("switch", { name: "ACG.RIP 启用开关" })
    await expect(acgripSwitch).toHaveAttribute("aria-checked", "true")
    await acgripSwitch.click()
    await expect(acgripSwitch).toHaveAttribute("aria-checked", "false")
    await optionsPage.getByRole("button", { name: "保存站点配置" }).click()
    await expect(optionsPage.getByText("设置已保存。")).toBeVisible()

    const disabledPage = await extension.context.newPage()
    await disabledPage.goto("https://acg.rip/")
    await expect.poll(() => countInjectedCheckboxes(disabledPage)).toBe(0)
    await expect(disabledPage.getByText("ACG.RIP 批量下载")).toHaveCount(0)

    const reopenOptionsPage = await openOptionsPage(extension, {
      route: "/sites",
      heading: "站点配置"
    })

    const reenabledSwitch = reopenOptionsPage.getByRole("switch", { name: "ACG.RIP 启用开关" })
    await expect(reenabledSwitch).toHaveAttribute("aria-checked", "false")
    await reenabledSwitch.click()
    await expect(reenabledSwitch).toHaveAttribute("aria-checked", "true")
    await reopenOptionsPage.getByRole("button", { name: "保存站点配置" }).click()
    await expect(reopenOptionsPage.getByText("设置已保存。")).toBeVisible()

    const reenabledPage = await extension.context.newPage()
    await reenabledPage.goto("https://acg.rip/")
    await expect(reenabledPage.getByText("ACG.RIP 批量下载")).toBeVisible()
    await expect.poll(() => countInjectedCheckboxes(reenabledPage)).toBe(2)
  } finally {
    await extension.close()
  }
})

test("history page shows empty state when no records exist", async () => {
  const extension = await launchExtensionContext()

  try {
    const page = await openOptionsPage(extension, {
      route: "/history",
      heading: "批次历史"
    })

    await expect(page.getByText("暂无下载历史记录")).toBeVisible()
    await expect(page.getByText("开始批量下载后，历史记录将在此显示")).toBeVisible()
    await expect(page.getByRole("button", { name: "清空历史" })).toBeDisabled()
  } finally {
    await extension.close()
  }
})

async function seedSubscriptionHitsWorkbench(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    const subscriptionDbVersion = 20
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("anime-bt-subscription-state", subscriptionDbVersion)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      request.onupgradeneeded = () => {
        const upgradeDb = request.result

        if (!upgradeDb.objectStoreNames.contains("subscriptions")) {
          const store = upgradeDb.createObjectStore("subscriptions", { keyPath: "id" })
          store.createIndex("enabled", "enabled", { unique: false })
          store.createIndex("sourceIds", "sourceIds", { unique: false, multiEntry: true })
          store.createIndex("createdAt", "createdAt", { unique: false })
        }

        if (!upgradeDb.objectStoreNames.contains("subscriptionRuntime")) {
          const store = upgradeDb.createObjectStore("subscriptionRuntime", { keyPath: "subscriptionId" })
          store.createIndex("lastScanAt", "lastScanAt", { unique: false })
          store.createIndex("lastMatchedAt", "lastMatchedAt", { unique: false })
        }

        if (!upgradeDb.objectStoreNames.contains("notificationRounds")) {
          const store = upgradeDb.createObjectStore("notificationRounds", { keyPath: "id" })
          store.createIndex("createdAt", "createdAt", { unique: false })
        }

        if (!upgradeDb.objectStoreNames.contains("subscriptionMeta")) {
          upgradeDb.createObjectStore("subscriptionMeta", { keyPath: "key" })
        }

        if (!upgradeDb.objectStoreNames.contains("subscriptionHits")) {
          const store = upgradeDb.createObjectStore("subscriptionHits", { keyPath: "id" })
          store.createIndex("subscriptionId", "subscriptionId", { unique: false })
          store.createIndex("sourceId", "sourceId", { unique: false })
          store.createIndex("discoveredAt", "discoveredAt", { unique: false })
          store.createIndex("downloadStatus", "downloadStatus", { unique: false })
          store.createIndex("readAt", "readAt", { unique: false })
        }
      }
    })

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        ["subscriptions", "subscriptionHits", "subscriptionRuntime", "notificationRounds", "subscriptionMeta"],
        "readwrite"
      )

      tx.objectStore("subscriptions").put({
        id: "sub-1",
        name: "Medalist",
        enabled: true,
        sourceIds: ["acgrip"],
        multiSiteModeEnabled: false,
        titleQuery: "Medalist",
        subgroupQuery: "",
        advanced: { must: [], any: [] },
        createdAt: "2026-04-21T08:00:00.000Z",
        baselineCreatedAt: "2026-04-21T08:00:00.000Z"
      })

      tx.objectStore("subscriptionHits").put({
        id: "hit-1",
        subscriptionId: "sub-1",
        sourceId: "acgrip",
        title: "[LoliHouse] Medalist - 01 [1080p]",
        normalizedTitle: "[lolihouse] medalist - 01 [1080p]",
        subgroup: "LoliHouse",
        detailUrl: "https://acg.rip/t/100",
        magnetUrl: "magnet:?xt=urn:btih:AAA111",
        torrentUrl: "",
        discoveredAt: "2026-04-21T09:30:00.000Z",
        downloadedAt: null,
        downloadStatus: "idle",
        readAt: null,
        resolvedAt: null
      })

      tx.objectStore("notificationRounds").put({
        id: "subscription-round:20260421093000000",
        createdAt: "2026-04-21T09:30:00.000Z",
        hits: [
          {
            id: "hit-1",
            subscriptionId: "sub-1",
            sourceId: "acgrip",
            title: "[LoliHouse] Medalist - 01 [1080p]",
            normalizedTitle: "[lolihouse] medalist - 01 [1080p]",
            subgroup: "LoliHouse",
            detailUrl: "https://acg.rip/t/100",
            magnetUrl: "magnet:?xt=urn:btih:AAA111",
            torrentUrl: "",
            discoveredAt: "2026-04-21T09:30:00.000Z",
            downloadedAt: null,
            downloadStatus: "idle",
            readAt: null,
            resolvedAt: null
          }
        ]
      })

      tx.objectStore("subscriptionRuntime").put({
        subscriptionId: "sub-1",
        lastScanAt: "2026-04-21T09:30:00.000Z",
        lastMatchedAt: "2026-04-21T09:30:00.000Z",
        lastError: "",
        seenFingerprints: ["fp-hit-1"],
        recentHits: [
          {
            id: "hit-1",
            subscriptionId: "sub-1",
            sourceId: "acgrip",
            title: "[LoliHouse] Medalist - 01 [1080p]",
            normalizedTitle: "[lolihouse] medalist - 01 [1080p]",
            subgroup: "LoliHouse",
            detailUrl: "https://acg.rip/t/100",
            magnetUrl: "magnet:?xt=urn:btih:AAA111",
            torrentUrl: "",
            discoveredAt: "2026-04-21T09:30:00.000Z",
            downloadedAt: null,
            downloadStatus: "idle",
            readAt: null,
            resolvedAt: null
          }
        ]
      })

      tx.objectStore("subscriptionMeta").put({
        key: "lastSchedulerRunAt",
        lastSchedulerRunAt: "2026-04-21T09:30:00.000Z",
        value: "2026-04-21T09:30:00.000Z"
      })

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })

    db.close()
  })
}

async function mockQbWebUiApi(
  extension: Awaited<ReturnType<typeof launchExtensionContext>>
) {
  const injectMockFetch = () => {
    const originalFetch = globalThis.fetch.bind(globalThis)
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url

      if (url === "http://127.0.0.1:17474/api/v2/auth/login") {
        return new Response("Ok.", {
          status: 200,
          headers: {
            "Content-Type": "text/plain"
          }
        })
      }

      if (url === "http://127.0.0.1:17474/api/v2/torrents/add") {
        return new Response("", {
          status: 200,
          headers: {
            "Content-Type": "text/plain"
          }
        })
      }

      if (url === "http://127.0.0.1:17474/api/v2/app/version") {
        return new Response("5.0.0", {
          status: 200,
          headers: {
            "Content-Type": "text/plain"
          }
        })
      }

      return originalFetch(input, init)
    }
  }

  await extension.context.addInitScript(injectMockFetch)
  await extension.serviceWorker.evaluate(injectMockFetch)
}

async function openSubscriptionHitsWorkbench(
  extension: Awaited<ReturnType<typeof launchExtensionContext>>,
  options?: {
    roundId?: string
  }
) {
  const route = options?.roundId
    ? `/subscription-hits?round=${encodeURIComponent(options.roundId)}`
    : "/subscription-hits"
  const page = await extension.context.newPage()
  await page.goto(`chrome-extension://${extension.extensionId}/options.html#${route}`)
  await expect(page).toHaveURL(/options\.html#\/subscription-hits/)
  await expect(page.getByTestId("subscription-hits-workbench")).toBeVisible()
  return page
}

test("subscription hits workbench renders with seeded data", async () => {
  const extension = await launchExtensionContext()

  try {
    const seedPage = await extension.context.newPage()
    await seedPage.goto(`chrome-extension://${extension.extensionId}/options.html`)
    await seedSubscriptionHitsWorkbench(seedPage)
    await seedPage.close()

    const workbenchPage = await openSubscriptionHitsWorkbench(extension)

    await expect(workbenchPage.getByTestId("subscription-hits-workbench")).toBeVisible()

    await expect(workbenchPage.getByTestId("subscription-hit-group-sub-1")).toBeVisible()

    await expect(workbenchPage.getByTestId("subscription-hit-row-hit-1")).toBeVisible()
    await expect(workbenchPage.getByText("[LoliHouse] Medalist - 01 [1080p]")).toBeVisible()

    await expect(workbenchPage.getByTestId("hit-status-hit-1")).toBeVisible()

    const checkbox = workbenchPage.locator(`[data-testid="subscription-hit-row-hit-1"] input[type="checkbox"]`)
    await expect(checkbox).toBeVisible()
    await expect(checkbox).not.toBeChecked()

    await workbenchPage.close()
  } finally {
    await extension.close()
  }
})

test("subscription hits workbench shows highlighted state when round parameter is present", async () => {
  const extension = await launchExtensionContext()

  try {
    const seedPage = await extension.context.newPage()
    await seedPage.goto(`chrome-extension://${extension.extensionId}/options.html`)
    await seedSubscriptionHitsWorkbench(seedPage)
    await seedPage.close()

    const workbenchPage = await openSubscriptionHitsWorkbench(extension, {
      roundId: "subscription-round:20260421093000000"
    })

    await expect(workbenchPage.getByTestId("subscription-hits-workbench")).toBeVisible()

    const hitRow = workbenchPage.getByTestId("subscription-hit-row-hit-1")

    await expect(hitRow).toBeVisible()

    const hasHighlightedClass = await hitRow.evaluate((el) => {
      return el.classList.contains("bg-yellow-50") && el.classList.contains("border-l-4")
    })
    expect(hasHighlightedClass).toBe(true)

    await expect
      .poll(async () => {
        return workbenchPage.evaluate(async () => {
          const subscriptionDbVersion = 20
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open("anime-bt-subscription-state", subscriptionDbVersion)
            request.onerror = () => reject(request.error)
            request.onsuccess = () => resolve(request.result)
          })

          const result = await new Promise<string | null>((resolve, reject) => {
            const tx = db.transaction(["subscriptionHits"], "readonly")
            const request = tx.objectStore("subscriptionHits").get("hit-1")
            request.onerror = () => reject(request.error)
            request.onsuccess = () => resolve(request.result?.readAt ?? null)
          })

          db.close()
          return result
        })
      })
      .not.toBeNull()

    await workbenchPage.close()
  } finally {
    await extension.close()
  }
})

test("manual download updates hit status in subscription hits workbench", async () => {
  const extension = await launchExtensionContext()

  try {
    await mockSubscriptionHitDownloadRuntime(extension)

    const seedPage = await extension.context.newPage()
    await seedPage.goto(`chrome-extension://${extension.extensionId}/options.html`)
    await seedSubscriptionHitsWorkbench(seedPage)
    await seedPage.close()

    const workbenchPage = await openSubscriptionHitsWorkbench(extension)

    await expect(workbenchPage.getByTestId("subscription-hits-workbench")).toBeVisible()
    await expect(workbenchPage.getByTestId("subscription-hit-row-hit-1")).toBeVisible()

    const checkbox = workbenchPage.locator(`[data-testid="subscription-hit-row-hit-1"] input[type="checkbox"]`)
    await checkbox.check()
    await expect(checkbox).toBeChecked()

    await workbenchPage.getByRole("button", { name: "下载选中项" }).click()
    await workbenchPage.reload()

    await expect(workbenchPage.getByTestId("hit-status-hit-1")).toContainText("已提交")

    await workbenchPage.close()
  } finally {
    await extension.close()
  }
})
