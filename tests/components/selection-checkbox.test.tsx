import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { SelectionCheckbox } from "../../src/components/selection-checkbox"

describe("SelectionCheckbox", () => {
  it("exposes an explicit accessible name and reports checked state changes", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<SelectionCheckbox checked={false} onChange={onChange} />)

    const checkbox = screen.getByRole("checkbox", { name: "选择这条帖子进行批量下载" })
    await user.click(checkbox)

    expect(onChange).toHaveBeenCalledWith(true)
  })

  it("renders contents-specific styling hooks for the checkbox pill", () => {
    render(<SelectionCheckbox checked={true} onChange={vi.fn()} />)

    const checkbox = screen.getByRole("checkbox", { name: "选择这条帖子进行批量下载" })
    const label = screen.getByTitle("选择这条帖子进行批量下载")
    const dot = label.querySelector('[data-anime-bt-role="selection-dot"]')

    expect(label).toHaveAttribute("data-anime-bt-role", "selection-pill")
    expect(label).toHaveAttribute("data-state", "checked")
    expect(checkbox).toHaveAttribute("data-anime-bt-role", "selection-input")
    expect(dot).toHaveAttribute("data-anime-bt-role", "selection-dot")
  })

  it("does not bubble pointer or click events to a clickable parent row", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onClick = vi.fn()
    const onMouseDown = vi.fn()

    render(
      <div onClick={onClick} onMouseDown={onMouseDown}>
        <SelectionCheckbox checked={false} onChange={onChange} />
      </div>
    )

    await user.click(screen.getByText("批量"))

    expect(onChange).toHaveBeenCalledWith(true)
    expect(onClick).not.toHaveBeenCalled()
    expect(onMouseDown).not.toHaveBeenCalled()
  })

  it("renders disabled state and does not fire changes for blocked items", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <SelectionCheckbox
        checked={false}
        disabled
        disabledReason="该条目未命中当前筛选规则，无法选择"
        onChange={onChange}
      />
    )

    const checkbox = screen.getByRole("checkbox", { name: "该条帖子不可选择" })
    expect(checkbox).toBeDisabled()
    expect(screen.getByTitle("该条目未命中当前筛选规则，无法选择")).toBeInTheDocument()

    await user.click(checkbox)

    expect(onChange).not.toHaveBeenCalled()
  })
})

