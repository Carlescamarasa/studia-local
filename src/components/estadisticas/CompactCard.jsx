import React from "react";
import { cn } from "@/lib/utils";
import { componentStyles } from "@/design/componentStyles";

/**
 * CompactCard - Compact wrapper for content sections
 * 
 * @param {Object} props
 * @param {string|React.ReactNode} props.title - Card title
 * @param {React.ReactNode} props.titleRight - Optional element aligned to the right of title
 * @param {React.ReactNode} props.children - Card content
 * @param {string} props.className - Additional classes
 */
export default function CompactCard({
    title,
    titleRight,
    children,
    className,
}) {
    return (
        <div className={cn(
            componentStyles.containers.cardBase,
            "px-3 sm:px-4 pt-3 sm:pt-4 pb-2",
            className
        )}>
            {(title || titleRight) && (
                <div className="flex items-center justify-between gap-2 mb-2">
                    {title && (
                        <h3 className="text-sm sm:text-base font-semibold text-[var(--color-text-primary)]">
                            {title}
                        </h3>
                    )}
                    {titleRight && (
                        <div className="flex-shrink-0">
                            {titleRight}
                        </div>
                    )}
                </div>
            )}
            {children}
        </div>
    );
}
