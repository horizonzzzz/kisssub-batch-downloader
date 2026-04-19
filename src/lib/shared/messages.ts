import type {
  AppSettings,
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
import { getBrowser } from "./browser"

export const BATCH_EVENT = "ANIME_BT_BATCH_EVENT"
export const SOURCE_ENABLED_CHANGE_EVENT = "ANIME_BT_SOURCE_ENABLED_CHANGE_EVENT"
export const FILTERS_UPDATED_EVENT = "ANIME_BT_FILTERS_UPDATED_EVENT"
export const SCAN_SUBSCRIPTION_LIST_REQUEST = "ANIME_BT_SCAN_SUBSCRIPTION_LIST"
export const CONTENT_SCRIPT_READY_EVENT = "ANIME_BT_CONTENT_SCRIPT_READY"

export type BatchEventMessage = {
  type: typeof BATCH_EVENT
} & BatchEventPayload

export type SourceEnabledChangeMessage = {
  type: typeof SOURCE_ENABLED_CHANGE_EVENT
  sourceId: SourceId
  enabled: boolean
}

export type FiltersUpdatedMessage = {
  type: typeof FILTERS_UPDATED_EVENT
}

export type ContentRuntimeMessage =
  | BatchEventMessage
  | SourceEnabledChangeMessage
  | FiltersUpdatedMessage

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
  | { type: "GET_APP_SETTINGS" }
  | { type: "SAVE_APP_SETTINGS"; settings?: Partial<AppSettings> }
  | { type: "TEST_DOWNLOADER_CONNECTION"; settings?: Partial<AppSettings> | null }
  | { type: "GET_FILTER_CONFIG" }
  | { type: "SAVE_FILTER_CONFIG"; config: FilterConfig }
  | { type: "GET_SOURCE_CONFIG" }
  | { type: "SAVE_SOURCE_CONFIG"; config: SourceConfig }
  | { type: "GET_POPUP_STATE" }
  | { type: "SET_SOURCE_ENABLED"; sourceId: SourceId; enabled: boolean }
  | { type: "OPEN_OPTIONS_PAGE"; route?: PopupOptionsRoute }
  | { type: "START_BATCH_DOWNLOAD"; items?: BatchItem[]; savePath?: string }
  | { type: "UPSERT_SUBSCRIPTION"; subscription: SubscriptionEntry }
  | { type: "DELETE_SUBSCRIPTION"; subscriptionId: string }
  | { type: "SCAN_SUBSCRIPTION_LIST"; sourceId: SourceId }
  | { type: typeof CONTENT_SCRIPT_READY_EVENT; sourceId: SourceId }

export type RuntimeRequestType = RuntimeRequest["type"]

export type RuntimeErrorResponse = {
  ok: false
  error: string
}

export type GetAppSettingsSuccessResponse = {
  ok: true
  settings: AppSettings
}

export type SaveAppSettingsSuccessResponse = {
  ok: true
  settings: AppSettings
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

export type RuntimeSuccessResponseMap = {
  GET_HISTORY: GetHistorySuccessResponse
  CLEAR_HISTORY: ClearHistorySuccessResponse
  DELETE_HISTORY_RECORD: DeleteHistoryRecordSuccessResponse
  RETRY_FAILED_ITEMS: RetryFailedItemsSuccessResponse
  GET_APP_SETTINGS: GetAppSettingsSuccessResponse
  SAVE_APP_SETTINGS: SaveAppSettingsSuccessResponse
  TEST_DOWNLOADER_CONNECTION: TestDownloaderConnectionSuccessResponse
  GET_FILTER_CONFIG: GetFilterConfigSuccessResponse
  SAVE_FILTER_CONFIG: SaveFilterConfigSuccessResponse
  GET_SOURCE_CONFIG: GetSourceConfigSuccessResponse
  SAVE_SOURCE_CONFIG: SaveSourceConfigSuccessResponse
  GET_POPUP_STATE: GetPopupStateSuccessResponse
  SET_SOURCE_ENABLED: SetSourceEnabledSuccessResponse
  OPEN_OPTIONS_PAGE: OpenOptionsPageSuccessResponse
  START_BATCH_DOWNLOAD: StartBatchDownloadSuccessResponse
  UPSERT_SUBSCRIPTION: UpsertSubscriptionSuccessResponse
  DELETE_SUBSCRIPTION: DeleteSubscriptionSuccessResponse
  SCAN_SUBSCRIPTION_LIST: ScanSubscriptionListSuccessResponse
  [CONTENT_SCRIPT_READY_EVENT]: ContentScriptReadySuccessResponse
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
export type GetAppSettingsResponse = RuntimeResponseFor<"GET_APP_SETTINGS">
export type SaveAppSettingsResponse = RuntimeResponseFor<"SAVE_APP_SETTINGS">
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
