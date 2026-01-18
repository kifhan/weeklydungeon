import React, { useState } from 'react';

interface CollapsibleProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export const Collapsible: React.FC<CollapsibleProps> = ({ open, onOpenChange, children, className }) => {
  const [isOpen, setIsOpen] = useState(open || false);

  const handleOpenChange = () => {
    const newValue = !isOpen;
    setIsOpen(newValue);
    if (onOpenChange) {
      onOpenChange(newValue);
    }
  };
  
  const controlledIsOpen = open !== undefined ? open : isOpen;

  return (
    <div className={className}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            // @ts-ignore
            isOpen: controlledIsOpen, 
            onToggle: handleOpenChange 
          });
        }
        return child;
      })}
    </div>
  );
};

interface CollapsibleTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

export const CollapsibleTrigger: React.FC<CollapsibleTriggerProps> = ({ children, asChild, onToggle }) => {
  const Component = asChild ? React.Fragment : 'div';
  const child = React.Children.only(children);

  return (
    <Component>
      {React.cloneElement(child as React.ReactElement<{ onClick?: () => void }>, { onClick: onToggle })}
    </Component>
  );
};

interface CollapsibleContentProps {
  children: React.ReactNode;
  isOpen?: boolean;
  className?: string;
}

export const CollapsibleContent: React.FC<CollapsibleContentProps> = ({ children, isOpen, className }) => {
  return isOpen ? <div className={className}>{children}</div> : null;
};
