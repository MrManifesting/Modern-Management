import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import "./leaf-animations.css";

/**
 * Main leaf loader component
 */
interface LeafLoaderProps {
  size?: number | string;
  color?: string;
  className?: string;
  message?: string;
  variant?: "spinner" | "pulse" | "grow" | "bounce" | "wave" | "flower";
}

export function LeafLoader({
  size = 40,
  color = "primary",
  className,
  message,
  variant = "spinner",
}: LeafLoaderProps) {
  const sizeStyle = typeof size === "number" ? `${size}px` : size;
  
  // Map color string to Tailwind class
  const colorMap = {
    primary: "text-primary",
    secondary: "text-secondary",
    accent: "text-accent",
    success: "text-green-500",
    warning: "text-amber-500",
    danger: "text-red-500",
    info: "text-blue-500",
    white: "text-white",
  };
  
  // Use the color from the map or default to the provided color string
  const colorClass = colorMap[color as keyof typeof colorMap] || `text-${color}`;
  
  // Define motion variants based on selected animation type
  const variants = {
    spinner: {
      animate: { rotate: 360 },
      transition: { duration: 2, repeat: Infinity, ease: "linear" },
    },
    pulse: {
      animate: { scale: [0.9, 1.1, 0.9], opacity: [0.7, 1, 0.7] },
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
    },
    grow: {
      animate: { scale: [0, 1, 0.9, 1] },
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
    },
    bounce: {
      animate: { y: [0, -15, 0] },
      transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
    },
    wave: {
      animate: { rotate: [-10, 10, -10] },
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
      style: { transformOrigin: "bottom center" },
    },
    flower: {
      initial: { scale: 0, rotate: 0, opacity: 0 },
      animate: { scale: [0, 1.1, 1], rotate: [0, 180, 360], opacity: [0, 1, 1] },
      transition: { duration: 1.5, repeat: Infinity, repeatDelay: 0.5, ease: "easeOut" },
    },
  };
  
  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <motion.div
        {...variants[variant]}
        className={cn("leaf-shape", colorClass)}
        style={{ width: sizeStyle, height: sizeStyle }}
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
      
      {message && (
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="mt-3 text-sm text-muted-foreground"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}

/**
 * Leaf loading pattern component that shows multiple animated leaves
 */
export function LeafLoadingPattern({
  message = "Loading...",
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-6 w-full",
        className
      )}
    >
      <div className="relative w-40 h-40">
        {/* Background circle */}
        <div className="absolute inset-0 rounded-full bg-primary/5 flex items-center justify-center">
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-24 h-24 rounded-full bg-primary/10"
          />
        </div>
        
        {/* Outer spinning leaves */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((rotation, i) => (
          <motion.div
            key={i}
            initial={{ rotate: rotation, x: 0, y: 0 }}
            animate={{
              rotate: rotation + 360,
              x: Math.cos((rotation * Math.PI) / 180) * 50,
              y: Math.sin((rotation * Math.PI) / 180) * 50,
              scale: [0.8, 1, 0.8],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
            className="absolute w-8 h-8 text-primary/60 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
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
        
        {/* Center leaf */}
        <motion.div
          animate={{ rotate: 360, scale: [0.9, 1.1, 0.9] }}
          transition={{
            rotate: { duration: 3, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-primary z-10"
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
      
      {message && (
        <motion.p
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="mt-4 text-sm text-muted-foreground"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}

/**
 * Falling leaves animation component
 */
export function FallingLeaves({
  count = 10,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden w-full h-40", className)}>
      {Array.from({ length: count }).map((_, i) => {
        const randomLeft = Math.random() * 100;
        const randomDelay = Math.random() * 2;
        const randomDuration = 2 + Math.random() * 2;
        const randomSize = 15 + Math.random() * 20;
        
        return (
          <motion.div
            key={i}
            initial={{ y: -20, x: randomLeft, rotate: 0, opacity: 0 }}
            animate={{
              y: 200,
              x: randomLeft + (Math.random() > 0.5 ? 20 : -20),
              rotate: Math.random() > 0.5 ? 90 : -90,
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: randomDuration,
              delay: randomDelay,
              repeat: Infinity,
              ease: "easeIn",
            }}
            className="absolute text-primary/20"
            style={{ width: randomSize, height: randomSize }}
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
      })}
    </div>
  );
}

/**
 * Ring of leaves loading animation
 */
export function LeafLoadingRing({
  size = 120,
  leafCount = 8,
  message,
  className,
}: {
  size?: number;
  leafCount?: number;
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div 
        className="relative" 
        style={{ width: size, height: size }}
      >
        {Array.from({ length: leafCount }).map((_, i) => {
          const angle = (i * 360) / leafCount;
          const delay = i * (3 / leafCount);
          
          return (
            <motion.div
              key={i}
              initial={{ rotate: angle }}
              animate={{ rotate: angle + 360 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
                delay: delay,
              }}
              className="absolute top-0 left-1/2 origin-bottom"
              style={{
                width: size / 10,
                height: size / 3,
              }}
            >
              <motion.div
                animate={{ scale: [0.8, 1, 0.8] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-full h-full text-primary/70"
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
            </motion.div>
          );
        })}
        
        {/* Center leaf */}
        <motion.div
          animate={{ 
            rotate: 360,
            scale: [0.9, 1.1, 0.9]
          }}
          transition={{
            rotate: { duration: 6, repeat: Infinity, ease: "linear" },
            scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary"
          style={{ width: size / 4, height: size / 4 }}
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
      
      {message && (
        <motion.p
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="mt-4 text-sm text-muted-foreground"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}