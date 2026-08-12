import * as React from "react"

import { cn } from "@/lib/utils"

const ErrorBanner = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive",
      className
    )}
    {...props}
  />
))
ErrorBanner.displayName = "ErrorBanner"

export { ErrorBanner }
