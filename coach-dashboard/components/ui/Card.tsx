import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
}

export function Card({ className, glow = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-surface border border-surface-highlight p-6 transition-all duration-150",
        glow && "hover:shadow-glow hover:border-primary/30",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
