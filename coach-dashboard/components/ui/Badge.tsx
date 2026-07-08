import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'green' | 'amber' | 'red' | 'default';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    green: "bg-green-500/10 text-green-400 border border-green-500/20",
    amber: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border border-red-500/20",
    default: "bg-surface-highlight text-gray-300 border border-white/10",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
