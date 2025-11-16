import * as React from "react"
import { cn } from "@/lib/utils"
import { useClassTokens } from "@/components/design/useClassTokens"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  const tokens = useClassTokens();
  const control = tokens?.control || 'ctrl-field';
  
  return (
    <textarea
      className={cn(
        control,
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }