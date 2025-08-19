
import React from 'react';

const selectBaseClasses = "flex h-10 w-full items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    onValueChange?: (value: string) => void;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, onValueChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        if (onValueChange) {
            onValueChange(event.target.value);
        }
        if (props.onChange) {
            props.onChange(event);
        }
    };
    return (
        <div className="relative">
            <select className={`${selectBaseClasses} appearance-none ${className || ''}`} ref={ref} {...props} onChange={handleChange}>{children}</select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
        </div>
    );
});
Select.displayName = 'Select';

export const SelectTrigger: React.FC<{children: React.ReactNode, className?: string}> = ({className, children}) => <div className={`${selectBaseClasses} ${className || ''}`}>{children}</div>;
export const SelectValue: React.FC<{children?: React.ReactNode}> = ({children}) => <>{children}</>;
export const SelectContent: React.FC<{children: React.ReactNode, className?: string}> = ({className, children}) => <>{children}</>;
export const SelectItem = React.forwardRef<HTMLOptionElement, React.OptionHTMLAttributes<HTMLOptionElement>>(({className, ...props}, ref) => <option ref={ref} className={`bg-white dark:bg-gray-700 ${className || ''}`} {...props} />);
SelectItem.displayName = 'SelectItem';
