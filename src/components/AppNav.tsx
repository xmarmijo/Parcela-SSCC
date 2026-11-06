"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function AppNav() {
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  return (
    <nav className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <span className="text-base font-semibold text-emerald-700">Parcela SSCC</span>
      <div className="flex flex-wrap items-center gap-1 text-sm">
        {isAdmin && (
          <Link
            href="/admin"
            className="rounded-lg px-3 py-1.5 font-medium text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
          >
            Admin
          </Link>
        )}
        <Link
          href="/reservar"
          className="rounded-lg px-3 py-1.5 font-medium text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
        >
          Reservar
        </Link>
        <Link
          href="/mis-reservas"
          className="rounded-lg px-3 py-1.5 font-medium text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
        >
          Mis reservas
        </Link>
        <Link
          href="/familia"
          className="rounded-lg px-3 py-1.5 font-medium text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
        >
          Mi familia
        </Link>
        <Link
          href="/perfil"
          className="rounded-lg px-3 py-1.5 font-medium text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
        >
          Mi perfil
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}
