import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    interactive?: boolean;
}

export const Card: React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>>;

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;
export const CardHeader: React.FC<CardHeaderProps>;

export type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;
export const CardTitle: React.FC<CardTitleProps>;

export type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;
export const CardDescription: React.FC<CardDescriptionProps>;

export type CardContentProps = React.HTMLAttributes<HTMLDivElement>;
export const CardContent: React.FC<CardContentProps>;

export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;
export const CardFooter: React.FC<CardFooterProps>;
