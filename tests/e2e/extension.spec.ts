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

test("options page saves settings through the background worker", async () => {
  const extension = await launchExtensionContext()

  try {
    const page = await extension.context.newPage()
    await page.goto(`chrome-extension://${extension.extensionId}/options.html`)

    await expect(page.getByRole("heading", { name: "设置" })).toBeVisible()

    await page.getByLabel("qBittorrent WebUI 地址").fill("http://127.0.0.1:17474")
    await page.getByLabel("用户名").fill("admin")
    await page.getByRole("button", { name: "保存设置" }).click()

    await expect(page.getByText("设置已保存。")).toBeVisible()
  } finally {
    await extension.close()
  }
})

test("content script injects the batch panel on a Kisssub list page", async () => {
  const extension = await launchExtensionContext()

  try {
    const fixturePath = path.join(process.cwd(), "tests", "e2e", "fixtures", "kisssub-list.html")

    await extension.context.route("https://www.kisssub.org/list-test.html", async (route) => {
      await route.fulfill({
        path: fixturePath,
        contentType: "text/html"
      })
    })

    const page = await extension.context.newPage()
    const popupPromise = extension.context.waitForEvent("page")

    await page.goto("https://www.kisssub.org/list-test.html")

    await expect(page.getByText("Kisssub 批量下载")).toBeVisible()
    await expect(page.locator("[data-kisssub-batch-checkbox]")).toHaveCount(2)
    await expect(page.getByLabel("下载路径")).toBeVisible()

    await page.locator("[data-kisssub-batch-checkbox]").first().check()
    await expect(page.getByText("已选 1 项")).toBeVisible()

    await page.getByRole("button", { name: "设置" }).click()

    const popup = await popupPromise
    await expect(popup).toHaveURL(/options\.html/)
  } finally {
    await extension.close()
  }
})

test("content script injects the batch panel on a Dongmanhuayuan list page", async () => {
  const extension = await launchExtensionContext()

  try {
    const fixturePath = path.join(process.cwd(), "tests", "e2e", "fixtures", "dongmanhuayuan-list.html")

    await extension.context.route("https://www.dongmanhuayuan.com/", async (route) => {
      await route.fulfill({
        path: fixturePath,
        contentType: "text/html"
      })
    })

    const page = await extension.context.newPage()
    const popupPromise = extension.context.waitForEvent("page")

    await page.goto("https://www.dongmanhuayuan.com/")

    await expect(page.getByText("动漫花园 批量下载")).toBeVisible()
    await expect(page.locator("[data-kisssub-batch-checkbox]")).toHaveCount(2)
    await expect(page.getByLabel("下载路径")).toBeVisible()

    await page.locator("[data-kisssub-batch-checkbox]").first().check()
    await expect(page.getByText("已选 1 项")).toBeVisible()

    await page.getByRole("button", { name: "设置" }).click()

    const popup = await popupPromise
    await expect(popup).toHaveURL(/options\.html/)
  } finally {
    await extension.close()
  }
})
