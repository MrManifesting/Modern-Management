import * as React from "react";
import { CheckIcon } from "@radix-ui/react-icons";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const stepVariants = cva(
  "flex min-h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-background text-center font-medium transition-colors",
  {
    variants: {
      active: {
        true: "border-blue-600 text-blue-600",
        false: "",
      },
      completed: {
        true: "border-blue-600 bg-blue-600 text-white",
        false: "",
      },
    },
    defaultVariants: {
      active: false,
      completed: false,
    },
  }
);

interface StepsProps
  extends React.ComponentPropsWithoutRef<"div"> {
  value: number;
}

interface StepProps extends React.ComponentPropsWithoutRef<"div"> {
  value: number;
}

const Steps = React.forwardRef<
  HTMLDivElement,
  StepsProps
>(({ value, className, children, ...props }, ref) => {
  // Count valid Step children
  const childrenArray = React.Children.toArray(children) as React.ReactElement[];
  const steps = childrenArray.filter(
    (child) => React.isValidElement(child) && child.type === Step
  );

  return (
    <div
      ref={ref}
      className={cn("flex w-full items-center gap-2", className)}
      {...props}
    >
      {React.Children.map(steps, (step, index) => {
        if (!React.isValidElement(step)) {
          return null;
        }

        const stepValue = step.props.value as number;
        const isActive = value === stepValue;
        const isCompleted = value > stepValue;

        // Clone the step element with additional props
        return React.cloneElement(step, {
          active: isActive,
          completed: isCompleted,
          isLast: index === steps.length - 1,
        });
      })}
    </div>
  );
});
Steps.displayName = "Steps";

const Step = React.forwardRef<
  HTMLDivElement,
  StepProps & VariantProps<typeof stepVariants> & { active?: boolean; completed?: boolean; isLast?: boolean }
>(({ value, active, completed, isLast, className, children, ...props }, ref) => {
  const childrenArray = React.Children.toArray(children);
  const stepTitle = childrenArray.find(
    (child) => React.isValidElement(child) && child.type === StepTitle
  ) as React.ReactElement;
  const stepDescription = childrenArray.find(
    (child) => React.isValidElement(child) && child.type === StepDescription
  ) as React.ReactElement;

  return (
    <div className="flex flex-1 flex-col gap-1">
      <div className="flex items-center">
        <div
          ref={ref}
          className={cn(stepVariants({ active, completed, className }))}
          data-state={active ? "active" : completed ? "completed" : "waiting"}
          {...props}
        >
          {completed ? <CheckIcon className="h-4 w-4" /> : value + 1}
        </div>
        {!isLast && (
          <div 
            className={cn(
              "h-1 flex-1 bg-gray-200 mx-2 rounded-full",
              (active || completed) && "bg-blue-600"
            )}
          />
        )}
      </div>

      <div className="flex flex-col">
        {stepTitle}
        {stepDescription}
      </div>
    </div>
  );
});
Step.displayName = "Step";

const StepTitle = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<"p">
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm font-medium", className)} {...props} />
));
StepTitle.displayName = "StepTitle";

const StepDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<"p">
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-muted-foreground", className)}
    {...props}
  />
));
StepDescription.displayName = "StepDescription";

export { type StepsProps, type StepProps, Steps, Step, StepTitle, StepDescription };