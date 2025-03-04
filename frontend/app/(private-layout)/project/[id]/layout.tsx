// (private-layout)/project/[id]/layout.tsx
import { PropsWithChildren } from "react";

export default function ChatLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex sm:flex-row flex-col items-start sm:gap-12 gap-4 w-full">
      <div className="w-full">{children}</div>
    </div>
  );
}