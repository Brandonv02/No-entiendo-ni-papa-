import Link from "next/link";
import Mascot from "@/components/Mascot";

export default function NotFound() {
  return (
    <div className="card text-center">
      <Mascot mood="think" size={96} />
      <h1 className="mt-2 text-xl font-extrabold">Esta página no existe</h1>
      <p className="text-muted">Ni Papito la encuentra.</p>
      <Link href="/" className="btn btn-primary mt-4">
        Volver al inicio
      </Link>
    </div>
  );
}
