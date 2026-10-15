import type { Metadata } from "next";
import ReviewView from "@/components/ReviewView";

export const metadata: Metadata = { title: "Repaso" };

export default function Page() {
  return <ReviewView />;
}
