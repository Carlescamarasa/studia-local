import React from "react";
import { cn } from "@/lib/utils";
import { componentStyles } from "@/design/componentStyles";

/**
 * Card - Componente de tarjeta del Design System
 * Capa semántica que aplica clases definidas en globals.css
 * Usa forwardRef para soportar refs de librerías como @dnd-kit
 * 
 * @param {boolean} interactive - Si es true, añade efectos hover y active
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card({
  className = "",
  children,
  interactive = false,
  ...props
}, ref) {
  const interactiveClasses = interactive
    ? `${componentStyles.motion.cardHover} ${componentStyles.motion.cardActive} cursor-pointer`
    : "";

  return (
    <div
      ref={ref}
      className={cn("ui-card app-card", interactiveClasses, className)}
      {...props}
    >
      {children}
    </div>
  );
});

export function CardHeader({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card-header", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = "", children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("card-title", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = "", children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("card-description", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card-content", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card-footer", className)} {...props}>
      {children}
    </div>
  );
}