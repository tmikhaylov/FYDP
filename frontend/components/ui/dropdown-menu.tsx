"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

/**
 * If you already have a `cn` (class name merging) utility in your project,
 * import and use that instead.
 */
function cn(...classes: (string | boolean | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

/**
 * A wrapper around Radix's DropdownMenu.Content with some basic Tailwind styling.
 */
export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-zinc-200 dark:bg-zinc-700 p-1 shadow-md",
          "animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
});
DropdownMenuContent.displayName = "DropdownMenuContent";

/**
 * A basic dropdown menu item (clickable).
 */
export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm text-gray-700 outline-none",
        "hover:bg-zinc-300 dark:hover:bg-zinc-800 focus:bg-zinc-300",
        className
      )}
      {...props}
    />
  );
});
DropdownMenuItem.displayName = "DropdownMenuItem";
