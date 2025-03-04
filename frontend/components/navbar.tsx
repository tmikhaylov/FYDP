// components/navbar.tsx
import { NamedLogoWithLink } from "./logo";
import ToggleTheme from "./toggle";
import NewChatModal from "./NewChatModal";
import Profile from "./profile";

// No "use client" here: this is a server component
interface NavbarProps {
  projectId?: string;
  chatId?: string;
}

export default function Navbar({ projectId, chatId }: NavbarProps) {
  return (
    <nav className="w-full flex flex-row items-center justify-between h-24 sm:mb-7 top-0 sticky bg-background px-4">
      <div className="flex items-center gap-4">
        <NamedLogoWithLink />
        {(projectId || chatId) && (
          <span className="ml-2 text-sm text-gray-600">
            {projectId && `Project: ${projectId}`} {chatId && `| Chat: ${chatId}`}
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
