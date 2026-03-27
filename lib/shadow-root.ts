type ShadowMountHostOptions<TagName extends keyof HTMLElementTagNameMap> = {
  hostTagName: TagName
  containerTagName?: keyof HTMLElementTagNameMap
  dataset?: Record<string, string>
  parent: Node
  before?: ChildNode | null
}

type ShadowMountHost<TagName extends keyof HTMLElementTagNameMap> = {
  host: HTMLElementTagNameMap[TagName]
  shadowRoot: ShadowRoot
  container: HTMLElement
}

const stylesheetTextCache = new Map<string, string>()
const constructedStylesheetCache = new Map<string, CSSStyleSheet | null>()

export function createShadowMountHost<TagName extends keyof HTMLElementTagNameMap>({
  hostTagName,
  containerTagName = "div",
  dataset,
  parent,
  before = null
}: ShadowMountHostOptions<TagName>): ShadowMountHost<TagName> {
  const host = document.createElement(hostTagName)

  for (const [key, value] of Object.entries(dataset ?? {})) {
    host.dataset[key] = value
  }

  parent.insertBefore(host, before)

  const shadowRoot = host.attachShadow({
    mode: "open"
  })
  const container = document.createElement(containerTagName)
  shadowRoot.appendChild(container)

  return {
    host,
    shadowRoot,
    container
  }
}

export function ensureShadowStyle(
  shadowRoot: ShadowRoot,
  styleId: string,
  styleText: string
) {
  if (!styleText) {
    return null
  }

  const constructedStylesheet = getConstructedStylesheet(styleId, styleText)
  if (constructedStylesheet) {
    if (!shadowRoot.adoptedStyleSheets.includes(constructedStylesheet)) {
      shadowRoot.adoptedStyleSheets = [...shadowRoot.adoptedStyleSheets, constructedStylesheet]
    }

    return constructedStylesheet
  }

  const selector = `style[data-anime-bt-batch-shadow-style="${styleId}"]`
  const existing = shadowRoot.querySelector<HTMLStyleElement>(selector)
  if (existing) {
    return existing
  }

  const style = document.createElement("style")
  style.dataset.animeBtBatchShadowStyle = styleId
  style.textContent = styleText
  shadowRoot.prepend(style)
  return style
}

export function getDocumentStylesheetText(
  cacheKey: string,
  sentinel: string,
  options: {
    removeOwnerNode?: boolean
  } = {}
) {
  const cached = stylesheetTextCache.get(cacheKey)
  if (cached !== undefined) {
    return cached
  }

  for (const sheet of Array.from(document.styleSheets)) {
    const styleText = readStylesheetText(sheet)
    if (!styleText || !styleText.includes(sentinel)) {
      continue
    }

    if (options.removeOwnerNode) {
      removeStylesheetOwnerNode(sheet)
    }

    stylesheetTextCache.set(cacheKey, styleText)
    return styleText
  }

  return ""
}

function readStylesheetText(sheet: CSSStyleSheet) {
  try {
    return Array.from(sheet.cssRules)
      .map((rule) => rule.cssText)
      .join("\n")
  } catch {
    return ""
  }
}

function getConstructedStylesheet(cacheKey: string, styleText: string) {
  const cached = constructedStylesheetCache.get(cacheKey)
  if (cached !== undefined) {
    return cached
  }

  if (
    typeof CSSStyleSheet === "undefined" ||
    typeof CSSStyleSheet.prototype.replaceSync !== "function"
  ) {
    constructedStylesheetCache.set(cacheKey, null)
    return null
  }

  const stylesheet = new CSSStyleSheet()
  stylesheet.replaceSync(styleText)
  constructedStylesheetCache.set(cacheKey, stylesheet)
  return stylesheet
}

function removeStylesheetOwnerNode(sheet: CSSStyleSheet) {
  const ownerNode = sheet.ownerNode
  if (ownerNode instanceof HTMLStyleElement || ownerNode instanceof HTMLLinkElement) {
    ownerNode.remove()
  }
}
