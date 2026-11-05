"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { AdminNav } from "@/components/AdminNav";

export default function AdminCalendarioPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`/api/admin/calendar?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [year, month]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const prev = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1);
  };
  const next = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <AppNav />
        <AdminNav />
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Calendario de reservas</h1>

        <div className="mt-4 flex items-center justify-between">
          <button onClick={prev} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100">← Anterior</button>
          <h2 className="text-xl font-semibold text-gray-900">{monthNames[month - 1]} {year}</h2>
          <button onClick={next} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100">Siguiente →</button>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-gray-500">Cargando...</p>
        ) : (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-gray-500 bg-gray-50 border-b">
              {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
                <div key={d} className="py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="border-b border-r border-gray-100 h-20" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const info = data?.counts?.[key];
                const total = info?.total ?? 0;
                const bg = total === 0 ? "bg-white" : total < 3 ? "bg-emerald-50" : total < 6 ? "bg-amber-50" : "bg-red-50";
                return (
                  <div key={day} className={`border-b border-r border-gray-100 h-20 p-1 ${bg}`}>
                    <div className="text-xs font-medium text-gray-700">{day}</div>
                    {total > 0 && (
                      <div className="mt-1 text-[10px] text-gray-600">
                        <div>{total} reserva{total > 1 ? "s" : ""}</div>
                        {info.confirmed > 0 && <div className="text-emerald-700">✓ {info.confirmed}</div>}
                        {info.pending > 0 && <div className="text-amber-700">⏳ {info.pending}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-white border" /> Sin reservas</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-emerald-50 border" /> 1-2 reservas</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-amber-50 border" /> 3-5 reservas</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-50 border" /> 6+ reservas</span>
        </div>
      </div>
    </div>
  );
}
