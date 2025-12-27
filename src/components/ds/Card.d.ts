import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    interactive?: boolean;
}

export const Card: React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>>;

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> { }
export const CardHeader: React.FC<CardHeaderProps>;

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> { }
export const CardTitle: React.FC<CardTitleProps>;

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> { }
export const CardDescription: React.FC<CardDescriptionProps>;

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> { }
export const CardContent: React.FC<CardContentProps>;

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> { }
export const CardFooter: React.FC<CardFooterProps>;
