import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ds';

/**
 * SeedCard - Reusable card component for seed actions
 */
export default function SeedCard({ icon: Icon, title, description, children, variant = 'default' }) {
    const variantStyles = {
        default: 'border-[var(--color-border-default)]',
        info: 'border-[var(--color-info)]/30 bg-[var(--color-info)]/5',
        warning: 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5',
        success: 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5',
    };

    return (
        <Card className={`app-card ${variantStyles[variant]}`}>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    {Icon && <Icon className="w-5 h-5" />}
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {description && (
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        {description}
                    </p>
                )}
                {children}
            </CardContent>
        </Card>
    );
}
