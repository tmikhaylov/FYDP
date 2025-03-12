// import LeftPanel from "@/components/left-panel";

interface ProjectLayoutProps {
  children: React.ReactNode;
}

export default function ProjectLayout({ children }: ProjectLayoutProps) {
  return (
    <div>
      {/* Left panel (sidebar) */}
      {/* <div className="sm:sticky bg-background sm:w-fit w-full sm:top-32 sm:mb-0 mb-4">
        <LeftPanel />
      </div> */}
      {children}
    </div>
  );
}
