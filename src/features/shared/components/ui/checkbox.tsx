
import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef<
    React.ElementRef<typeof CheckboxPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => {
    // Filter out 'indeterminate' prop to prevent React warning when passed to the underlying button element
    // @ts-ignore
    const { indeterminate, ...rest } = props;

    return (
        <CheckboxPrimitive.Root
            ref={ref}
            className={cn(
                "peer h-5 w-5 shrink-0 border-2 border-[var(--color-border-default)] bg-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[hsl(var(--brand-500))] data-[state=checked]:text-white data-[state=checked]:border-[hsl(var(--brand-500))] shadow-[var(--shadow-card)]",
                "rounded-[var(--radius-ctrl)]",
                className
            )}
            {...rest}
        >
            <CheckboxPrimitive.Indicator
                className={cn("flex items-center justify-center text-current")}
            >
                <Check className="h-3.5 w-3.5 stroke-[3]" />
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    );
})
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
