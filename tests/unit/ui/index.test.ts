import { describe, expect, it } from "vitest"

import * as ui from "../../../components/ui"

describe("components/ui exports", () => {
  it("exports alert dialog primitives", () => {
    expect(ui.AlertDialog).toBeDefined()
    expect(ui.AlertDialogContent).toBeDefined()
    expect(ui.AlertDialogHeader).toBeDefined()
    expect(ui.AlertDialogFooter).toBeDefined()
    expect(ui.AlertDialogTitle).toBeDefined()
    expect(ui.AlertDialogDescription).toBeDefined()
    expect(ui.AlertDialogAction).toBeDefined()
    expect(ui.AlertDialogCancel).toBeDefined()
  })
})
