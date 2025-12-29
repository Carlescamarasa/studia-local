import React, { Suspense } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { LoadingSpinner } from '@/features/shared/components/ds';

const DefaultFallback = () => (
    <div className="flex items-center justify-center py-12 min-h-[300px]">
        <LoadingSpinner size="lg" text="Cargando contenido..." />
    </div>
);

/**
 * TabBoundary
 * Unifies ErrorBoundary and Suspense for tab content.
 * Should be used to wrap individual tab renders.
 * 
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.fallback] - Custom loading fallback
 */
export default function TabBoundary({ children, fallback }) {
    return (
        <ErrorBoundary variant="compact">
            <Suspense fallback={fallback || <DefaultFallback />}>
                {children}
            </Suspense>
        </ErrorBoundary>
    );
}
