"use client";
import { useState } from "react";

export function ProjectFiles({
  projectId,
  files: initialFiles,
}: {
  projectId: string;
  files: { id: string; filename: string; upload_id?: string }[];
}) {
  const [showModal, setShowModal] = useState(false);
  const [fileList, setFileList] = useState(initialFiles);

  async function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("project_id", projectId);

      const res = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        alert(`Failed to upload file: ${file.name}`);
        continue;
      }
      const data = await res.json();

      const getRes = await fetch(`http://127.0.0.1:5000/get_filename/${data.upload_id}`);
      const getData = await getRes.json();
      const fileRecord = { id: data.upload_id, filename: getData.filename };

      // Update the database with the new file info
      const dbRes = await fetch(`/api/project/${projectId}/db-files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upload_id: data.upload_id, filename: getData.filename }),
      });
      if (!dbRes.ok) {
        alert(`Failed to update database for file: ${file.name}`);
        continue;
      }

      setFileList((prev) => [...prev, fileRecord]);
    }
  }

  async function handleDelete(fileId: string) {
    const confirmed = confirm("Are you sure you want to delete this file?");
    if (!confirmed) return;

    const res = await fetch("http://127.0.0.1:5000/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upload_id: fileId, project_id: projectId }),
    });
    if (!res.ok) {
      alert("Failed to delete file");
      return;
    }
    // Remove the file record from the database
    const dbRes = await fetch(`/api/project/${projectId}/db-files?fileId=${fileId}`, {
      method: "DELETE",
    });
    if (!dbRes.ok) {
      alert("Failed to update database");
      return;
    }
    setFileList((prev) => prev.filter((f) => f.id !== fileId));
  }

  return (
    <>
      <button
        type="button"
        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
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
              <div className="relative group">
                <button
                  onClick={() => setShowModal(false)}
                  className="text-red-500 text-xl"
                >
                  &times;
                </button>
                <span className="pointer-events-none absolute hidden group-hover:block -top-5 -right-4 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-[9999]">
                  Close
                </span>
              </div>
            </div>
            <div className="mb-4">
              <label className="px-4 py-2 bg-gray-200 dark:bg-blue-600 rounded cursor-pointer hover:bg-gray-300 dark:hover:bg-sky-500">
                Add files
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleAddFiles}
                  className="hidden"
                />
              </label>
            </div>
            <div className="max-h-60 pt-3 pr-2 overflow-y-auto custom-scrollbar">
              {fileList.map((f) => (
                <div
                  key={f.id}
                  className="flex justify-between items-center mb-2 bg-gray-100 dark:bg-gray-800 p-2 rounded"
                >
                  <span className="text-sm truncate max-w-[200px]">
                    {f.filename}
                  </span>
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => handleDelete(f.id)}
                      className="text-red-500 text-xl"
                    >
                      &times;
                    </button>
                    <span className="pointer-events-none absolute hidden group-hover:block -top-5 -right-4 bg-gray-700 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-[9999]">
                      Remove file from project
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
