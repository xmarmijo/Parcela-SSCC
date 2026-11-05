"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/familias", label: "Familias" },
  { href: "/admin/integrantes", label: "Sin cuenta" },
  { href: "/admin/espera", label: "Lista de espera" },
  { href: "/admin/auditoria", label: "Auditoría" },
  { href: "/admin/multas", label: "Multas" },
  { href: "/admin/reservas", label: "Reservas" },
  { href: "/admin/calendario", label: "Calendario" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/espacios", label: "Espacios" },
  { href: "/admin/bloqueos", label: "Bloqueos" },
  { href: "/admin/configuracion", label: "Correo" },
  { href: "/admin/notificaciones", label: "Notificaciones" },
  { href: "/admin/familias/importar", label: "Importar" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex items-center gap-2 overflow-x-auto rounded-xl border border-gray-200 dark:border-[#1d3b53] bg-white dark:bg-[#011627] px-4 py-3 shadow-sm whitespace-nowrap">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            pathname === l.href
              ? "bg-emerald-600 text-white"
              : "text-gray-700 dark:text-[#d6deeb] hover:bg-emerald-50 dark:bg-emerald-950 hover:text-emerald-700"
          }`}
        >
          {l.label}
        </Link>
      ))}
      <a
        href="/api/admin/export"
        className="ml-auto rounded-lg bg-gray-100 dark:bg-[#0b253a] px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-200 dark:bg-[#1d3b53]"
      >
        Exportar Excel
      </a>
    </nav>
  );
}
