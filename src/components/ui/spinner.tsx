import * as React from "react"
import { Loader2 } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const spinnerVariants = cva(
  "animate-spin",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        default: "h-6 w-6",
        lg: "h-8 w-8",
        xl: "h-12 w-12"
      },
      variant: {
        default: "text-muted-foreground",
        primary: "text-primary",
        secondary: "text-secondary-foreground",
        destructive: "text-destructive"
      }
    },
    defaultVariants: {
      size: "default",
      variant: "default"
    }
  }
)

interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string
}

function Spinner({ size, variant, className }: SpinnerProps) {
  return (
    <Loader2 
      className={cn(spinnerVariants({ size, variant }), className)} 
    />
  )
}

interface LoadingSpinnerProps extends SpinnerProps {
  text?: string
  center?: boolean
  fullScreen?: boolean
}

function LoadingSpinner({ 
  text = "Loading...", 
  center = true, 
  fullScreen = false,
  size = "lg",
  variant = "primary",
  className 
}: LoadingSpinnerProps) {
  const containerClasses = cn(
    "flex items-center gap-3",
    {
      "justify-center": center,
      "min-h-[200px]": !fullScreen && center,
      "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 justify-center": fullScreen
    },
    className
  )

  return (
    <div className={containerClasses}>
      <Spinner size={size} variant={variant} />
      {text && (
        <span className="text-sm font-medium text-muted-foreground">
          {text}
        </span>
      )}
    </div>
  )
}

// Enterprise-level skeleton loader for tables/lists
function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
          <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
          </div>
          <div className="h-8 w-20 bg-muted rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

// Card skeleton for grid layouts
function CardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border rounded-lg p-6 space-y-4">
          <div className="h-6 bg-muted rounded animate-pulse w-3/4" />
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
          </div>
          <div className="flex justify-between items-center">
            <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
            <div className="h-8 w-16 bg-muted rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

export { 
  Spinner, 
  LoadingSpinner, 
  TableSkeleton, 
  CardSkeleton,
  spinnerVariants 
}
