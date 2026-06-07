import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[--color-primary] text-[--color-primary-foreground] hover:opacity-90',
        destructive: 'bg-[--color-destructive] text-[--color-destructive-foreground] hover:opacity-90',
        outline: 'border border-[--color-border] bg-transparent hover:bg-[--color-accent] hover:text-[--color-accent-foreground]',
        secondary: 'bg-[--color-secondary] text-[--color-secondary-foreground] hover:opacity-80',
        ghost: 'hover:bg-[--color-accent] hover:text-[--color-accent-foreground]',
        link: 'text-[--color-primary] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)
