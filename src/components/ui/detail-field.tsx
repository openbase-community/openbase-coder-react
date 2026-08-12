import * as React from "react"

import { cn } from "@/lib/utils"

interface DetailFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number | boolean | null | undefined
}

const DetailField = React.forwardRef<HTMLDivElement, DetailFieldProps>(
  ({ label, value, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "min-w-0 rounded border border-border bg-background px-3 py-2",
        className
      )}
      {...props}
    >
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-all font-mono text-[11px] text-foreground/80">
        {value === null || value === undefined || value === ""
          ? "—"
          : String(value)}
      </dd>
    </div>
  )
)
DetailField.displayName = "DetailField"

export { DetailField }
