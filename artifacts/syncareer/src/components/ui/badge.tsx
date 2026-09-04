import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-xs font-medium transition-colors duration-150 ease-standard motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        success:
          "border-transparent bg-success text-success-foreground hover:bg-success/80",
        warning:
          "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
        info:
          "border-transparent bg-info text-info-foreground hover:bg-info/80",
        outline: "text-foreground",
        // Soft status tones. Preferred for inline status indicators, where a
        // solid fill is too loud. They replace the ad-hoc tinted pills that
        // individual pages used to hand-roll.
        "soft-neutral": "border-border bg-muted text-muted-foreground",
        "soft-success": "border-success/25 bg-success/10 text-success",
        "soft-warning": "border-warning/25 bg-warning/10 text-warning",
        "soft-destructive": "border-destructive/25 bg-destructive/10 text-destructive",
        "soft-info": "border-info/25 bg-info/10 text-info",
        "soft-primary": "border-primary/25 bg-primary/10 text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
