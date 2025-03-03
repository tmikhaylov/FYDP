// components/NewProjectButton.tsx
"use client";
import { IoMdAddCircleOutline } from "react-icons/io";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectButton() {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const router = useRouter();

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      const res = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert("Error: " + err.error);
        return;
      }
      const data = await res.json();
      const projectId = data.project.id;
      // Call backend /create_project API
      const backendRes = await fetch("http://127.0.0.1:5000/create_project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });
      if (!backendRes.ok) {
        const err = await backendRes.json();
        alert("Backend Error: " + err.error);
        return;
      }
      router.push(`/project/${projectId}`);
    } catch (error: any) {
      alert(error.message);
    }
  }

  return (
    <div className="px-7 mt-2">
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1 text-sm text-gray-400 px-2 py-1 rounded hover:bg-gray-700 hover:text-white transition-colors"
      >
        New project
        <IoMdAddCircleOutline className="w-5 h-5" />
      </button>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Create a new project</h2>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              className="w-full mb-4 p-2 rounded border dark:bg-gray-800 dark:text-white"
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-800">
                Cancel
              </button>
              <button type="button" onClick={handleCreate} className="px-3 py-1 bg-sky-500 text-white rounded">
                Create project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
