"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { AdminNav } from "@/components/AdminNav";

export default function AdminAuditoriaPage() {
  const [data, setData] = useState<any>({ total: 0, page: 1, pageSize: 30, logs: [] });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = (p = page) => {
    setLoading(true);
    fetch(`/api/admin/audit?page=${p}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AppNav />
        <AdminNav />
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Auditoría</h1>
        <p className="mt-2 text-sm text-gray-600">Registro de acciones administrativas.</p>

        {loading ? (
          <p className="mt-6 text-sm text-gray-500">Cargando...</p>
        ) : (
          <>
            <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b bg-gray-50">
                    <th className="px-4 py-2">Fecha</th>
                    <th className="px-4 py-2">Acción</th>
                    <th className="px-4 py-2">Entidad</th>
                    <th className="px-4 py-2">Usuario</th>
                    <th className="px-4 py-2">Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map((l: any) => (
                    <tr key={l.id} className="border-b">
                      <td className="px-4 py-2 text-xs text-gray-500">{new Date(l.createdAt).toLocaleString("es-CL")}</td>
                      <td className="px-4 py-2 font-medium">{l.action}</td>
                      <td className="px-4 py-2">{l.entityType}{l.entityId ? ` (${l.entityId.slice(0, 8)}...)` : ""}</td>
                      <td className="px-4 py-2">{l.user?.email ?? "sistema"}</td>
                      <td className="px-4 py-2 text-xs text-gray-600">{l.details ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
              <span>Total: {data.total} · Página {data.page} de {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p); }} className="rounded border px-3 py-1 disabled:opacity-40">Anterior</button>
                <button disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); load(p); }} className="rounded border px-3 py-1 disabled:opacity-40">Siguiente</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
