// components/ui/input.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * If `multiline` is true, this component renders a <textarea> that
 * auto-expands up to ~7 lines (150px). It remains non-scrollable until
 * the content exceeds that maximum height, at which point it becomes scrollable.
 * Otherwise, it renders a normal <input>.
 */
export interface InputProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  multiline?: boolean;
}

const Input = React.forwardRef<HTMLTextAreaElement, InputProps>(
  ({ className, multiline, onInput, style, ...props }, ref) => {
    function handleAutoResize(e: React.FormEvent<HTMLTextAreaElement>) {
      const textarea = e.currentTarget;
      textarea.style.height = "auto";
      const newHeight = textarea.scrollHeight;
      const maxHeight = 150; // ~7 lines

      if (newHeight > maxHeight) {
        textarea.style.height = `${maxHeight}px`;
        textarea.style.overflowY = "auto";
      } else {
        textarea.style.height = `${newHeight}px`;
        textarea.style.overflowY = "hidden";
      }
      if (onInput) onInput(e);
    }

    // Single-line fallback
    if (!multiline) {
      const { rows, cols, ...inputProps } = props as any;
      return (
        <input
          ref={ref as any}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm " +
              "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium " +
              "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
              "focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...inputProps}
        />
      );
    }

    // Multi-line <textarea>
    return (
      <textarea
        ref={ref}
        rows={1}
        onInput={handleAutoResize}
        style={{
          height: "auto",
          overflowY: "hidden",
          ...style,
        }}
        className={cn(
          // Add "custom-scrollbar" so we can style the scrollbar
          "block w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm " +
            "ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 " +
            "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 " +
            "leading-normal max-h-[150px] custom-scrollbar",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };
