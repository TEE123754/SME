import { Slot } from '@radix-ui/react-slot';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

// Local shadcn-style primitive using Radix Slot; no remote component generator.
export function Button({
  asChild = false,
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const Component = asChild ? Slot : 'button';
  return <Component className={cn('button', `button-${variant}`, className)} {...props} />;
}
