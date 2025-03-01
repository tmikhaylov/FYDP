"use client";

import { useState } from "react";
import { ProjectFile } from "@prisma/client";

export function ProjectFiles({
  projectId,
  files,
}: {
  projectId: string;
  files: ProjectFile[];
}) {
  const [showModal, setShowModal] = useState(false);
  const [fileList, setFileList] = useState(files);

  async function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    const res = await fetch(`/api/project/${projectId}/files`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      alert("Failed to upload file");
      return;
    }
    const data = await res.json();
    setFileList((prev) => [...prev, data.file]);
  }

  async function handleDelete(fileId: string) {
    const confirmed = confirm("Are you sure you want to delete this file?");
    if (!confirmed) return;
    const res = await fetch(`/api/project/${projectId}/files?fileId=${fileId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert("Failed to delete file");
      return;
    }
    setFileList((prev) => prev.filter((f) => f.id !== fileId));
  }

  return (
    <>
      <button
        type="button"
        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
        onClick={() => setShowModal(true)}
      >
        Project files
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Project files</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-red-500 text-xl"
              >
                &times;
              </button>
            </div>
            <div className="mb-4">
              <label className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded cursor-pointer">
                Add files
                <input type="file" onChange={handleAddFiles} className="hidden" />
              </label>
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {fileList.map((f) => (
                <div
                  key={f.id}
                  className="flex justify-between items-center mb-2 bg-gray-100 dark:bg-gray-800 p-2 rounded"
                >
                  <span className="text-sm truncate max-w-[200px]">
                    {f.filename}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(f.id)}
                    className="text-red-500 text-xl"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
