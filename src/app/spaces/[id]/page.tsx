import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { SpaceDetail } from "@/components/spaces/space-detail";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default async function SpaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6">
        <Link href="/spaces">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Spaces
          </Button>
        </Link>
      </div>

      <Suspense fallback={<SpaceDetailSkeleton />}>
        <SpaceDetail spaceId={id} />
      </Suspense>
    </div>
  );
}

function SpaceDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4">
        {Array.from({ length: 3 }, (_, i) => `skeleton-${i}`).map((key) => (
          <Skeleton key={key} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
