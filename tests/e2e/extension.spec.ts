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
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "kisssub-plasmo-"))
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
  await expect(page.locator("[data-kisssub-batch-checkbox]")).toHaveCount(2)
  await expect(page.getByRole("button", { name: "高级选项" })).toBeVisible()

  await page.getByRole("button", { name: "高级选项" }).click()
  await expect(page.getByLabel("临时下载路径")).toBeVisible()

  await page.getByLabel("临时下载路径").fill("D:/Anime")
  await expect(page.getByLabel("临时下载路径")).toHaveValue("D:/Anime")

  await page.locator("[data-kisssub-batch-checkbox]").first().check()
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
  await expect(popup).toHaveURL(/options\.html/)
}

test("options page saves settings through the background worker", async () => {
  const extension = await launchExtensionContext()

  try {
    const page = await extension.context.newPage()
    await page.goto(`chrome-extension://${extension.extensionId}/options.html`)

    await expect(page.getByRole("heading", { name: "连接与基础设置" })).toBeVisible()
    await expect(page.getByRole("link", { name: "查看 GitHub 仓库" })).toHaveAttribute(
      "href",
      "https://github.com/horizonzzzz/anime-bt-batch-downloader"
    )
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const sidebarGroups = document.querySelector(".options-sidebar__groups")

          if (!sidebarGroups) {
            return null
          }

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
