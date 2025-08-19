
import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

const variantClasses = {
  default: 'bg-blue-500 text-white',
  secondary: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  destructive: 'bg-red-500 text-white',
  outline: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300',
};

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', ...props }) => {
  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantClasses[variant]} ${className || ''}`}
      {...props}
    />
  );
};
