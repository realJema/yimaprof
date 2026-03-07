import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
};

export function Logo({ size = 'md', className }: LogoProps) {
  return (
    <span className={cn('font-bold tracking-tight', sizeClasses[size], className)}>
      <span className="text-foreground">Yima</span>
      <span className="text-secondary italic font-extrabold">prof</span>
    </span>
  );
}
