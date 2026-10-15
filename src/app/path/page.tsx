import type { Metadata } from "next";
import PathView from "@/components/PathView";

export const metadata: Metadata = { title: "Ruta" };

export default function Page() {
  return <PathView />;
}
