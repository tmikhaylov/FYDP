// app/(private-layout)/project/layout.tsx
import Navbar from "@/components/navbar";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: { id?: string };
}

export default function ProjectLayout({ children, params }: ProjectLayoutProps) {
  return (
    <div>
      <Navbar projectId={params.id} />
      {children}
    </div>
  );
}
