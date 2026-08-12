import * as React from "react"

import { cn } from "@/lib/utils"

const Panel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "overflow-hidden rounded border border-border bg-surface",
      className
    )}
    {...props}
  />
))
Panel.displayName = "Panel"

export { Panel }
