import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-md hover:shadow-lg",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus-visible:ring-blue-500",
        destructive: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500",
        outline: "border-2 border-blue-600 bg-transparent text-blue-600 hover:bg-blue-600 hover:text-white active:bg-blue-700 focus-visible:ring-blue-500",
        secondary: "bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 focus-visible:ring-purple-500",
        ghost: "text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-500 shadow-none dark:text-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-700",
        link: "text-blue-600 underline-offset-4 hover:underline shadow-none focus-visible:ring-blue-500",
        success: "bg-green-600 text-white hover:bg-green-700 active:bg-green-800 focus-visible:ring-green-500",
        warning: "bg-yellow-500 text-black hover:bg-yellow-600 active:bg-yellow-700 focus-visible:ring-yellow-400 dark:text-gray-900",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-10 w-10",
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
  loading?: boolean
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          loading && "opacity-75 cursor-not-allowed relative",
          "min-h-[40px] sm:min-h-[44px]" // Ensure touch targets are adequate
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin" />
          </div>
        )}
        <span className={loading ? "opacity-0" : ""}>{children}</span>
      </Comp>
    )
  }
)
EnhancedButton.displayName = "EnhancedButton"

export { EnhancedButton, buttonVariants }