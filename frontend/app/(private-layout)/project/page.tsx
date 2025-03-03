"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProjectPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCreateProject() {
    console.log("handleCreateProject was called!");
    if (!name.trim()) return;
    setLoading(true);
    try {
      // 1) Create in DB
      const dbRes = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!dbRes.ok) {
        const err = await dbRes.json();
        alert("DB Error: " + err.error);
        setLoading(false);
        return;
      }
      const dbData = await dbRes.json();
      const projectId = dbData.project.id;

      // 2) Create in backend
      const backendRes = await fetch("http://127.0.0.1:5000/create_project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });
      if (!backendRes.ok) {
        const err = await backendRes.json();
        alert("Backend Error: " + err.error);
        setLoading(false);
        return;
      }

      // 3) Redirect to the new project
      router.push(`/project/${projectId}`);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-4">Create a New Project</h1>
      <div className="flex flex-col gap-4">
        <input
          type="text"
          value={name}
          placeholder="Project Name"
          onChange={(e) => setName(e.target.value)}
          className="p-2 border rounded"
        />
        <button
          type="button"
          onClick={handleCreateProject}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {loading ? "Creating..." : "Create Project"}
        </button>
      </div>
    </div>
  );
}
