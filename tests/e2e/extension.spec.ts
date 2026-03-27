import fs from "node:fs"
import os from "node:os"
import path from "node:path"

import { chromium, expect, test } from "@playwright/test"

const extensionPath = path.join(process.cwd(), "build", "chrome-mv3-prod")
const localBrowserCandidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
]

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
    const label = (host as HTMLElement).shadowRoot?.querySelector<HTMLElement>("label")
    if (!label) {
      throw new Error("Injected checkbox label was not found inside the shadow root.")
    }

    label.click()
  })
}

async function openOptionsPage(
  extension: Awaited<ReturnType<typeof launchExtensionContext>>,
  options?: {
    route?: "/general" | "/sites" | "/overview"
    heading?: string
  }
) {
  const route = options?.route ?? ""
  const expectedRoute = options?.route ?? "/general"
  const expectedHeading = options?.heading ?? "连接与基础设置"
  const page = await extension.context.newPage()
  await page.goto(`chrome-extension://${extension.extensionId}/options.html${route ? `#${route}` : ""}`)
  await expect(page).toHaveURL(new RegExp(`options\\.html#${expectedRoute.replace("/", "\\/")}$`))
  await expect(page.getByRole("heading", { name: expectedHeading })).toBeVisible()
  return page
}

test("options page saves settings through the background worker", async () => {
  const extension = await launchExtensionContext()

  try {
    const page = await openOptionsPage(extension)
    await expect(page.getByRole("link", { name: "查看 GitHub 仓库" })).toHaveAttribute(
      "href",
      "https://github.com/horizonzzzz/anime-bt-batch-downloader"
    )
    await expect
      .poll(async () => {
        return page.getByTestId("options-sidebar-groups").evaluate((sidebarGroups) => {
          const computed = window.getComputedStyle(sidebarGroups)

          return {
            display: computed.display,
            flexDirection: computed.flexDirection
          }
        })
      })
      .toEqual({
        display: "flex",
        flexDirection: "column"
      })

    await page.getByLabel("qBittorrent WebUI 地址").fill("http://127.0.0.1:17474")
    await page.getByLabel("用户名").fill("admin")
    await page.getByRole("button", { name: "保存所有设置" }).click()

    await expect(page.getByText("设置已保存。")).toBeVisible()
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
