import * as React from "react";

import { cn } from "./utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    showThumbCount?: boolean;
    thumbCount?: number;
    thumbIcon?: React.ReactNode;
    serveTime?: number;
  }
>(({ className, showThumbCount, thumbCount, thumbIcon, serveTime, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className,
    )}
    {...props}
  >
    {children}
    {showThumbCount && (
      <>
        {/* Dotted line separator overlaid on image */}
        <div className="absolute bottom-8 left-0 right-0 h-px border-b border-dotted border-white/30"></div>
        
        {/* Blur overlay for bottom section - no background color, just blur */}
        <div className="absolute bottom-0 left-0 right-0 h-8 backdrop-blur-sm"></div>
        
        {/* Stats element at bottom */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-2 px-3">
          <div className="flex items-center gap-1">
            {thumbIcon}
            <span className="text-xs text-white font-medium">
              {thumbCount || '0'}
            </span>
          </div>
          {serveTime !== undefined && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-white/80 font-medium">
                {Math.round(serveTime)}s
              </span>
            </div>
          )}
        </div>
      </>
    )}
  </div>
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
