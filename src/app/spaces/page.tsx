import { Plus } from "lucide-react";
import { Suspense } from "react";
import { CreateSpaceDialog } from "@/components/spaces/create-space-dialog";
import { SpaceList } from "@/components/spaces/space-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => `skeleton-${i}`).map((key) => (
        <Card key={key}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
