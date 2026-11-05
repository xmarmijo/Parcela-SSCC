"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function AppNav() {
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
      setDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      setDark(false);
    }
  }, []);

  const toggleTheme = () => {
    if (dark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setDark(true);
    }
  };

  return (
    <nav className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-[#1d3b53] bg-white dark:bg-[#011627] px-4 py-3 shadow-sm">
      <span className="text-base font-semibold text-emerald-700">Parcela SSCC</span>
      <div className="flex flex-wrap items-center gap-1 text-sm">
        {isAdmin && (
          <Link
            href="/admin"
            className="rounded-lg px-3 py-1.5 font-medium text-gray-700 dark:text-[#d6deeb] transition-colors hover:bg-emerald-50 dark:bg-emerald-950 hover:text-emerald-700"
          >
            Admin
          </Link>
        )}
        <Link
          href="/reservar"
          className="rounded-lg px-3 py-1.5 font-medium text-gray-700 dark:text-[#d6deeb] transition-colors hover:bg-emerald-50 dark:bg-emerald-950 hover:text-emerald-700"
        >
          Reservar
        </Link>
        <Link
          href="/mis-reservas"
          className="rounded-lg px-3 py-1.5 font-medium text-gray-700 dark:text-[#d6deeb] transition-colors hover:bg-emerald-50 dark:bg-emerald-950 hover:text-emerald-700"
        >
          Mis reservas
        </Link>
        <Link
          href="/familia"
          className="rounded-lg px-3 py-1.5 font-medium text-gray-700 dark:text-[#d6deeb] transition-colors hover:bg-emerald-50 dark:bg-emerald-950 hover:text-emerald-700"
        >
          Mi familia
        </Link>
        <Link
          href="/perfil"
          className="rounded-lg px-3 py-1.5 font-medium text-gray-700 dark:text-[#d6deeb] transition-colors hover:bg-emerald-50 dark:bg-emerald-950 hover:text-emerald-700"
        >
          Mi perfil
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg border border-gray-200 dark:border-[#1d3b53] px-3 py-1.5 font-medium text-gray-600 dark:text-[#637777] transition-colors hover:bg-gray-100 dark:hover:bg-[#0b253a]"
          aria-label="Cambiar tema"
        >
          {dark ? "Claro" : "Oscuro"}
        </button>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-lg border border-gray-200 dark:border-[#1d3b53] px-3 py-1.5 font-medium text-gray-600 dark:text-[#637777] transition-colors hover:border-red-200 hover:bg-red-50 dark:bg-red-950 hover:text-red-600"
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}
