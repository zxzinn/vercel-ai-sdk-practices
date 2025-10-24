import { Plus } from "lucide-react";
import { Suspense } from "react";
import { CreateSpaceDialog } from "@/components/spaces/create-space-dialog";
import { SpaceList } from "@/components/spaces/space-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function SpacesPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Spaces</h1>
          <p className="text-muted-foreground mt-2">
            Organize your documents into knowledge spaces
          </p>
        </div>
        <CreateSpaceDialog>
          <Button size="lg">
            <Plus className="mr-2 h-4 w-4" />
            New Space
          </Button>
        </CreateSpaceDialog>
      </div>

      <Suspense fallback={<SpaceListSkeleton />}>
        <SpaceList />
      </Suspense>
    </div>
  );
}

function SpaceListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }, (_, i) => `skeleton-${i}`).map((key) => (
        <div key={key} className="border rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
            <div className="flex items-center gap-6">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-8" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
