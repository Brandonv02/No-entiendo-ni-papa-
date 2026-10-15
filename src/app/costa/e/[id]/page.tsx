import type { Metadata } from "next";
import ExpressionSession from "@/components/ExpressionSession";
import { COSTA_CATEGORIES, categoryById } from "@/content/costa";

export const dynamicParams = false;

export function generateStaticParams() {
  return COSTA_CATEGORIES.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: categoryById.get(id)?.title ?? "Expresiones" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExpressionSession categoryId={id} />;
}
