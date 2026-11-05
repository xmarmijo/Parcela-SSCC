"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const groups = [
  { label: "Principal", items: [{ href: "/admin", label: "Dashboard" }] },
  {
    label: "Gestión",
    items: [
      { href: "/admin/familias", label: "Familias" },
      { href: "/admin/integrantes", label: "Sin cuenta" },
      { href: "/admin/usuarios", label: "Usuarios" },
    ],
  },
  {
    label: "Operación",
    items: [
      { href: "/admin/reservas", label: "Reservas" },
      { href: "/admin/multas", label: "Multas" },
      { href: "/admin/bloqueos", label: "Bloqueos" },
      { href: "/admin/espera", label: "Lista de espera" },
      { href: "/admin/calendario", label: "Calendario" },
    ],
  },
  {
    label: "Configuración",
    items: [
      { href: "/admin/espacios", label: "Espacios" },
      { href: "/admin/configuracion", label: "Configuración" },
      { href: "/admin/notificaciones", label: "Notificaciones" },
      { href: "/admin/familias/importar", label: "Importar" },
      { href: "/admin/auditoria", label: "Auditoría" },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm">
      {groups.map((g) => {
        const isActive = g.items.some((i) => i.href === pathname);
        return (
          <div key={g.label} className="relative">
            <button
              type="button"
              onClick={() => setOpenGroup(openGroup === g.label ? null : g.label)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-600 dark:bg-emerald-700 text-white"
                  : "text-gray-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-800 hover:text-emerald-700"
              }`}
            >
              {g.label} ▾
            </button>
            {openGroup === g.label && (
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                {g.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpenGroup(null)}
                    className={`block px-4 py-2 text-sm ${
                      pathname === item.href
                        ? "bg-emerald-50 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-medium"
                        : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <a
        href="/api/admin/export"
        className="ml-auto rounded-lg bg-gray-100 dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-gray-800 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700"
      >
        Exportar Excel
      </a>
    </nav>
  );
}
