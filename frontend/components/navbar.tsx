// components/navbar.tsx
import { NamedLogoWithLink } from "./logo";
import ToggleTheme from "./toggle";
import NewChatModal from "./NewChatModal";
import Profile from "./profile";

interface NavbarProps {
  projectName?: string; // Displayed as "Project: ____"
  chatName?: string;    // Displayed as "Chat: ____"
  projectId?: string;
}

// Server component (no "use client")
export default function Navbar({ projectName, chatName, projectId }: NavbarProps) {
  return (
    <nav className="w-full flex flex-row items-center justify-between h-24 sm:mb-7 top-0 sticky bg-background px-4">
      <div className="flex items-center gap-4">
        <NamedLogoWithLink />
        {(projectName || chatName) && (
          <span className="ml-2 text-sm text-gray-600">
            {projectName && `Project: ${projectName}`} 
            {projectName && chatName && " | "} 
            {chatName && `Chat: ${chatName}`}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <ToggleTheme />
        {projectId && <NewChatModal projectId={projectId} />}
        <Profile />
      </div>
    </nav>
  );
}
