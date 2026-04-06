import {
  DEFAULT_MAX_RECORDS,
  HISTORY_STORAGE_KEY,
  type HistoryStorage,
  type TaskHistoryRecord
} from "./types"
import { getBrowser } from "../shared/browser"

function createEmptyStorage(): HistoryStorage {
  return {
    records: [],
    maxRecords: DEFAULT_MAX_RECORDS,
    lastCleanupAt: undefined
  }
}

export async function getHistoryStorage(): Promise<HistoryStorage> {
  const result = await getBrowser().storage.local.get(HISTORY_STORAGE_KEY)
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
  await getBrowser().storage.local.set({ [HISTORY_STORAGE_KEY]: cleaned })
}

export async function clearHistory(): Promise<void> {
  await getBrowser().storage.local.set({ [HISTORY_STORAGE_KEY]: createEmptyStorage() })
}

export async function getHistoryRecord(recordId: string): Promise<TaskHistoryRecord | null> {
  const records = await getHistoryRecords()
  return records.find(r => r.id === recordId) ?? null
}

export async function updateHistoryRecord(record: TaskHistoryRecord): Promise<void> {
  const storage = await getHistoryStorage()
  const updatedRecords = storage.records.map(r => r.id === record.id ? record : r)
  await getBrowser().storage.local.set({
    [HISTORY_STORAGE_KEY]: { ...storage, records: updatedRecords }
  })
}

export async function deleteHistoryRecord(recordId: string): Promise<void> {
  const storage = await getHistoryStorage()
  const updatedRecords = storage.records.filter(r => r.id !== recordId)
  await getBrowser().storage.local.set({
    [HISTORY_STORAGE_KEY]: { ...storage, records: updatedRecords }
  })
}

export function createHistoryRecordId(): string {
  const timestamp = Date.now()
  const suffix = Math.random().toString(36).slice(2, 6)
  return `batch-${timestamp}-${suffix}`
}

export function createHistoryItemId(recordId: string, itemIndex: number): string {
  return `${recordId}-${itemIndex}`
}
