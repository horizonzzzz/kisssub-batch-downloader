import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { chromium, expect, test } from "@playwright/test"

const extensionPath = path.join(process.cwd(), "build", "chrome-mv3-prod")
const localBrowserCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
]
const supportedSiteFixtures = [
  {
    url: "https://www.kisssub.org/list-test.html",
    fixtureName: "kisssub-list.html",
    title: "Kisssub 批量下载"
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

function getLocalBrowserExecutable() {
  return localBrowserCandidates.find((candidate) => fs.existsSync(candidate))
}

async function launchExtensionContext() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "anime-bt-batch-plasmo-"))
  const executablePath = getBundledBrowserExecutable() || getLocalBrowserExecutable()
  const context = await chromium.launchPersistentContext(userDataDir, {
    ...(executablePath ? { executablePath } : { channel: "chromium" as const }),
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
    async close() {
      await context.close()
      fs.rmSync(userDataDir, { recursive: true, force: true })
    }
  }
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
  await expect(popup).toHaveURL(/options\.html#\/general$/)
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
    route?: "/general" | "/sites" | "/filters" | "/history" | "/overview"
    heading?: string
  }
) {
  const route = options?.route ?? ""
  const expectedRoute = options?.route ?? "/general"
  const expectedHeading = options?.heading ?? "连接与基础设置"
  const page = await extension.context.newPage()
  await page.goto(`chrome-extension://${extension.extensionId}/options.html${route ? `#${route}` : ""}`)
  await expect(page).toHaveURL(new RegExp(`options\\.html#${expectedRoute.replace("/", "\\/")}$`))
  await expect(page.getByRole("heading", { name: expectedHeading, exact: true }).first()).toBeVisible()
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
    await page.getByRole("button", { name: "保存所有设置" }).click()

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

    await page.getByRole("button", { name: "保存所有设置" }).click()

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

test("filter builder select controls stay interactable inside the sheet", async () => {
  const extension = await launchExtensionContext()

  try {
    const page = await openOptionsPage(extension, {
      route: "/filters",
      heading: "过滤规则"
    })

    await page.getByRole("button", { name: "新增筛选器" }).click()

    await page.getByLabel("必须条件字段 1").click()
    await page.getByRole("option", { name: "站点" }).click()

    await page.getByLabel("必须条件值 1").click()
    await page.getByRole("option", { name: "Bangumi.moe" }).click()

    await expect(page.getByLabel("必须条件值 1")).toContainText("Bangumi.moe")
    await expect(page.getByText(/必须满足：站点是 Bangumi\.moe/)).toBeVisible()

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

test("content script injects the batch panel on a Kisssub list page", async () => {
  const extension = await launchExtensionContext()

  try {
    await assertBatchPanelInjection(extension, {
      url: "https://www.kisssub.org/list-test.html",
      fixtureName: "kisssub-list.html",
      title: "Kisssub 批量下载"
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
    await optionsPage.getByRole("button", { name: "保存所有设置" }).click()
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
    await reopenOptionsPage.getByRole("button", { name: "保存所有设置" }).click()
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
