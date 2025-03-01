"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";

export default function ToggleTheme() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only render once the theme is known (avoids mismatches on SSR).
  if (!mounted) return null;

  return (
    <>
      {theme === "light" ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme("dark")}
          aria-label="Switch to dark theme"
        >
          <MoonIcon className="w-5 h-5" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme("light")}
          aria-label="Switch to light theme"
        >
          <SunIcon className="w-5 h-5" />
        </Button>
      )}
    </>
  );
}
