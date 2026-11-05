"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { AdminNav } from "@/components/AdminNav";

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center">Sin datos</div>;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AppNav />
        <AdminNav />
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Panel de Administración</h1>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card title="Familias" value={data.familiesCount} />
          <Card title="Usuarios" value={data.usersCount} />
          <Card title="Reservas hoy" value={data.reservationsToday} />
          <Card title="Reservas este mes" value={data.reservationsMonth} />
        </div>
        <div className="mt-4">
          <Card title="Ingresos este mes (CLP)" value={`$${(data.incomeMonth ?? 0).toLocaleString("es-CL")}`} />
        </div>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Reservas por estado</h2>
          <div className="space-y-3">
            {(data.byStatus ?? []).map((s: any) => {
              const total = (data.byStatus ?? []).reduce((a: number, b: any) => a + b.count, 0) || 1;
              const pct = Math.round((s.count / total) * 100);
              return (
                <div key={s.status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{s.status}</span>
                    <span className="font-medium text-gray-900">{s.count} ({pct}%)</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Últimas reservas</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Familia</th>
                <th className="py-2">Fecha</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.recentReservations?.map((r: any) => (
                <tr key={r.id} className="border-b">
                  <td className="py-2">{r.family?.name ?? "-"}</td>
                  <td className="py-2">{new Date(r.date).toLocaleDateString("es-CL", { timeZone: "UTC" })}</td>
                  <td className="py-2">{r.status}</td>
                  <td className="py-2">${Number(r.totalAmount).toLocaleString("es-CL")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a href="/admin/familias" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Gestionar familias
          </a>
          <a href="/admin/multas" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Multas
          </a>
          <a href="/admin/reservas" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Reservas
          </a>
          <a href="/admin/usuarios" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Usuarios
          </a>
          <a href="/admin/espacios" className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200">
            Espacios
          </a>
          <a href="/admin/familias/importar" className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200">
            Importar núcleos
          </a>
          <a href="/api/admin/export" className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200">
            Exportar Excel
          </a>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
