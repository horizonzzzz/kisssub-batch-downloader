import { getSourceAdapterForPage } from "../sources"
import type { SourceAdapter } from "../sources/types"
import { resolveSourceEnabled } from "../sources/config/selectors"
import type { SourceConfig } from "../sources/config/types"
import type { BatchItem } from "../shared/types"

function toUrl(location: Pick<Location, "href"> | URL): URL {
  return location instanceof URL ? location : new URL(location.href)
}

export function getSourceAdapterForLocation(location: Pick<Location, "href"> | URL): SourceAdapter | null {
  return getSourceAdapterForPage(toUrl(location))
}

export function getEnabledSourceAdapterForLocation(
  location: Pick<Location, "href"> | URL,
  sourceConfig: SourceConfig
): SourceAdapter | null {
  const source = getSourceAdapterForLocation(location)
  if (!source) {
    return null
  }

  return resolveSourceEnabled(source.id, sourceConfig) ? source : null
}

export function isListPage(location: Pick<Location, "href"> | URL): boolean {
  return getSourceAdapterForLocation(location) !== null
}

export function getDetailAnchors(
  source: SourceAdapter,
  root: ParentNode = document,
  location: Pick<Location, "href"> | URL = window.location
): HTMLAnchorElement[] {
  return source.getDetailAnchors(root, toUrl(location))
}

export function isValidDetailAnchor(
  source: SourceAdapter,
  anchor: HTMLAnchorElement,
  location: Pick<Location, "href"> | URL = window.location
): boolean {
  try {
    const url = new URL(anchor.getAttribute("href") || anchor.href, toUrl(location).href)
    return source.matchesDetailUrl(url)
  } catch {
    return false
  }
}

export function getBatchItemFromAnchor(
  source: SourceAdapter,
  anchor: HTMLAnchorElement,
  location: Pick<Location, "href"> | URL = window.location
): BatchItem | null {
  return source.getBatchItemFromAnchor(anchor, toUrl(location))
}

export function getAnchorMountTarget(anchor: HTMLAnchorElement): Element | null {
  return anchor.closest("td, li, p, div") || anchor.parentElement
}

export function normalizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
}
