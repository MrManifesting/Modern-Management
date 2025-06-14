import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-md hover:shadow-lg",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-blue-500 border-2 border-transparent",
        destructive: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500 border-2 border-transparent",
        outline: "border-2 border-blue-600 bg-transparent text-blue-600 hover:bg-blue-600 hover:text-white active:bg-blue-700 focus-visible:ring-blue-500 shadow-sm",
        secondary: "bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 focus-visible:ring-purple-500 border-2 border-transparent",
        ghost: "bg-white text-gray-800 border border-gray-300 hover:bg-gray-100 hover:border-gray-400 active:bg-gray-200 focus-visible:ring-gray-500 shadow-sm hover:shadow-md dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-500",
        link: "text-blue-600 underline-offset-4 hover:underline shadow-none focus-visible:ring-blue-500 border-2 border-transparent",
        success: "bg-green-600 text-white hover:bg-green-700 active:bg-green-800 focus-visible:ring-green-500 border-2 border-transparent",
        warning: "bg-yellow-500 text-gray-900 hover:bg-yellow-600 active:bg-yellow-700 focus-visible:ring-yellow-400 border-2 border-transparent font-bold",
      },
      size: {
        default: "h-10 px-4 py-2 min-h-[40px]",
        sm: "h-8 rounded-md px-3 text-xs min-h-[32px]",
        lg: "h-12 rounded-md px-8 text-base min-h-[48px]",
        icon: "h-10 w-10 min-h-[40px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
