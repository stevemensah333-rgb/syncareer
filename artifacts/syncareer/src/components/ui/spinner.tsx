import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * The single busy indicator.
 *
 * Decorative by default: the surrounding region owns the announcement (a
 * container with `role="status"`, or the button's own pending label), so an
 * inline spinner inside a control does not announce "Loading" on top of the
 * control's own accessible name. Pass `role="status"` and an `aria-label` when
 * the spinner stands alone.
 *
 * Size comes from the icon scale in `index.css`: `size-3.5` dense, `size-4`
 * default, `size-5`/`size-6` standalone. It never animates under
 * `prefers-reduced-motion`.
 */
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      aria-hidden="true"
      className={cn("size-4 shrink-0 animate-spin motion-reduce:animate-none", className)}
      {...props}
    />
  )
}

export { Spinner }
