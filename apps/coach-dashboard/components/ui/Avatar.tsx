import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  initials: string;
  colorClass?: string;
}

export function Avatar({ initials, colorClass = "bg-primary text-black", className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-md",
        colorClass,
        className
      )}
      {...props}
    >
      {initials}
    </div>
  );
}
