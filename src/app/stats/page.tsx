import type { Metadata } from "next";
import StatsView from "@/components/StatsView";

export const metadata: Metadata = { title: "Progreso" };

export default function Page() {
  return <StatsView />;
}
