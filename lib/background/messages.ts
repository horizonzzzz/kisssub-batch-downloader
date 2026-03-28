export function getBatchStartedMessage(total: number, savePath: string): string {
  if (savePath) {
    return `Preparing ${total} selected posts. Requested save path: ${savePath}`
  }

  return `Preparing ${total} selected posts. Using the downloader default save path.`
}

export function getBatchSubmittingMessage(total: number, savePath: string): string {
  if (savePath) {
    return `Submitting ${total} unique item(s) to qBittorrent with save path ${savePath}.`
  }

  return `Submitting ${total} unique link(s) to the downloader using the default save path.`
}
