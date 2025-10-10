"use client";

import { MessageSquareIcon, PlusIcon, TrashIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export function ChatSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeConversationId = searchParams.get("id");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/chat/conversations?limit=20");
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleNewChat = () => {
    router.push("/chat");
    // Refresh conversations list after a short delay to allow new conversation to be created
    setTimeout(() => {
      fetchConversations();
    }, 1000);
  };

  const handleDeleteConversation = async (
    e: React.MouseEvent,
    conversationId: string,
  ) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;

    setDeleting(conversationId);
    try {
      const response = await fetch(
        `/api/chat/conversations/${conversationId}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        if (activeConversationId === conversationId) {
          router.push("/chat");
        }
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (Number.isNaN(date.getTime())) {
        return "Recent";
      }
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInDays === 0) return "Today";
      if (diffInDays === 1) return "Yesterday";
      if (diffInDays < 7) return `${diffInDays} days ago`;
      return date.toLocaleDateString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Recent";
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-between px-2 py-2">
          <h2 className="text-lg font-semibold">Chats</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewChat}
            aria-label="New chat"
          >
            <PlusIcon className="size-5" />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Recent Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No conversations yet
              </div>
            ) : (
              <SidebarMenu>
                {conversations.map((conversation) => (
                  <SidebarMenuItem key={conversation.id}>
                    <div className="group/item relative flex items-center">
                      <SidebarMenuButton
                        onClick={() =>
                          router.push(`/chat?id=${conversation.id}`)
                        }
                        isActive={activeConversationId === conversation.id}
                        className="flex-1"
                      >
                        <MessageSquareIcon className="size-4" />
                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                          <span className="truncate">{conversation.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(conversation.updatedAt)}
                          </span>
                        </div>
                      </SidebarMenuButton>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 opacity-0 group-hover/item:opacity-100 transition-opacity absolute right-1"
                        onClick={(e) =>
                          handleDeleteConversation(e, conversation.id)
                        }
                        disabled={deleting === conversation.id}
                        aria-label="Delete conversation"
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{conversations.length} conversations</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
