import React from "react";

export default function ClickableContainer({ 
  onActivate, 
  className = "", 
  children, 
  expanded,
  ariaLabel 
}) {
  const handleKeyDown = (e) => {
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