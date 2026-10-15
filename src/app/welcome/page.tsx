import type { Metadata } from "next";
import Welcome from "@/components/Welcome";

export const metadata: Metadata = { title: "Bienvenido" };

export default function Page() {
  return <Welcome />;
}
