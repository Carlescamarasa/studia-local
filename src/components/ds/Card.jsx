import React from "react";
import { cn } from "@/lib/utils";

/**
 * Card - Componente de tarjeta del Design System
 * Capa semántica que aplica clases definidas en globals.css
 */
export function Card({ className = "", children, ...props }) {
  return (
    <div className={cn("app-card", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }) {
  return (
    <div className={cn("card-header", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = "", children, ...props }) {
  return (
    <h3 className={cn("card-title", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = "", children, ...props }) {
  return (
    <p className={cn("card-description", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className = "", children, ...props }) {
  return (
    <div className={cn("card-content", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className = "", children, ...props }) {
  return (
    <div className={cn("card-footer", className)} {...props}>
      {children}
    </div>
  );
}