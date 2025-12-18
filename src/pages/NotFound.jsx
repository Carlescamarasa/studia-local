import React from 'react';
import { Card, CardContent } from '@/components/ds';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { componentStyles } from '@/design/componentStyles';

const NotFound = () => {
    const handleGoBack = () => {
        window.history.back();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className={`max-w-2xl w-full ${componentStyles.containers.cardBase} border-[var(--color-danger)]`}>
                <CardContent className="pt-6 text-center space-y-6">
                    <div className="flex justify-center">
                        <AlertCircle className="text-[var(--color-danger)] w-16 h-16" />
                    </div>

                    <div>
                        <h2 className={`${componentStyles.typography.sectionTitle} mb-2`}>
                            Página no encontrada
                        </h2>
                        <p className={componentStyles.typography.bodyText}>
                            Lo sentimos, la página que buscas no existe o ha sido movida.
                        </p>
                    </div>

                    <div className="flex justify-center">
                        <Button
                            onClick={handleGoBack}
                            variant="outline"
                            className={`${componentStyles.buttons.outline} gap-2`}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Volver
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default NotFound;
