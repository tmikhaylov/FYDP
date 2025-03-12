// app/(private-layout)/layout.tsx
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PropsWithChildren } from "react";

export default async function PrivateLayout({ children }: PropsWithChildren) {
  const session = await getUser();
  if (!session?.user) redirect("/login");

  // No <Navbar /> here
  return (
    <div>
      {children}
    </div>
  );
}
