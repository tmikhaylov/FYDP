"use client";

import { useState } from "react";
import { PanelLeftIcon } from "lucide-react";
import Link from "next/link";
import { SlOptions } from "react-icons/sl";
import { RiDeleteBin5Line } from "react-icons/ri";

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import NewProjectButton from "@/components/NewProjectButton";

/**
 * Simple classNames utility (if you have a preferred one, feel free to use it).
 */
function cn(...classes: (string | boolean | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Project = {
  id: string;
  name: string;
};

export default function LeftPanelClient({
  projects: initialProjects,
}: {
  projects: Project[];
}) {
  const [openSheet, setOpenSheet] = useState(false);
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  // Tracks which project's dropdown is open (null if none)
  const [openDropdownProjectId, setOpenDropdownProjectId] = useState<
    string | null
  >(null);

  // Function to delete a project from the DB and update local state
  const handleDeleteProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/project/${projectId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete project");
      }
      // Remove it from local state
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      // If that project's dropdown was open, close it
      if (openDropdownProjectId === projectId) {
        setOpenDropdownProjectId(null);
      }
    } catch (error) {
      console.error(error);
      // You could show a toast or error message here
    }
  };

  return (
    <Sheet open={openSheet} onOpenChange={setOpenSheet}>
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
          <NewProjectButton onProjectCreated={() => setOpenSheet(false)} />

          <ScrollArea className="flex flex-col mt-7 items-start overflow-y-auto h-[90vh] pb-12">
            {projects.map((proj) => {
              const isDropdownOpen = openDropdownProjectId === proj.id;

              return (
                // Wrap the entire row in a Link so the whole row is clickable.
                <SheetClose asChild key={proj.id}>
                  <Link
                    href={`/project/${proj.id}`}
                    className={cn(
                      "group w-full my-3 px-8 py-2 rounded-md flex items-center justify-between transition-shadow",
                      isDropdownOpen
                        ? "shadow-md bg-gray-700"
                        : "hover:shadow-md hover:bg-gray-700"
                    )}
                  >
                    {/* Project name */}
                    <span className="truncate max-w-[70%] no-underline text-inherit">
                      {proj.name.length > 35
                        ? proj.name.slice(0, 35) + "..."
                        : proj.name}
                    </span>

                    {/* The options button, shown only on hover or if dropdown is open */}
                    <DropdownMenu
                      open={isDropdownOpen}
                      onOpenChange={(open) => {
                        // If opening, set this project as open
                        // If closing, set to null
                        setOpenDropdownProjectId(open ? proj.id : null);
                      }}
                    >
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => {
                            // Prevent this click from navigating to the project
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className={cn(
                            "text-gray-300 hover:text-gray-100 transition-opacity",
                            isDropdownOpen
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          )}
                        >
                          <SlOptions size={16} />
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent>
                        <DropdownMenuItem
                          className="cursor-pointer text-red-500"
                          onClick={(e) => {
                            // Prevent this click from navigating to the project
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteProject(proj.id);
                          }}
                        >
                          <RiDeleteBin5Line className="mr-2 h-4 w-4 text-red-500" />
                          Delete project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Link>
                </SheetClose>
              );
            })}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
