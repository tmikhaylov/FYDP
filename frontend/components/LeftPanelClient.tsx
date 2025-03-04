"use client";

import { useState } from "react";
import { PanelLeftIcon } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import NewProjectButton from "@/components/NewProjectButton";

/**
 * Client component that:
 * - Manages the open/close state of the sidebar sheet.
 * - Receives `projects` from the server component.
 * - Renders the list of projects and a "New Project" button.
 */
export default function LeftPanelClient({
  projects,
}: {
  projects: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* SheetTrigger toggles the sidebar */}
      <SheetTrigger asChild>
        <div className="flex flex-row items-center gap-2 cursor-pointer">
          <PanelLeftIcon className="w-5 h-5 mt-1" />
          <span className="mt-1 sm:hidden flex">Menu</span>
        </div>
      </SheetTrigger>

      <SheetContent side="left" className="min-w-[390px] px-0">
        <div>
          <h3 className="px-7 text-xl font-semibold">Your Projects</h3>
          {/* Pass a callback to close the sheet after creating a project */}
          <NewProjectButton onProjectCreated={() => setOpen(false)} />

          <ScrollArea className="flex flex-col mt-7 items-start overflow-y-auto h-[90vh] pb-12">
            {projects.map((proj) => (
              <SheetClose asChild key={proj.id}>
                <Link
                  href={`/project/${proj.id}`}
                  className="w-full my-3 px-8 hover:underline underline-offset-2"
                >
                  {proj.name.length > 35
                    ? proj.name.slice(0, 35) + "..."
                    : proj.name}
                </Link>
              </SheetClose>
            ))}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
