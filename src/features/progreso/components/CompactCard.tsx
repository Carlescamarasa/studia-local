import React from "react";
import { cn } from "@/lib/utils";
import { componentStyles } from "@/design/componentStyles";

/**
 * CompactCard - Compact wrapper for content sections
 */
export interface CompactCardProps {
    title?: string | React.ReactNode;
    titleRight?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export default function CompactCard({
    title,
    titleRight,
    children,
    className,
}: CompactCardProps) {
    return (
        <div className={cn(
            componentStyles.containers.cardBase,
            className
        )}>
            <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
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
        </div>
    );
}
