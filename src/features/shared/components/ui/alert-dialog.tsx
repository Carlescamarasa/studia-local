import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/features/shared/components/ui/button"
import { componentStyles } from "@/design/componentStyles"

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

type AlertDialogOverlayProps = React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  AlertDialogOverlayProps
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      componentStyles.modal.overlay,
      className
    )}
    {...props}
    ref={ref} />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

type AlertDialogContentProps = React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  AlertDialogContentProps
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        componentStyles.modal.container,
        componentStyles.modal.sizeMd,
        className
      )}
      {...props} />
  </AlertDialogPortal>
))
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

type AlertDialogHeaderProps = React.HTMLAttributes<HTMLDivElement>;

const AlertDialogHeader = ({
  className,
  ...props
}: AlertDialogHeaderProps) => (
  <div
    className={cn(componentStyles.modal.header, className)}
    {...props} />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

type AlertDialogFooterProps = React.HTMLAttributes<HTMLDivElement>;

const AlertDialogFooter = ({
  className,
  ...props
}: AlertDialogFooterProps) => (
  <div
    className={cn(componentStyles.modal.footer, className)}
    {...props} />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

type AlertDialogTitleProps = React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  AlertDialogTitleProps
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title ref={ref} className={cn(componentStyles.modal.title, className)} {...props} />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

type AlertDialogDescriptionProps = React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  AlertDialogDescriptionProps
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn(componentStyles.modal.description, className)}
    {...props} />
))
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName

type AlertDialogActionProps = React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  AlertDialogActionProps
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants(), className)} {...props} />
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

type AlertDialogCancelProps = React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  AlertDialogCancelProps
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)}
    {...props} />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
