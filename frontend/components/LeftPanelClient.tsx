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

type Project = {
  id: string;
  name: string;
};

export default function LeftPanelClient({
  projects: initialProjects,
}: {
  projects: Project[];
}) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>(initialProjects);

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
    } catch (error) {
      console.error(error);
      // You could show a toast or error message here
    }
  };

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
              <div
                key={proj.id}
                // A container that shows a shadow on hover and a background "box" behind the project
                className="group w-full my-3 px-8 py-2 rounded-md flex items-center justify-between transition-shadow hover:shadow-md hover:bg-gray-700"
              >
                {/* Clicking the project name navigates, and also closes the sheet */}
                <SheetClose asChild>
                  <Link
                    href={`/project/${proj.id}`}
                    className="truncate max-w-[70%] no-underline"
                  >
                    {proj.name.length > 35
                      ? proj.name.slice(0, 35) + "..."
                      : proj.name}
                  </Link>
                </SheetClose>

                {/* The options button, shown only on hover */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => {
                        // Prevent clicking this from triggering the Link
                        e.stopPropagation();
                      }}
                      className="text-gray-300 hover:text-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <SlOptions size={16} />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent>
                    <DropdownMenuItem
                      className="cursor-pointer text-red-500"
                      onClick={() => handleDeleteProject(proj.id)}
                    >
                      <RiDeleteBin5Line className="mr-2 h-4 w-4 text-red-500" />
                      Delete project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
