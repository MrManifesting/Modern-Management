import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { LeafLoadingPattern, LeafLoadingRing, FallingLeaves } from "./leaf-loader";

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  variant?: "full" | "partial" | "minimal";
  blur?: boolean;
  timeout?: number;
  className?: string;
  animation?: "pattern" | "ring" | "falling";
  children?: React.ReactNode;
}

/**
 * Loading overlay component with leaf animations
 * - full: covers the entire viewport
 * - partial: covers only the parent container
 * - minimal: shows a small loading indicator
 */
export function LoadingOverlay({
  isLoading,
  message = "Loading...",
  variant = "partial",
  blur = true,
  timeout = 300,
  className,
  animation = "pattern",
  children,
}: LoadingOverlayProps) {
  const [showLoader, setShowLoader] = React.useState(false);
  
  // Add a small delay before showing the loader to avoid flashing
  // for very short loading states
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isLoading) {
      timer = setTimeout(() => {
        setShowLoader(true);
      }, timeout);
    } else {
      setShowLoader(false);
    }
    
    return () => {
      clearTimeout(timer);
    };
  }, [isLoading, timeout]);
  
  const getAnimation = () => {
    switch (animation) {
      case "pattern":
        return <LeafLoadingPattern message={message} />;
      case "ring":
        return <LeafLoadingRing message={message} />;
      case "falling":
        return (
          <div className="flex flex-col items-center justify-center">
            <FallingLeaves count={15} />
            <motion.p
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="mt-4 text-sm text-muted-foreground"
            >
              {message}
            </motion.p>
          </div>
        );
      default:
        return <LeafLoadingPattern message={message} />;
    }
  };
  
  // Different styles based on variant
  const overlayStyles = {
    full: "fixed inset-0 z-50",
    partial: "absolute inset-0 z-40",
    minimal: "flex items-center justify-center",
  };
  
  // Only render children when not minimal
  const shouldRenderChildren = variant !== "minimal";
  
  return (
    <div className={cn("relative", className)}>
      <AnimatePresence>
        {showLoader && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              overlayStyles[variant],
              blur ? "backdrop-blur-sm" : "",
              "flex items-center justify-center bg-background/80 dark:bg-background/90"
            )}
          >
            <div className="p-6 rounded-lg max-w-md mx-auto">
              {getAnimation()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Only render children for full/partial overlays */}
      {shouldRenderChildren ? (
        <div
          className={cn(
            isLoading ? "opacity-50 pointer-events-none select-none" : ""
          )}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

/**
 * Page level loading component that shows a full-screen leaf animation
 */
export function PageLoading({
  message = "Loading page content...",
  animation = "pattern",
}: {
  message?: string;
  animation?: "pattern" | "ring" | "falling";
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-background">
      {animation === "pattern" && <LeafLoadingPattern message={message} />}
      {animation === "ring" && <LeafLoadingRing message={message} />}
      {animation === "falling" && (
        <div className="flex flex-col items-center justify-center">
          <FallingLeaves count={20} className="h-60" />
          <motion.p
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-muted-foreground"
          >
            {message}
          </motion.p>
        </div>
      )}
    </div>
  );
}

/**
 * Button loading state with leaf animation
 */
export function ButtonLoading({
  className,
  size = 20,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      className={cn("text-current", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          className="fill-current"
          d="M50,0 C50,0 20,20 20,50 C20,75 35,90 50,100 C65,90 80,75 80,50 C80,20 50,0 50,0 Z"
        />
      </svg>
    </motion.div>
  );
}

/**
 * Inline loading indicator
 */
export function InlineLoading({ 
  message, 
  className 
}: { 
  message?: string; 
  className?: string 
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="text-primary w-4 h-4"
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className="fill-current"
            d="M50,0 C50,0 20,20 20,50 C20,75 35,90 50,100 C65,90 80,75 80,50 C80,20 50,0 50,0 Z"
          />
        </svg>
      </motion.div>
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
    </div>
  );
}