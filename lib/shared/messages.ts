import type { BatchItem, Settings, TestQbConnectionResult } from "./types"

export const BATCH_EVENT = "ANIME_BT_BATCH_EVENT"

export type RuntimeRequest =
  | { type: "GET_SETTINGS" }
  | { type: "SAVE_SETTINGS"; settings?: Partial<Settings> }
  | { type: "TEST_QB_CONNECTION"; settings?: Partial<Settings> | null }
  | { type: "OPEN_OPTIONS_PAGE" }
  | { type: "START_BATCH_DOWNLOAD"; items?: BatchItem[]; savePath?: string }

export type RuntimeRequestType = RuntimeRequest["type"]

export type RuntimeErrorResponse = {
  ok: false
  error: string
}

export type GetSettingsSuccessResponse = {
  ok: true
  settings: Settings
}

export type SaveSettingsSuccessResponse = {
  ok: true
  settings: Settings
}

export type TestQbConnectionSuccessResponse = {
  ok: true
  result: TestQbConnectionResult
}

export type OpenOptionsPageSuccessResponse = {
  ok: true
}

export type StartBatchDownloadSuccessResponse = {
  ok: true
  total: number
}

export type RuntimeSuccessResponseMap = {
  GET_SETTINGS: GetSettingsSuccessResponse
  SAVE_SETTINGS: SaveSettingsSuccessResponse
  TEST_QB_CONNECTION: TestQbConnectionSuccessResponse
  OPEN_OPTIONS_PAGE: OpenOptionsPageSuccessResponse
  START_BATCH_DOWNLOAD: StartBatchDownloadSuccessResponse
}

export type RuntimeSuccessResponseFor<TType extends RuntimeRequestType> =
  RuntimeSuccessResponseMap[TType]

export type RuntimeResponseFor<TType extends RuntimeRequestType> =
  | RuntimeSuccessResponseFor<TType>
  | RuntimeErrorResponse

export type GetSettingsResponse = RuntimeResponseFor<"GET_SETTINGS">
export type SaveSettingsResponse = RuntimeResponseFor<"SAVE_SETTINGS">
export type TestQbConnectionResponse = RuntimeResponseFor<"TEST_QB_CONNECTION">
export type OpenOptionsPageResponse = RuntimeResponseFor<"OPEN_OPTIONS_PAGE">
export type StartBatchDownloadResponse = RuntimeResponseFor<"START_BATCH_DOWNLOAD">
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
  return chrome.runtime.sendMessage(request) as Promise<RuntimeResponseFor<TRequest["type"]>>
}
