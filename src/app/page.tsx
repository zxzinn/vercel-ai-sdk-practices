import { FolderOpen, MessageSquare } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <main className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">
            Vercel AI SDK Practices
          </h1>
          <p className="text-xl text-muted-foreground">
            Explore AI-powered chat and knowledge management
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <Link href="/chat">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>AI Chat</CardTitle>
                </div>
                <CardDescription>
                  Chat with AI models, use web search, and query your documents
                  with RAG
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Multiple AI models support</li>
                  <li>• Web search integration</li>
                  <li>• Document Q&A with RAG</li>
                  <li>• MCP tools integration</li>
                </ul>
              </CardContent>
            </Card>
          </Link>

          <Link href="/spaces">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FolderOpen className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Spaces</CardTitle>
                </div>
                <CardDescription>
                  Organize your documents into knowledge spaces
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Create multiple spaces</li>
                  <li>• Upload and manage documents</li>
                  <li>• Tag-based organization</li>
                  <li>• Vector-based search</li>
                </ul>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
