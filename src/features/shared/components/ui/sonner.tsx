"use client";
import * as React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { componentStyles } from "@/design/componentStyles"
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react"

const Toaster: React.FC<ToasterProps> = (props) => {
  return (
    <Sonner
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast: `${componentStyles.notifications.toast} group-[.toaster]:bg-[var(--color-surface)] group-[.toaster]:text-[var(--color-text-primary)] group-[.toaster]:border-[var(--color-border-default)] group-[.toaster]:shadow-lg`,
          description: componentStyles.notifications.description,
          actionButton: componentStyles.notifications.actionButton,
          cancelButton: componentStyles.notifications.cancelButton,
          success: componentStyles.notifications.toastSuccess,
          error: componentStyles.notifications.toastError,
          warning: componentStyles.notifications.toastWarning,
          info: componentStyles.notifications.toastInfo,
        },
        duration: 4000,
      }}
      icons={{
        success: <CheckCircle2 className="w-5 h-5" />,
        error: <AlertCircle className="w-5 h-5" />,
        warning: <AlertTriangle className="w-5 h-5" />,
        info: <Info className="w-5 h-5" />,
      }}
      {...props}
    />
  );
}
Toaster.displayName = "Toaster";

export { Toaster }
