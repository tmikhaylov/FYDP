// app/(private-layout)/project/page.tsx
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/navbar";
import LeftPanel from "@/components/left-panel";
import NewProjectPageClient from "./NewProjectPageClient";

export default async function ProjectIndexPage() {
  const session = await getUser();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // No project or chat props -> Navbar shows only toggle + settings
  return (
    <>
      <div className="sm:sticky bg-background sm:w-fit w-full sm:top-32 sm:mb-0 mb-4">
        <LeftPanel />
      </div>
      <Navbar />
      <NewProjectPageClient />
    </>
  );
}
