import type { SourceId } from "../types"
import { dongmanhuayuanSourceAdapter } from "./dongmanhuayuan"
import { kisssubSourceAdapter } from "./kisssub"
import type { SourceAdapter } from "./types"

const sourceAdapters: SourceAdapter[] = [kisssubSourceAdapter, dongmanhuayuanSourceAdapter]

export function getSourceAdapters(): SourceAdapter[] {
  return sourceAdapters.slice()
}

export function getSourceAdapterById(id: SourceId): SourceAdapter | null {
  return sourceAdapters.find((adapter) => adapter.id === id) ?? null
}

export function getSourceAdapterForPage(url: URL): SourceAdapter | null {
  return sourceAdapters.find((adapter) => adapter.matchesListPage(url)) ?? null
}

export function getSourceAdapterForDetailUrl(url: URL): SourceAdapter | null {
  return sourceAdapters.find((adapter) => adapter.matchesDetailUrl(url)) ?? null
}
