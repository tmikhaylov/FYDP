"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./ui/button";
import { Loader2Icon, SendHorizonalIcon } from "lucide-react";
import React from "react";

// Allow an optional "disabled" prop from callers
type SubmitProps = {
  disabled?: boolean;
};

export default function Submit({ disabled = false }: SubmitProps) {
  // If you are using server actions, "pending" will be true while
  // the action is in flight. Otherwise, it's usually false.
  const { pending } = useFormStatus();

  // We treat the button as loading/disabled if either the server action is pending
  // or the parent explicitly wants us disabled
  const isLoading = pending || disabled;

  return (
    <Button
      type="submit"
      variant="secondary"
      size="icon"
      className="h-12 w-12"
      disabled={isLoading} // actually disable the button
    >
      {isLoading ? (
        // Show a spinner if loading
        <Loader2Icon className="w-5 h-5 animate-spin" />
      ) : (
        // Otherwise show a send icon
        <SendHorizonalIcon className="w-5 h-5" />
      )}
    </Button>
  );
}