import React from "react";
import { cn } from "@/lib/utils";

function Button({ 
  variant = "primary", 
  size = "md",
  disabled = false,
  asChild = false,
  children, 
  className = "",
  ...props 
}) {
  const variantClass = {
    primary: "btn-primary",
    secondary: "btn-secondary", 
    ghost: "btn-ghost",
    outline: "btn-outline",
    danger: "btn-danger",
    destructive: "btn-danger",
  }[variant] || "btn-primary";

  const sizeClass = {
    sm: "btn-sm",
    md: "btn-md",
    lg: "btn-lg",
    icon: "btn-icon"
  }[size] || "btn-md";

  const Comp = asChild ? "span" : "button";

  return (
    <Comp
      className={cn(
        variantClass,
        sizeClass,
        disabled && "btn-disabled",
        className
      )}
      disabled={!asChild && disabled}
      {...props}
    >
      {children}
    </Comp>
  );
}

export { Button };
export default Button;