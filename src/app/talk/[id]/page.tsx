import type { Metadata } from "next";
import TalkSession from "@/components/TalkSession";
import { INTERVIEWS, interviewById } from "@/content/interviews";

export const dynamicParams = false;

export function generateStaticParams() {
  return INTERVIEWS.map((i) => ({ id: i.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: interviewById.get(id)?.title ?? "Conversación" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TalkSession interviewId={id} />;
}
