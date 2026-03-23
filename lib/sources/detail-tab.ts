export async function withDetailTab<T>(
  detailUrl: string,
  timeoutMs: number,
  run: (tabId: number) => Promise<T>
): Promise<T> {
  const tab = await chrome.tabs.create({
    url: detailUrl,
    active: false
  })

  try {
    await waitForTabReady(tab.id!, timeoutMs)
    return await run(tab.id!)
  } finally {
    await closeTabQuietly(tab.id!)
  }
}

async function waitForTabReady(tabId: number, timeoutMs: number) {
  return new Promise<chrome.tabs.Tab>((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      chrome.tabs.onUpdated.removeListener(listener)
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
    }

    const listener = (
      updatedTabId: number,
      changeInfo: { status?: string },
      tab: chrome.tabs.Tab
    ) => {
      if (updatedTabId !== tabId) {
        return
      }

      if (changeInfo.status === "complete") {
        cleanup()
        resolve(tab)
      }
    }

    timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error("Timed out waiting for the detail tab to finish loading."))
    }, timeoutMs)

    chrome.tabs.onUpdated.addListener(listener)

    void chrome.tabs
      .get(tabId)
      .then((tab) => {
        if (tab.status === "complete") {
          cleanup()
          resolve(tab)
        }
      })
      .catch(() => {
        cleanup()
        reject(new Error("The background detail tab could not be opened."))
      })
  })
}

async function closeTabQuietly(tabId: number) {
  try {
    await chrome.tabs.remove(tabId)
  } catch {
    // Ignore already-closed tabs.
  }
}
