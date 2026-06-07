import { cva } from 'class-variance-authority'

export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[--color-primary] text-[--color-primary-foreground]',
        secondary: 'border-transparent bg-[--color-secondary] text-[--color-secondary-foreground]',
        destructive: 'border-transparent bg-[--color-destructive] text-[--color-destructive-foreground]',
        outline: 'text-[--color-foreground]',
        success: 'border-transparent bg-green-500 text-white',
        warning: 'border-transparent bg-yellow-500 text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)
