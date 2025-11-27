import * as React from "react"
import { cn } from "@/lib/utils"
import { componentStyles } from "@/design/componentStyles"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        componentStyles.controls.inputDefault,
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }