import type { Metadata } from "next";
import InstallGuide from "@/components/InstallGuide";

export const metadata: Metadata = { title: "Instalar" };

export default function Page() {
  return <InstallGuide />;
}
