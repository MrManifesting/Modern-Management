import React from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

interface SkeletonProps {
  shape?: "rectangle" | "circle" | "leaf";
  width?: string | number;
  height?: string | number;
  className?: string;
  animate?: boolean;
  style?: React.CSSProperties;
}

/**
 * Animated skeleton loader component with optional leaf shape
 */
export function Skeleton({
  shape = "rectangle",
  width,
  height,
  className,
  animate = true,
  style,
}: SkeletonProps) {
  // Define styles based on shape
  const baseStyles: React.CSSProperties = {
    width: width ?? "100%",
    height: height ?? (shape === "circle" ? width : "1rem"),
    ...style
  };

  const shapeClasses = {
    rectangle: "rounded-md",
    circle: "rounded-full",
    leaf: "leaf-shape" // Custom class for leaf shape
  };

  // If shape is leaf, render a leaf SVG
  if (shape === "leaf") {
    return (
      <div
        className={cn("relative overflow-hidden", className)}
        style={baseStyles}
      >
        {animate ? (
          <motion.div
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
            className="w-full h-full bg-gray-200 dark:bg-gray-700"
          >
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                className="fill-current text-primary/40"
                d="M50,0 C50,0 20,20 20,50 C20,75 35,90 50,100 C65,90 80,75 80,50 C80,20 50,0 50,0 Z"
              />
            </svg>
          </motion.div>
        ) : (
          <div className="w-full h-full bg-gray-200 dark:bg-gray-700">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                className="fill-current text-primary/40"
                d="M50,0 C50,0 20,20 20,50 C20,75 35,90 50,100 C65,90 80,75 80,50 C80,20 50,0 50,0 Z"
              />
            </svg>
          </div>
        )}
      </div>
    );
  }

  // Standard skeleton for rectangle and circle
  return (
    <div
      className={cn("bg-gray-200 dark:bg-gray-700", shapeClasses[shape], className)}
      style={baseStyles}
    >
      {animate && (
        <motion.div
          className="w-full h-full"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      )}
    </div>
  );
}

/**
 * Loading spinner with optional leaf animation
 */
export function LoadingSpinner({
  size = 40,
  color = "primary",
  useLeaf = true,
  className,
}: {
  size?: number;
  color?: "primary" | "secondary" | "accent" | "white";
  useLeaf?: boolean;
  className?: string;
}) {
  const colorClasses = {
    primary: "text-primary",
    secondary: "text-secondary",
    accent: "text-accent",
    white: "text-white",
  };

  if (useLeaf) {
    return (
      <div className={cn("relative", className)} style={{ width: size, height: size }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
          className={cn("w-full h-full", colorClasses[color])}
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
      </div>
    );
  }

  // Standard spinner
  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
        className={cn(
          "w-full h-full rounded-full border-4 border-t-transparent",
          {
            "border-primary": color === "primary",
            "border-secondary": color === "secondary", 
            "border-accent": color === "accent",
            "border-white": color === "white"
          }
        )}
      />
    </div>
  );
}

/**
 * Loading state for card components
 */
export function CardSkeleton() {
  return (
    <div className="space-y-3 p-4 border rounded-lg shadow-sm">
      <Skeleton height={20} width="70%" />
      <Skeleton height={14} className="mt-2" />
      <Skeleton height={14} />
      <div className="flex justify-between mt-4">
        <Skeleton width={60} height={30} />
        <Skeleton width={100} height={30} />
      </div>
    </div>
  );
}

/**
 * Table loading skeleton
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-3">
      <div className="flex gap-4 py-3 border-b">
        <Skeleton width={20} height={20} shape="circle" />
        <Skeleton width="30%" height={20} />
        <Skeleton width="20%" height={20} />
        <Skeleton width="20%" height={20} />
        <Skeleton width="20%" height={20} />
      </div>
      {Array(rows)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="flex gap-4 py-4">
            <Skeleton width={20} height={20} shape="circle" />
            <Skeleton width="30%" height={20} />
            <Skeleton width="20%" height={20} />
            <Skeleton width="20%" height={20} />
            <Skeleton width="20%" height={20} />
          </div>
        ))}
    </div>
  );
}

/**
 * Playful leaf loading animation
 */
export function LeafLoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center w-full py-10">
      <div className="flex items-center justify-center relative">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((rotation, i) => (
          <motion.div
            key={i}
            animate={{
              rotate: [rotation, rotation + 360],
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
            className="absolute w-10 h-10 text-primary/60"
            style={{ rotate: `${rotation}deg` }}
          >
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                className="fill-current"
                d="M50,10 C50,10 25,25 25,50 C25,70 35,85 50,90 C65,85 75,70 75,50 C75,25 50,10 50,10 Z"
              />
            </svg>
          </motion.div>
        ))}
        <div className="z-10 rounded-full bg-background w-12 h-12 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <svg
              viewBox="0 0 100 100"
              className="w-8 h-8 text-primary"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                className="fill-current"
                d="M50,0 C50,0 20,20 20,50 C20,75 35,90 50,100 C65,90 80,75 80,50 C80,20 50,0 50,0 Z"
              />
            </svg>
          </motion.div>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground animate-pulse">Loading inventory data...</p>
    </div>
  );
}

/**
 * Inventory item card skeleton
 */
export function InventoryItemSkeleton() {
  return (
    <div className="p-4 border rounded-lg shadow-sm space-y-3">
      <div className="flex items-center space-x-3">
        <Skeleton shape="leaf" width={40} height={40} />
        <div className="space-y-1 flex-1">
          <Skeleton height={20} />
          <Skeleton height={16} width="60%" />
        </div>
      </div>
      <div className="space-y-2 mt-3">
        <Skeleton height={16} />
        <Skeleton height={16} width="90%" />
        <div className="flex justify-between mt-3">
          <Skeleton width={80} height={24} />
          <Skeleton width={60} height={24} />
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <Skeleton width="33%" height={30} />
        <Skeleton width="33%" height={30} />
        <Skeleton width="33%" height={30} />
      </div>
    </div>
  );
}

/**
 * Dashboard loading skeleton with leaf animations
 */
export function DashboardLoadingSkeleton() {
  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton width={200} height={40} />
        <div className="flex gap-2">
          <Skeleton width={100} height={40} />
          <Skeleton width={100} height={40} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 border rounded-lg space-y-2">
            <Skeleton width={100} height={20} />
            <div className="flex items-end gap-2">
              <Skeleton width={60} height={30} />
              <Skeleton width={40} height={20} />
            </div>
            <Skeleton height={4} className="mt-3" />
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 border rounded-lg p-5 space-y-3">
          <Skeleton width={150} height={24} />
          <div className="h-[200px] w-full mt-4">
            <LeafLoadingAnimation />
          </div>
        </div>
        
        <div className="border rounded-lg p-5 space-y-3">
          <Skeleton width={150} height={24} />
          <div className="space-y-3 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Skeleton shape="leaf" width={24} height={24} />
                  <Skeleton width={100} height={16} />
                </div>
                <Skeleton width={60} height={16} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}