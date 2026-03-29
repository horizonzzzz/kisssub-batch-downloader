import {
  DEFAULT_MAX_RECORDS,
  HISTORY_STORAGE_KEY,
  type HistoryStorage,
  type TaskHistoryRecord
} from "./types"

function createEmptyStorage(): HistoryStorage {
  return {
    records: [],
    maxRecords: DEFAULT_MAX_RECORDS,
    lastCleanupAt: undefined
  }
}

export async function getHistoryStorage(): Promise<HistoryStorage> {
  const result = await chrome.storage.local.get(HISTORY_STORAGE_KEY)
  if (!result[HISTORY_STORAGE_KEY]) {
    return createEmptyStorage()
  }
  return result[HISTORY_STORAGE_KEY] as HistoryStorage
}

export async function getHistoryRecords(): Promise<TaskHistoryRecord[]> {
  const storage = await getHistoryStorage()
  return storage.records
}

function cleanupOldRecords(storage: HistoryStorage): HistoryStorage {
  if (storage.records.length <= storage.maxRecords) {
    return storage
  }
  const trimmed = storage.records.slice(0, storage.maxRecords)
  return {
    ...storage,
    records: trimmed,
    lastCleanupAt: new Date().toISOString()
  }
}

export async function saveTaskHistory(record: TaskHistoryRecord): Promise<void> {
  const storage = await getHistoryStorage()
  const updated = {
    ...storage,
    records: [record, ...storage.records]
  }
  const cleaned = cleanupOldRecords(updated)
  await chrome.storage.local.set({ [HISTORY_STORAGE_KEY]: cleaned })
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.set({ [HISTORY_STORAGE_KEY]: createEmptyStorage() })
}

export function createHistoryRecordId(): string {
  const timestamp = Date.now()
  const suffix = Math.random().toString(36).slice(2, 6)
  return `batch-${timestamp}-${suffix}`
}

export function createHistoryItemId(recordId: string, itemIndex: number): string {
  return `${recordId}-${itemIndex}`
}