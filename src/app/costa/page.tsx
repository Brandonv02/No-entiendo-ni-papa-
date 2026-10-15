import type { Metadata } from "next";
import CostaHub from "@/components/CostaHub";

export const metadata: Metadata = { title: "De la Costa pa'l mundo" };

export default function Page() {
  return <CostaHub />;
}
