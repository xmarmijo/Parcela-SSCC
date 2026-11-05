"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export function AppNav() {
  return (
    <nav className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <Link href="/" className="text-base font-semibold text-emerald-700">
        Parcela SSCC
      </Link>
      <div className="flex flex-wrap items-center gap-1 text-sm">
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
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-lg px-3 py-1.5 font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
        >
          Salir
        </button>
      </div>
    </nav>
  );
}
