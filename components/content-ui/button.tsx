import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/shared/cn"

const contentButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center border outline-none transition-[transform,background-color,border-color,box-shadow,color,opacity] duration-150 ease-out focus-visible:ring-[3px] focus-visible:ring-blue-500/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none",
  {
    variants: {
      variant: {
        control:
          "min-h-[var(--anime-bt-control-height)] gap-2 rounded-[var(--anime-bt-radius-control)] border-[rgba(188,200,214,0.92)] bg-[rgba(255,255,255,0.92)] px-[var(--anime-bt-control-padding-x)] text-[12px] font-semibold leading-none text-[#415264] hover:enabled:-translate-y-px hover:enabled:border-[rgba(121,139,160,0.86)] hover:enabled:bg-[var(--anime-bt-white)]",
        primary:
          "min-h-[var(--anime-bt-control-height)] gap-2 rounded-[var(--anime-bt-radius-control)] border-[rgba(16,82,183,0.92)] bg-[linear-gradient(180deg,#2585ff_0%,#1464d9_100%)] px-[16px] text-[12px] font-semibold leading-none text-[var(--anime-bt-white)] shadow-[0_10px_24px_rgba(20,100,217,0.24)] hover:enabled:-translate-y-px hover:enabled:shadow-[0_14px_30px_rgba(20,100,217,0.3)]",
        icon:
          "h-[var(--anime-bt-icon-button-size)] w-[var(--anime-bt-icon-button-size)] rounded-[var(--anime-bt-radius-icon)] border-transparent bg-[rgba(255,255,255,0.08)] p-0 text-[rgba(245,249,255,0.8)] hover:enabled:-translate-y-px hover:enabled:bg-[rgba(255,255,255,0.14)] hover:enabled:text-[var(--anime-bt-white)]",
        toggle:
          "w-full justify-between gap-[8px] border-transparent bg-[rgba(244,248,252,0.96)] px-[14px] py-[12px] text-[12px] font-semibold uppercase leading-none tracking-[0.08em] text-[#546273] hover:enabled:bg-[#eef4fa]",
        launcher:
          "gap-[10px] rounded-[var(--anime-bt-radius-pill)] border-[rgba(24,36,52,0.14)] bg-[linear-gradient(135deg,#111a24_0%,#1b2d43_100%)] px-[16px] py-[12px] text-[13px] font-semibold leading-none text-[#f4f7fb] shadow-[0_18px_36px_rgba(2,6,23,0.28)] hover:enabled:-translate-y-px hover:enabled:scale-[1.01] hover:enabled:shadow-[0_22px_42px_rgba(2,6,23,0.34)] active:enabled:scale-[0.98]"
      }
    },
    defaultVariants: {
      variant: "control"
    }
  }
)

export interface ContentButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof contentButtonVariants> {
  asChild?: boolean
}

const ContentButton = React.forwardRef<HTMLButtonElement, ContentButtonProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(contentButtonVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)

ContentButton.displayName = "ContentButton"

export { ContentButton, contentButtonVariants }
