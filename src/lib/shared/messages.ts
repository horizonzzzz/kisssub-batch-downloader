import type {
  BatchEventPayload,
  BatchItem,
  SourceId,
  SubscriptionEntry,
  TestDownloaderConnectionResult
} from "./types"
import type { TaskHistoryRecord } from "../history/types"
import type { PopupOptionsRoute, PopupStateViewModel } from "./popup"
import type { SourceSubscriptionScanCandidate } from "../sources/types"
import type { FilterConfig } from "../filter-rules/types"
import type { SourceConfig } from "../sources/config/types"
import type { DownloaderConfig } from "../downloader/config/types"
import type { HistoryPageContext } from "../background/queries/history-context"
import type { BatchExecutionConfig } from "../batch-config/types"
import type { BatchUiPreferences } from "../batch-preferences/types"
import type { ContentScriptState } from "../background/queries/content-script-state"
import type { SubscriptionPolicyConfig } from "../subscriptions/policy/types"
import { getBrowser } from "./browser"

export const BATCH_EVENT = "ANIME_BT_BATCH_EVENT"
export const CONTENT_SETTINGS_CHANGED_EVENT = "ANIME_BT_CONTENT_SETTINGS_CHANGED_EVENT"
export const SCAN_SUBSCRIPTION_LIST_REQUEST = "ANIME_BT_SCAN_SUBSCRIPTION_LIST"
export const CONTENT_SCRIPT_READY_EVENT = "ANIME_BT_CONTENT_SCRIPT_READY"

export type BatchEventMessage = {
  type: typeof BATCH_EVENT
} & BatchEventPayload

export type ContentSettingsChangedMessage = {
  type: typeof CONTENT_SETTINGS_CHANGED_EVENT
}

export type ContentRuntimeMessage =
  | BatchEventMessage
  | ContentSettingsChangedMessage

export type ScanSubscriptionListMessage = {
  type: typeof SCAN_SUBSCRIPTION_LIST_REQUEST
  sourceId: SourceId
}

export type ContentScriptReadyMessage = {
  type: typeof CONTENT_SCRIPT_READY_EVENT
  sourceId: SourceId
}

export type ScanSubscriptionListResultMessage =
  | {
      ok: true
      candidates: SourceSubscriptionScanCandidate[]
    }
  | {
      ok: false
      error: string
    }

export type RuntimeRequest =
  | { type: "GET_HISTORY" }
  | { type: "CLEAR_HISTORY" }
  | { type: "DELETE_HISTORY_RECORD"; recordId: string }
  | { type: "RETRY_FAILED_ITEMS"; recordId: string; itemIds?: string[] }
  | { type: "TEST_DOWNLOADER_CONNECTION"; settings?: DownloaderConfig }
  | { type: "GET_DOWNLOADER_CONFIG" }
  | { type: "SAVE_DOWNLOADER_CONFIG"; config: DownloaderConfig }
  | {
      type: "SAVE_GENERAL_SETTINGS"
      downloaderConfig: DownloaderConfig
      batchExecutionConfig: BatchExecutionConfig
    }
  | { type: "GET_HISTORY_PAGE_CONTEXT" }
  | { type: "GET_FILTER_CONFIG" }
  | { type: "SAVE_FILTER_CONFIG"; config: FilterConfig }
  | { type: "GET_SOURCE_CONFIG" }
  | { type: "SAVE_SOURCE_CONFIG"; config: SourceConfig }
  | { type: "GET_BATCH_EXECUTION_CONFIG" }
  | { type: "SAVE_BATCH_EXECUTION_CONFIG"; config: Partial<BatchExecutionConfig> }
  | { type: "GET_BATCH_UI_PREFERENCES" }
  | { type: "SAVE_BATCH_UI_PREFERENCES"; preferences: Partial<BatchUiPreferences> }
  | { type: "GET_CONTENT_SCRIPT_STATE"; sourceId: SourceId }
  | { type: "GET_POPUP_STATE" }
  | { type: "SET_SOURCE_ENABLED"; sourceId: SourceId; enabled: boolean }
  | { type: "OPEN_OPTIONS_PAGE"; route?: PopupOptionsRoute }
  | { type: "START_BATCH_DOWNLOAD"; items?: BatchItem[]; savePath?: string }
  | { type: "UPSERT_SUBSCRIPTION"; subscription: SubscriptionEntry }
  | { type: "DELETE_SUBSCRIPTION"; subscriptionId: string }
  | { type: "SCAN_SUBSCRIPTION_LIST"; sourceId: SourceId }
  | { type: typeof CONTENT_SCRIPT_READY_EVENT; sourceId: SourceId }
  | { type: "GET_SUBSCRIPTION_POLICY" }
  | { type: "SAVE_SUBSCRIPTION_POLICY"; config: SubscriptionPolicyConfig }

export type RuntimeRequestType = RuntimeRequest["type"]

export type RuntimeErrorResponse = {
  ok: false
  error: string
}

export type TestDownloaderConnectionSuccessResponse = {
  ok: true
  result: TestDownloaderConnectionResult
}

export type OpenOptionsPageSuccessResponse = {
  ok: true
}

export type GetPopupStateSuccessResponse = {
  ok: true
  state: PopupStateViewModel
}

export type SetSourceEnabledSuccessResponse = {
  ok: true
  sourceId: SourceId
  enabled: boolean
}

export type StartBatchDownloadSuccessResponse = {
  ok: true
  total: number
}

export type GetHistorySuccessResponse = {
  ok: true
  records: TaskHistoryRecord[]
}

export type ClearHistorySuccessResponse = {
  ok: true
}

export type DeleteHistoryRecordSuccessResponse = {
  ok: true
}

export type RetryFailedItemsSuccessResponse = {
  ok: true
  successCount: number
  failedCount: number
}

export type UpsertSubscriptionSuccessResponse = {
  ok: true
}

export type DeleteSubscriptionSuccessResponse = {
  ok: true
}

export type ScanSubscriptionListSuccessResponse = ScanSubscriptionListResultMessage

export type ContentScriptReadySuccessResponse = {
  ok: true
}

export type GetFilterConfigSuccessResponse = {
  ok: true
  config: FilterConfig
}

export type SaveFilterConfigSuccessResponse = {
  ok: true
  config: FilterConfig
}

export type GetSourceConfigSuccessResponse = {
  ok: true
  config: SourceConfig
}

export type SaveSourceConfigSuccessResponse = {
  ok: true
  config: SourceConfig
}

export type GetDownloaderConfigSuccessResponse = {
  ok: true
  config: DownloaderConfig
}

export type SaveDownloaderConfigSuccessResponse = {
  ok: true
  config: DownloaderConfig
}

export type SaveGeneralSettingsSuccessResponse = {
  ok: true
  downloaderConfig: DownloaderConfig
  batchExecutionConfig: BatchExecutionConfig
}

export type GetHistoryPageContextSuccessResponse = {
  ok: true
  context: HistoryPageContext
}

export type GetBatchExecutionConfigSuccessResponse = {
  ok: true
  config: BatchExecutionConfig
}

export type SaveBatchExecutionConfigSuccessResponse = {
  ok: true
  config: BatchExecutionConfig
}

export type GetBatchUiPreferencesSuccessResponse = {
  ok: true
  preferences: BatchUiPreferences
}

export type SaveBatchUiPreferencesSuccessResponse = {
  ok: true
  preferences: BatchUiPreferences
}

export type GetContentScriptStateSuccessResponse = {
  ok: true
  state: ContentScriptState
}

export type GetSubscriptionPolicySuccessResponse = {
  ok: true
  config: SubscriptionPolicyConfig
}

export type SaveSubscriptionPolicySuccessResponse = {
  ok: true
  config: SubscriptionPolicyConfig
}

export type RuntimeSuccessResponseMap = {
  GET_HISTORY: GetHistorySuccessResponse
  CLEAR_HISTORY: ClearHistorySuccessResponse
  DELETE_HISTORY_RECORD: DeleteHistoryRecordSuccessResponse
  RETRY_FAILED_ITEMS: RetryFailedItemsSuccessResponse
  TEST_DOWNLOADER_CONNECTION: TestDownloaderConnectionSuccessResponse
  GET_FILTER_CONFIG: GetFilterConfigSuccessResponse
  SAVE_FILTER_CONFIG: SaveFilterConfigSuccessResponse
  GET_SOURCE_CONFIG: GetSourceConfigSuccessResponse
  SAVE_SOURCE_CONFIG: SaveSourceConfigSuccessResponse
  GET_DOWNLOADER_CONFIG: GetDownloaderConfigSuccessResponse
  SAVE_DOWNLOADER_CONFIG: SaveDownloaderConfigSuccessResponse
  SAVE_GENERAL_SETTINGS: SaveGeneralSettingsSuccessResponse
  GET_HISTORY_PAGE_CONTEXT: GetHistoryPageContextSuccessResponse
  GET_BATCH_EXECUTION_CONFIG: GetBatchExecutionConfigSuccessResponse
  SAVE_BATCH_EXECUTION_CONFIG: SaveBatchExecutionConfigSuccessResponse
  GET_BATCH_UI_PREFERENCES: GetBatchUiPreferencesSuccessResponse
  SAVE_BATCH_UI_PREFERENCES: SaveBatchUiPreferencesSuccessResponse
  GET_CONTENT_SCRIPT_STATE: GetContentScriptStateSuccessResponse
  GET_POPUP_STATE: GetPopupStateSuccessResponse
  SET_SOURCE_ENABLED: SetSourceEnabledSuccessResponse
  OPEN_OPTIONS_PAGE: OpenOptionsPageSuccessResponse
  START_BATCH_DOWNLOAD: StartBatchDownloadSuccessResponse
  UPSERT_SUBSCRIPTION: UpsertSubscriptionSuccessResponse
  DELETE_SUBSCRIPTION: DeleteSubscriptionSuccessResponse
  SCAN_SUBSCRIPTION_LIST: ScanSubscriptionListSuccessResponse
  [CONTENT_SCRIPT_READY_EVENT]: ContentScriptReadySuccessResponse
  GET_SUBSCRIPTION_POLICY: GetSubscriptionPolicySuccessResponse
  SAVE_SUBSCRIPTION_POLICY: SaveSubscriptionPolicySuccessResponse
}

export type RuntimeSuccessResponseFor<TType extends RuntimeRequestType> =
  RuntimeSuccessResponseMap[TType]

export type RuntimeResponseFor<TType extends RuntimeRequestType> =
  | RuntimeSuccessResponseFor<TType>
  | RuntimeErrorResponse

export type GetHistoryResponse = RuntimeResponseFor<"GET_HISTORY">
export type ClearHistoryResponse = RuntimeResponseFor<"CLEAR_HISTORY">
export type DeleteHistoryRecordResponse = RuntimeResponseFor<"DELETE_HISTORY_RECORD">
export type RetryFailedItemsResponse = RuntimeResponseFor<"RETRY_FAILED_ITEMS">
export type TestDownloaderConnectionResponse = RuntimeResponseFor<"TEST_DOWNLOADER_CONNECTION">
export type GetPopupStateResponse = RuntimeResponseFor<"GET_POPUP_STATE">
export type SetSourceEnabledResponse = RuntimeResponseFor<"SET_SOURCE_ENABLED">
export type OpenOptionsPageResponse = RuntimeResponseFor<"OPEN_OPTIONS_PAGE">
export type StartBatchDownloadResponse = RuntimeResponseFor<"START_BATCH_DOWNLOAD">
export type UpsertSubscriptionResponse = RuntimeResponseFor<"UPSERT_SUBSCRIPTION">
export type DeleteSubscriptionResponse = RuntimeResponseFor<"DELETE_SUBSCRIPTION">
export type ScanSubscriptionListResponse = RuntimeResponseFor<"SCAN_SUBSCRIPTION_LIST">
export type ContentScriptReadyResponse = RuntimeResponseFor<typeof CONTENT_SCRIPT_READY_EVENT>
export type GetFilterConfigResponse = RuntimeResponseFor<"GET_FILTER_CONFIG">
export type SaveFilterConfigResponse = RuntimeResponseFor<"SAVE_FILTER_CONFIG">
export type GetSourceConfigResponse = RuntimeResponseFor<"GET_SOURCE_CONFIG">
export type SaveSourceConfigResponse = RuntimeResponseFor<"SAVE_SOURCE_CONFIG">
export type GetDownloaderConfigResponse = RuntimeResponseFor<"GET_DOWNLOADER_CONFIG">
export type SaveDownloaderConfigResponse = RuntimeResponseFor<"SAVE_DOWNLOADER_CONFIG">
export type SaveGeneralSettingsResponse = RuntimeResponseFor<"SAVE_GENERAL_SETTINGS">
export type GetHistoryPageContextResponse = RuntimeResponseFor<"GET_HISTORY_PAGE_CONTEXT">
export type GetBatchExecutionConfigResponse = RuntimeResponseFor<"GET_BATCH_EXECUTION_CONFIG">
export type SaveBatchExecutionConfigResponse = RuntimeResponseFor<"SAVE_BATCH_EXECUTION_CONFIG">
export type GetBatchUiPreferencesResponse = RuntimeResponseFor<"GET_BATCH_UI_PREFERENCES">
export type SaveBatchUiPreferencesResponse = RuntimeResponseFor<"SAVE_BATCH_UI_PREFERENCES">
export type GetContentScriptStateResponse = RuntimeResponseFor<"GET_CONTENT_SCRIPT_STATE">
export type GetSubscriptionPolicyResponse = RuntimeResponseFor<"GET_SUBSCRIPTION_POLICY">
export type SaveSubscriptionPolicyResponse = RuntimeResponseFor<"SAVE_SUBSCRIPTION_POLICY">
export type RuntimeResponse = RuntimeResponseFor<RuntimeRequestType>

export function createRuntimeSuccessResponse<TType extends RuntimeRequestType>(
  _type: TType,
  payload: Omit<RuntimeSuccessResponseFor<TType>, "ok">
): RuntimeSuccessResponseFor<TType> {
  return {
    ok: true,
    ...payload
  } as RuntimeSuccessResponseFor<TType>
}

export function createRuntimeErrorResponse(error: string): RuntimeErrorResponse {
  return {
    ok: false,
    error
  }
}

export async function sendRuntimeRequest<TRequest extends RuntimeRequest>(
  request: TRequest
): Promise<RuntimeResponseFor<TRequest["type"]>> {
  return getBrowser().runtime.sendMessage(request) as Promise<RuntimeResponseFor<TRequest["type"]>>
}
