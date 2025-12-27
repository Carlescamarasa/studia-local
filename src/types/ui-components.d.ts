import * as React from 'react';

declare module '@/components/ui/button' {
    export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
        asChild?: boolean;
        variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
        size?: 'default' | 'sm' | 'lg' | 'icon';
    }
    export const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;
}

declare module '@/components/ui/input' {
    export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }
    export const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>;
}

declare module '@/components/ui/label' {
    export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> { }
    export const Label: React.ForwardRefExoticComponent<LabelProps & React.RefAttributes<HTMLLabelElement>>;
}

declare module '@/components/ui/textarea' {
    export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }
    export const Textarea: React.ForwardRefExoticComponent<TextareaProps & React.RefAttributes<HTMLTextAreaElement>>;
}

declare module '@/components/ui/slider' {
    export interface SliderProps extends React.ComponentPropsWithoutRef<typeof import('@radix-ui/react-slider').Root> {
        className?: string;
    }
    export const Slider: React.ForwardRefExoticComponent<SliderProps & React.RefAttributes<HTMLSpanElement>>;
}

declare module '@/components/ui/dialog' {
    export const Dialog: React.FC<React.ComponentProps<typeof import('@radix-ui/react-dialog').Root>>;
    export const DialogTrigger: React.FC<React.ComponentProps<typeof import('@radix-ui/react-dialog').Trigger>>;
    export const DialogContent: React.ForwardRefExoticComponent<React.ComponentPropsWithoutRef<typeof import('@radix-ui/react-dialog').Content> & React.RefAttributes<HTMLDivElement>>;
    export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>>;
    export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>>;
    export const DialogTitle: React.ForwardRefExoticComponent<React.ComponentPropsWithoutRef<typeof import('@radix-ui/react-dialog').Title> & React.RefAttributes<HTMLHeadingElement>>;
    export const DialogDescription: React.ForwardRefExoticComponent<React.ComponentPropsWithoutRef<typeof import('@radix-ui/react-dialog').Description> & React.RefAttributes<HTMLParagraphElement>>;
}

declare module '@/components/ui/toggle-group' {
    export const ToggleGroup: any;
    export const ToggleGroupItem: any;
}



declare module '@/components/ui/checkbox' {
    export interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof import('@radix-ui/react-checkbox').Root> {
        className?: string;
    }
    export const Checkbox: React.ForwardRefExoticComponent<CheckboxProps & React.RefAttributes<HTMLButtonElement>>;
}

declare module '@/components/ui/separator' {
    export interface SeparatorProps extends React.ComponentPropsWithoutRef<typeof import('@radix-ui/react-separator').Root> {
        className?: string;
        orientation?: 'horizontal' | 'vertical';
        decorative?: boolean;
    }
    export const Separator: React.ForwardRefExoticComponent<SeparatorProps & React.RefAttributes<HTMLDivElement>>;
}

declare module '@/components/ui/alert' {
    export const Alert: any;
    export const AlertTitle: any;
    export const AlertDescription: any;
}
