import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <ChatSidebar />
        <main className="flex-1">{children}</main>
      </div>
    </SidebarProvider>
  );
}
