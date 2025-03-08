"use client";

import { useState } from "react";
import { MdOutlineModeEdit } from "react-icons/md";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

type RenameProjectProps = {
  projectId: string;
  currentName: string;
};

export default function RenameProject({ projectId, currentName }: RenameProjectProps) {
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState(currentName);
  const router = useRouter();
  const { toast } = useToast();

  const handleUpdateProject = async () => {
    if (!newName.trim()) {
        toast({ title: "Error", description: "Project name cannot be empty" });
        return;
    }
    try {
      const res = await fetch(`/api/project/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update project");
      }
      // Close the modal and refresh the page data
      setShowModal(false);
      router.refresh();
    } catch (error: any) {
      console.error("Error updating project:", error.message);
      // Optionally, show a toast here
    }
  };

  return (
    <>
      {/* Edit icon button */}
      <button onClick={() => setShowModal(true)} className="text-gray-500 hover:text-gray-700">
        <MdOutlineModeEdit size={24} />
      </button>

      {/* Rename Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Modal backdrop */}
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-gray-900 border border-gray-300 dark:border-slate-700 rounded-lg shadow-lg p-4 w-80">
            <h2 className="text-lg font-semibold mb-2">Rename Project</h2>
            <Input
              placeholder="Enter new project name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleUpdateProject();
                }
              }}
            />
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => {
                  setShowModal(false);
                  setNewName(currentName);
                }}
                className="px-10 py-2 bg-gray-300 dark:bg-gray-500 rounded hover:bg-gray-200 dark:hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProject}
                className="px-10 py-2 bg-blue-600 text-white rounded hover:bg-sky-500"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
