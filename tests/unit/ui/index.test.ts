import { describe, expect, it } from "vitest"

import * as ui from "../../../src/components/ui"

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

  it("exports sheet primitives and shared form controls", () => {
    const namespace = ui as Record<string, unknown>

    expect(namespace.Sheet).toBeDefined()
    expect(namespace.SheetContent).toBeDefined()
    expect(namespace.SheetHeader).toBeDefined()
    expect(namespace.SheetFooter).toBeDefined()
    expect(namespace.SheetTitle).toBeDefined()
    expect(namespace.SheetDescription).toBeDefined()
    expect(namespace.Select).toBeDefined()
    expect(namespace.SelectTrigger).toBeDefined()
    expect(namespace.SelectContent).toBeDefined()
    expect(namespace.SelectItem).toBeDefined()
    expect(namespace.Textarea).toBeDefined()
  })
})
