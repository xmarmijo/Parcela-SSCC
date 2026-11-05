"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { AdminNav } from "@/components/AdminNav";
import Link from "next/link";

export default function AdminFamiliasPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = (p = page) => {
    setLoading(true);
    fetch(`/api/admin/families?q=${encodeURIComponent(q)}&page=${p}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(1);
  }, []);

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 20)));

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AppNav />
        <AdminNav />
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Familias</h1>

        <div className="mt-4 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, RUT o correo"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button onClick={() => { setPage(1); load(1); }} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Buscar
          </button>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-gray-500">Cargando...</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b bg-gray-50">
                  <th className="px-4 py-2">Familia</th>
                  <th className="px-4 py-2">Titular</th>
                  <th className="px-4 py-2">Integrantes</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {data?.families?.map((f: any) => (
                  <tr key={f.id} className="border-b">
                    <td className="px-4 py-2 font-medium">{f.name}</td>
                    <td className="px-4 py-2">
                      {f.owner?.email ?? "Sin titular registrado"}
                      {f.owner?.rut ? <span className="ml-2 text-xs text-gray-500">({f.owner.rut})</span> : null}
                    </td>
                    <td className="px-4 py-2">{f.members?.length ?? 0}</td>
                    <td className="px-4 py-2">
                      <Link href={`/admin/familias/${f.id}`} className="text-emerald-600 hover:underline">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-2 text-xs text-gray-500">Total: {data?.total ?? 0}</p>
            <div className="px-4 py-2 flex items-center justify-between text-sm text-gray-600">
              <span>Página {data?.page ?? 1} de {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p); }} className="rounded border px-3 py-1 disabled:opacity-40">Anterior</button>
                <button disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); load(p); }} className="rounded border px-3 py-1 disabled:opacity-40">Siguiente</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
