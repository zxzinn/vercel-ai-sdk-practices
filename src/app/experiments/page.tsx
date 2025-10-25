import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const experiments = [
  {
    id: "provider-icons",
    title: "Provider Icons",
    description: "Vector database and embedding provider icons showcase",
  },
];

export default function ExperimentsPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {experiments.map((exp) => (
        <Link key={exp.id} href={`/experiments/${exp.id}`}>
          <Card className="h-full hover:border-primary transition-colors group">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {exp.title}
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>{exp.description}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}
