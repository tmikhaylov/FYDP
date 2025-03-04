// app/(private-layout)/project/layout.tsx
import Navbar from "@/components/navbar";
import LeftPanel from "@/components/left-panel";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: { id?: string };
}

export default function ProjectLayout({ children, params }: ProjectLayoutProps) {
  return (
    <div>
      <div className="sm:sticky bg-background sm:w-fit w-full sm:top-32 sm:mb-0 mb-4">
        <LeftPanel />
      </div>
      <Navbar projectId={params.id} />
      {children}
    </div>
  );
}
