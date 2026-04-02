import { useEffect, useRef } from "react"

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",")

export function useSheetAccessibility(
  open: boolean,
  onClose: () => void
) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const panel = panelRef.current
    if (!panel) {
      return
    }

    const previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    const getFocusableElements = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute("disabled")
      )

    const focusFirstElement = () => {
      const preferredFocusableElement =
        panel.querySelector<HTMLElement>("[data-autofocus='true']")
      if (preferredFocusableElement) {
        preferredFocusableElement.focus()
        return
      }

      const [firstFocusableElement] = getFocusableElements()
      if (firstFocusableElement) {
        firstFocusableElement.focus()
        return
      }

      panel.focus()
    }

    const animationFrame = window.requestAnimationFrame(focusFirstElement)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== "Tab") {
        return
      }

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }

      const firstFocusableElement = focusableElements[0]
      const lastFocusableElement =
        focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement

      if (event.shiftKey) {
        if (
          activeElement === firstFocusableElement ||
          activeElement === panel
        ) {
          event.preventDefault()
          lastFocusableElement.focus()
        }
        return
      }

      if (activeElement === lastFocusableElement) {
        event.preventDefault()
        firstFocusableElement.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      document.removeEventListener("keydown", handleKeyDown)

      if (
        previousActiveElement &&
        document.contains(previousActiveElement)
      ) {
        previousActiveElement.focus()
      }
    }
  }, [onClose, open])

  return panelRef
}
