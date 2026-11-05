"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { AdminNav } from "@/components/AdminNav";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center">Sin datos</div>;

  const statusColors: Record<string, string> = {
    PENDIENTE_PAGO: "#f59e0b",
    CONFIRMADA: "#10b981",
    COMPLETADA: "#3b82f6",
    CANCELADA: "#ef4444",
  };

  const totalStatus = (data.byStatus ?? []).reduce((a: number, b: any) => a + b.count, 0) || 1;
  const statusGradient = (data.byStatus ?? []).reduce((acc: { stops: string[]; offset: number }, s: any) => {
    const pct = (s.count / totalStatus) * 100;
    const color = statusColors[s.status] ?? "#94a3b8";
    acc.stops.push(`${color} ${acc.offset}% ${acc.offset + pct}%`);
    acc.offset += pct;
    return acc;
  }, { stops: [], offset: 0 });

  const maxDay = Math.max(...(data.dayStats ?? []).map((d: any) => d.count), 1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AppNav />
        <AdminNav />
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-slate-50">Panel de Administración</h1>

        {/* Stat cards (clickable) */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard title="Familias" value={data.familiesCount} href="/admin/familias" />
          <StatCard title="Usuarios" value={data.usersCount} href="/admin/usuarios" />
          <StatCard title="Reservas hoy" value={data.reservationsToday} href="/admin/reservas" />
          <StatCard title="Reservas este mes" value={data.reservationsMonth} href="/admin/reservas" />
          <StatCard title="Ingresos este mes" value={`$${(data.incomeMonth ?? 0).toLocaleString("es-CL")}`} href="/admin/reservas" />
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard title="Cancelaciones este mes" value={data.cancellationsMonth ?? 0} href="/admin/reservas?status=CANCELADA" />
          <StatCard title="Multas pendientes" value={null} href="/admin/multas" placeholder="Ver" />
        </div>

        {/* Charts */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pie chart: reservations by status */}
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-50 mb-4">Reservas por estado</h2>
            <div className="flex items-center gap-6">
              <div
                className="w-32 h-32 rounded-full flex-shrink-0"
                style={{ background: `conic-gradient(${statusGradient.stops.join(", ")})` }}
              />
              <div className="space-y-2 text-sm">
                {(data.byStatus ?? []).map((s: any) => (
                  <a
                    key={s.status}
                    href={`/admin/reservas?status=${s.status}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: statusColors[s.status] ?? "#94a3b8" }} />
                    <span className="text-gray-700 dark:text-slate-50">{s.status}</span>
                    <span className="font-medium text-gray-900 dark:text-slate-50 ml-auto">{s.count}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Bar chart: most used days */}
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-50 mb-4">Días más usados (este mes)</h2>
            <div className="space-y-2">
              {(data.dayStats ?? []).map((d: any) => {
                const pct = Math.round((d.count / maxDay) * 100);
                return (
                  <div key={d.day}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 dark:text-slate-50">{d.day}</span>
                      <span className="font-medium text-gray-900 dark:text-slate-50">{d.count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top families */}
        <div className="mt-8 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-50 mb-4">Familias más activas</h2>
          <div className="flex flex-wrap gap-6 items-center">
            <div className="space-y-2 text-sm flex-1">
              {(data.topFamilies ?? []).map((f: any, i: number) => (
                <div key={i} className="flex justify-between">
                  <span className="text-gray-700 dark:text-slate-50">{f.name}</span>
                  <span className="font-medium text-gray-900 dark:text-slate-50">{f.count} reserva{f.count !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent reservations */}
        <div className="mt-8 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-50">Últimas reservas</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por familia o RUT"
              className="rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-50"
            />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-slate-400 border-b">
                <th className="py-2">Familia</th>
                <th className="py-2">Fecha</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Total</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(data.recentReservations ?? [])
                .filter((r: any) => {
                  const q = search.toLowerCase();
                  const name = (r.family?.name ?? "").toLowerCase();
                  const rut = (r.family?.owner?.rut ?? "").toLowerCase();
                  const email = (r.family?.owner?.email ?? "").toLowerCase();
                  return name.includes(q) || rut.includes(q) || email.includes(q);
                })
                .map((r: any) => (
                <tr key={r.id} className="border-b dark:border-slate-700">
                  <td className="py-2">{r.family?.name ?? "-"}</td>
                  <td className="py-2">{new Date(r.date).toLocaleDateString("es-CL", { timeZone: "UTC" })}</td>
                  <td className="py-2">
                    <a href={`/admin/reservas?status=${r.status}`} className="text-emerald-600 dark:text-indigo-400 hover:underline">
                      {r.status}
                    </a>
                  </td>
                  <td className="py-2">${Number(r.totalAmount).toLocaleString("es-CL")}</td>
                  <td className="py-2">
                    <a href={`/reservas/${r.id}`} className="text-emerald-600 dark:text-indigo-400 hover:underline text-xs">
                      Ver
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, href, placeholder }: { title: string; value: any; href: string; placeholder?: string }) {
  return (
    <Link href={href} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition">
      <p className="text-xs text-gray-500 dark:text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-50">{value ?? placeholder ?? "-"}</p>
    </Link>
  );
}
