/**
 * IconButton — Primary action button with animated arrow icon.
 * Based on 21st.dev "button with animated arrow" component.
 * Uses cva for variants, ArrowRight from lucide-react.
 * Styled with brand tokens from tailwind.config.js.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowRight } from "lucide-react";
import { cn } from "../../lib/utils";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 group",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-white hover:bg-ink/90 shadow-sm",
        secondary:
          "border border-brand-blue text-brand-blue hover:bg-brand-blue/5 shadow-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  label: string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, label, disabled, type = "button", ...props }, ref) => {
    return (
      <button
        className={cn(iconButtonVariants({ variant, className }))}
        ref={ref}
        disabled={disabled}
        type={type}
        {...props}
      >
        {label}
        <ArrowRight
          className="-me-1 ms-2 opacity-60 transition-transform group-hover:translate-x-0.5"
          size={16}
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

export { IconButton, iconButtonVariants };

export default IconButton;