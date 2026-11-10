import type { Metadata } from "next";
import TalkHub from "@/components/TalkHub";

export const metadata: Metadata = { title: "Hablar" };

export default function Page() {
  return <TalkHub />;
}
