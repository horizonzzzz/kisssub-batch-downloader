import { defineBackground } from "wxt/utils/define-background"

import { registerBackgroundRuntime } from "./runtime"

export default defineBackground(() => {
  registerBackgroundRuntime()
})
