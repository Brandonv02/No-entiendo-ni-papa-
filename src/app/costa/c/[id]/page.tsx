import type { Metadata } from "next";
import ConversationPlayer from "@/components/ConversationPlayer";
import { CONVERSATIONS, conversationById } from "@/content/conversations";

export const dynamicParams = false;

export function generateStaticParams() {
  return CONVERSATIONS.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: conversationById.get(id)?.title ?? "Conversación" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ConversationPlayer conversationId={id} />;
}
