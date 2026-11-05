"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { AdminNav } from "@/components/AdminNav";
import Link from "next/link";

export default function AdminIntegrantesPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/members?withoutAccount=true")
      .then((r) => r.json())
      .then((d) => setMembers(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#011627] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AppNav />
        <AdminNav />
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-[#d6deeb]">Integrantes sin cuenta de acceso</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-[#637777]">
          Integrantes del núcleo que aún no tienen correo/contraseña para entrar al sistema.
        </p>

        {loading ? (
          <p className="mt-6 text-sm text-gray-500 dark:text-[#637777]">Cargando...</p>
        ) : members.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500 dark:text-[#637777]">Todos los integrantes tienen cuenta de acceso.</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 dark:border-[#1d3b53] bg-white dark:bg-[#011627] shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-[#637777] border-b bg-gray-50 dark:bg-[#011627]">
                  <th className="px-4 py-2">Integrante</th>
                  <th className="px-4 py-2">Parentesco</th>
                  <th className="px-4 py-2">RUT</th>
                  <th className="px-4 py-2">Familia</th>
                  <th className="px-4 py-2">Titular</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m: any) => (
                  <tr key={m.id} className="border-b">
                    <td className="px-4 py-2 font-medium">{m.fullName}</td>
                    <td className="px-4 py-2">{m.relation}</td>
                    <td className="px-4 py-2">{m.rut ?? "-"}</td>
                    <td className="px-4 py-2">{m.family?.name}</td>
                    <td className="px-4 py-2">{m.family?.owner?.email ?? "Sin titular"}</td>
                    <td className="px-4 py-2">
                      <Link href={`/admin/familias/${m.family?.id}`} className="text-emerald-600 dark:text-emerald-400 hover:underline text-xs">
                        Ir a la familia
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-2 text-xs text-gray-500 dark:text-[#637777]">Total: {members.length}</p>
          </div>
        )}
      </div>
    </div>
  );
}
