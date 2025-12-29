import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'default';
    className?: string;
    children?: React.ReactNode;
}

declare const Badge: React.FC<BadgeProps>;
export default Badge;
