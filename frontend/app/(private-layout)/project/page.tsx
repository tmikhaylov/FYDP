// app/(private-layout)/project/page.tsx
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/navbar";
import NewProjectPageClient from "./NewProjectPageClient";

export default async function ProjectIndexPage() {
  const session = await getUser();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // No project or chat props -> Navbar shows only toggle + settings
  return (
    <>
      <Navbar />
      <NewProjectPageClient />
    </>
  );
}
