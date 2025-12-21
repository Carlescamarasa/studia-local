import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useMobileStrict } from '@/hooks/useMobileStrict';

/**
 * WizardModal
 * Modal genérico para procesos de múltiples pasos
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {string} props.title
 * @param {number} props.currentStep step index (1-based)
 * @param {number} props.totalSteps
 * @param {string} props.stepLabel optional label for current step
 * @param {Function} props.onBack optional back handler
 * @param {React.ReactNode} props.children
 */
export default function WizardModal({
    isOpen,
    onClose,
    title,
    currentStep,
    totalSteps,
    stepLabel,
    onBack,
    children,
    className
}) {
    const isMobile = useMobileStrict();

    // Shared Content Component to avoid duplication
    const ModalInnerContent = ({ isDrawer }) => (
        <>
            {/* Header */}
            <div className={cn(
                "border-b border-[var(--color-border-default)] flex items-center justify-between bg-[var(--color-surface-elevated)]",
                isDrawer ? "px-4 py-3" : "px-6 py-4"
            )}>
                <div className="flex items-center gap-3">
                    {onBack && currentStep > 1 && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 -ml-2"
                            onClick={onBack}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                    )}
                    <div>
                        {isDrawer ? (
                            <DrawerTitle className="text-lg font-semibold">{title}</DrawerTitle>
                        ) : (
                            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
                        )}
                        {stepLabel && (
                            <p className="text-xs text-[var(--color-text-secondary)]">{stepLabel}</p>
                        )}
                    </div>
                </div>
                {/* Steps Indicator */}
                {totalSteps > 1 && (
                    <div className="flex items-center gap-1.5">
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "h-1.5 rounded-full transition-all duration-300",
                                    i + 1 === currentStep ? "w-6 bg-[var(--color-primary)]" :
                                        i + 1 < currentStep ? "w-1.5 bg-[var(--color-primary)] opacity-50" :
                                            "w-1.5 bg-[var(--color-border-default)]"
                                )}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className={cn(
                "overflow-y-auto",
                isDrawer ? "max-h-[80vh] p-4 pb-8" : "max-h-[70vh] p-6"
            )}>
                {children}
            </div>
        </>
    );

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={onClose}>
                <DrawerContent className={cn("bg-[var(--color-surface-card)] outline-none", className)}>
                    <ModalInnerContent isDrawer={true} />
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className={cn(
                    "max-w-2xl p-0 gap-0 overflow-hidden", // Reset default padding
                    "bg-[var(--color-surface-card)]",
                    className
                )}
                style={{
                    borderRadius: 'var(--radius-modal)',
                    boxShadow: 'var(--shadow-xl)'
                }}
            >
                <ModalInnerContent isDrawer={false} />
            </DialogContent>
        </Dialog>
    );
}
