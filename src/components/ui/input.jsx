import * as React from "react"
import { cn } from "@/lib/utils"
import { useClassTokens } from "@/components/design/useClassTokens"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  const { control } = useClassTokens();
  
  return (
    <input
      type={type}
      className={cn(
        control,
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }