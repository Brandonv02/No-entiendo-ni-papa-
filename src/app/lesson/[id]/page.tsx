import type { Metadata } from "next";
import LessonPlayer from "@/components/LessonPlayer";
import { LESSONS, lessonById } from "@/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return LESSONS.map((l) => ({ id: l.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: lessonById.get(id)?.title ?? "Lección" };
}

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LessonPlayer lessonId={id} />;
}
