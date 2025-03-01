import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { PanelLeftIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import prisma from "@/prisma/client";
import { getUser } from "@/lib/auth";
import { ScrollArea } from "@/components/ui/scroll-area";
import NewProjectButton from "@/components/NewProjectButton";

export default async function LeftPanel() {
  return (
    <Sheet>
      <SheetTrigger>
        <div className="flex flex-row items-center gap-2">
          <PanelLeftIcon className="w-5 h-5 mt-1" />
          <span className="mt-1 sm:hidden flex">Menu</span>
        </div>
      </SheetTrigger>

      <SheetContent side="left" className="min-w-[390px] px-0">
        <div>
          <h3 className="px-7 text-xl font-semibold">Your Projects</h3>
          <NewProjectButton />
          <Suspense
            fallback={
              <p className={buttonVariants({ variant: "link" })}>Loading...</p>
            }
          >
            <ProjectList />
          </Suspense>
        </div>
      </SheetContent>
    </Sheet>
  );
}

async function ProjectList() {
  const session = await getUser();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      projects: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!user) return null;

  const { projects } = user;
  return (
    <ScrollArea className="flex flex-col mt-7 items-start overflow-y-auto h-[90vh] pb-12">
      {projects.map((proj) => (
        <SheetClose asChild key={proj.id}>
          <Link
            href={`/project/${proj.id}`}
            className="w-full my-3 px-8 hover:underline underline-offset-2"
          >
            {proj.name.length > 35 ? proj.name.slice(0, 35) + "..." : proj.name}
          </Link>
        </SheetClose>
      ))}
    </ScrollArea>
  );
}
