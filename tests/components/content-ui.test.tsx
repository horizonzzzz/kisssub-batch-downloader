import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ContentButton } from "../../src/components/content-ui/button"
import { ContentCheckbox } from "../../src/components/content-ui/checkbox"
import { ContentInput } from "../../src/components/content-ui/input"

describe("contents UI primitives", () => {
  it("renders a content button with the provided data anchor and disabled state", () => {
    render(
      <ContentButton
        variant="primary"
        data-anime-bt-role="footer-primary"
        disabled>
        批量下载
      </ContentButton>
    )

    const button = screen.getByRole("button", { name: "批量下载" })

    expect(button).toHaveAttribute("data-anime-bt-role", "footer-primary")
    expect(button).toBeDisabled()
  })

  it("renders a content input that keeps its anchor and accepts text entry", async () => {
    const user = userEvent.setup()

    render(
      <ContentInput
        aria-label="临时下载路径"
        data-anime-bt-role="path-input"
        placeholder="留空使用默认目录"
      />
    )

    const input = screen.getByLabelText("临时下载路径")
    await user.type(input, "D:/Anime")

    expect(input).toHaveAttribute("data-anime-bt-role", "path-input")
    expect(input).toHaveValue("D:/Anime")
  })

  it("renders a content checkbox pill with state anchors and change callbacks", async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()

    render(
      <ContentCheckbox
        checked={false}
        label="批量"
        title="选择这条帖子进行批量下载"
        aria-label="选择这条帖子进行批量下载"
        onCheckedChange={onCheckedChange}
      />
    )

    const checkbox = screen.getByRole("checkbox", { name: "选择这条帖子进行批量下载" })
    const pill = screen.getByTitle("选择这条帖子进行批量下载")
    const dot = pill.querySelector('[data-anime-bt-role="selection-dot"]')

    expect(pill).toHaveAttribute("data-anime-bt-role", "selection-pill")
    expect(pill).toHaveAttribute("data-state", "unchecked")
    expect(checkbox).toHaveAttribute("data-anime-bt-role", "selection-input")
    expect(dot).toHaveAttribute("data-anime-bt-role", "selection-dot")

    await user.click(checkbox)

    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })
})
