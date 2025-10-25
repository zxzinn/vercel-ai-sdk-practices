import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { isExperimentalEnabled } from "@/lib/feature-flags";

export default function ExperimentsLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isExperimentalEnabled()) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Experiments</h1>
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
        </div>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Link>
      </div>

      {children}
    </div>
  );
}
