"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { AdminNav } from "@/components/AdminNav";

import { Suspense } from "react";

function AdminReservasInner() {
  const [date, setDate] = useState("");
  const [rut, setRut] = useState("");
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; page: number; pageSize: number; reservations: any[] }>({ total: 0, page: 1, pageSize: 20, reservations: [] });
  const [loading, setLoading] = useState(false);

  const load = (p = page) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (rut) params.set("rut", rut);
    if (status) params.set("status", status);
    params.set("page", String(p));
    fetch(`/api/admin/reservations?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(1);
  }, []);

  const cancel = async (id: string) => {
    if (!confirm("¿Cancelar esta reserva?")) return;
    const res = await fetch("/api/admin/reservations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "cancel" }),
    });
    if (res.ok) load(page);
    else {
      const d = await res.json();
      alert(d.error || "Error");
    }
  };

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AppNav />
        <AdminNav />
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">Reservas</h1>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={rut}
            onChange={(e) => setRut(e.target.value)}
            placeholder="Filtrar por RUT del titular"
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="PENDIENTE_PAGO">Pendiente de pago</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="COMPLETADA">Completada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
          <button
            onClick={() => { setPage(1); load(1); }}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Filtrar
          </button>
          <button
            onClick={() => { setDate(""); setRut(""); setStatus(""); setPage(1); load(1); }}
            className="rounded-lg bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 dark:bg-gray-700"
          >
            Limpiar
          </button>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
        ) : (
          <>
            <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b bg-gray-50 dark:bg-gray-950">
                    <th className="px-4 py-2">Familia</th>
                    <th className="px-4 py-2">Fecha</th>
                    <th className="px-4 py-2">Estado</th>
                    <th className="px-4 py-2">Total</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.reservations.map((r: any) => (
                    <tr key={r.id} className="border-b">
                      <td className="px-4 py-2">{r.family?.name}</td>
                      <td className="px-4 py-2">{new Date(r.date).toLocaleDateString("es-CL", { timeZone: "UTC" })}</td>
                      <td className="px-4 py-2">{r.status}</td>
                      <td className="px-4 py-2">${Number(r.totalAmount).toLocaleString("es-CL")}</td>
                      <td className="px-4 py-2 space-x-2">
                        <a href={`/reservas/${r.id}`} className="text-xs text-emerald-600 hover:underline">
                          Ver detalle
                        </a>
                        {r.status === "PENDIENTE_PAGO" && (
                          <>
                            <button
                              onClick={async () => {
                                if (!confirm("¿Confirmar pago manualmente?")) return;
                                const res = await fetch("/api/admin/reservations", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: r.id, action: "confirm" }),
                                });
                                if (res.ok) load(page);
                                else {
                                  const d = await res.json();
                                  alert(d.error || "Error");
                                }
                              }}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Confirmar pago
                            </button>
                            <button onClick={() => cancel(r.id)} className="text-xs text-red-600 hover:underline">
                              Cancelar
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Total: {data.total} · Página {data.page} de {totalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => { const p = page - 1; setPage(p); load(p); }}
                  className="rounded border px-3 py-1 disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => { const p = page + 1; setPage(p); load(p); }}
                  className="rounded border px-3 py-1 disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminReservasPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}><AdminReservasInner /></Suspense>
  );
}