export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import prisma from "@/prisma/client";
import { getUser } from "@/lib/auth";
import LeftPanelClient from "./LeftPanelClient";

/**
 * Server component that:
 * 1. Fetches the current user (getUser).
 * 2. Retrieves the user's projects from the DB.
 * 3. Passes them to a client component (LeftPanelClient).
 */
export default async function LeftPanel() {
  const session = await getUser();
  if (!session?.user) return null;

  // Fetch the user's projects
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      projects: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!user) return null;

  // Pass the projects array into the client component
  return <LeftPanelClient projects={user.projects} />;
}
