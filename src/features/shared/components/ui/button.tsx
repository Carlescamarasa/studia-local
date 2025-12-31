/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { componentStyles } from "@/design/componentStyles"

const buttonVariants = cva(
  "btn inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "btn-primary",
        primary: "btn-primary",
        secondary: "btn-secondary",
        destructive: "btn-danger",
        outline: "btn-outline",
        ghost: "btn-ghost",
        link: "text-primary underline-offset-4 hover:underline",
        warning: "btn-warning",
      },
      size: {
        default: "btn-md",
        sm: "btn-sm",
        lg: "btn-lg",
        icon: "btn-icon",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingText,
  children,
  disabled,
  ...props
}, ref) => {
  const Comp = asChild ? Slot : "button"

  // Determinar el tamaño del spinner según el tamaño del botón
  const spinnerClass = size === "sm"
    ? componentStyles.buttons.spinnerInlineSm
    : size === "lg"
      ? componentStyles.buttons.spinnerInlineLg
      : componentStyles.buttons.spinnerInline

  // Contenido del botón: si está loading, mostrar spinner + texto, sino mostrar children
  const buttonContent = loading ? (
    <>
      <div className={cn(spinnerClass, "mr-2")} />
      {loadingText || children}
    </>
  ) : children

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      disabled={disabled || loading}
      {...props}
    >
      {buttonContent}
    </Comp>
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
