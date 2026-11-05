"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/familias", label: "Familias" },
  { href: "/admin/multas", label: "Multas" },
  { href: "/admin/reservas", label: "Reservas" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/espacios", label: "Espacios" },
  { href: "/admin/familias/importar", label: "Importar" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            pathname === l.href
              ? "bg-emerald-600 text-white"
              : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
          }`}
        >
          {l.label}
        </Link>
      ))}
      <a
        href="/api/admin/export"
        className="ml-auto rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-200"
      >
        Exportar Excel
      </a>
    </nav>
  );
}
