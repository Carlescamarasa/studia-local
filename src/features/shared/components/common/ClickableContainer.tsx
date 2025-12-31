import React from "react";

interface ClickableContainerProps {
  onActivate: (e: React.MouseEvent | React.KeyboardEvent) => void;
  className?: string;
  children: React.ReactNode;
  expanded?: boolean;
  ariaLabel?: string;
}

export default function ClickableContainer({
  onActivate,
  className = "",
  children,
  expanded,
  ariaLabel
}: ClickableContainerProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate(e);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={className}
      onClick={onActivate}
      onKeyDown={handleKeyDown}
      aria-expanded={expanded !== undefined ? expanded : undefined}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}