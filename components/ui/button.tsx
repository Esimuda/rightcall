import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs font-medium uppercase tracking-[0.14em] transition-colors disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        accent: "bg-accent text-ink hover:bg-text",
        ghost: "border border-line bg-transparent text-text hover:border-accent",
        support: "bg-support text-ink hover:bg-text",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3",
      },
    },
    defaultVariants: {
      variant: "accent",
      size: "default",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
