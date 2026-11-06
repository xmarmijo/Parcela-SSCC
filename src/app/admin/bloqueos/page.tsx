"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { AdminNav } from "@/components/AdminNav";

export default function AdminBloqueosPage() {
  const [dates, setDates] = useState<any[]>([]);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [blockedWeekdays, setBlockedWeekdays] = useState<number[]>([]);
  const weekdays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  const load = () => {
    setLoading(true);
    fetch("/api/admin/blocked-dates")
      .then((r) => r.json())
      .then((d) => setDates(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setBlockedWeekdays(Array.isArray(d.blockedWeekdays) ? d.blockedWeekdays : []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/blocked-dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, reason }),
    });
    if (res.ok) {
      setDate("");
      setReason("");
      load();
    } else {
      const d = await res.json();
      alert(d.error || "Error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Desbloquear esta fecha?")) return;
    const res = await fetch(`/api/admin/blocked-dates?id=${id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <AppNav />
        <AdminNav />
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Fechas bloqueadas</h1>
        <p className="mt-2 text-sm text-gray-600">Cierra la parcela por mantenimiento (no se podrán reservar).</p>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Cierre semanal recurrente</h2>
          <p className="text-sm text-gray-600 mb-3">Marca los días de la semana que estarán siempre cerrados (mantenimiento).</p>
          <div className="flex flex-wrap gap-3">
            {weekdays.map((w, i) => (
              <label key={i} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={blockedWeekdays.includes(i)}
                  onChange={async () => {
                    const next = blockedWeekdays.includes(i)
                      ? blockedWeekdays.filter((x) => x !== i)
                      : [...blockedWeekdays, i];
                    setBlockedWeekdays(next);
                    await fetch("/api/admin/settings", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ blockedWeekdays: next }),
                    });
                  }}
                  className="h-4 w-4 text-emerald-600 rounded border-gray-300"
                />
                {w}
              </label>
            ))}
          </div>
        </div>

        <form onSubmit={handleAdd} className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (opcional)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Bloquear fecha
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-sm text-gray-500">Cargando...</p>
          ) : dates.length === 0 ? (
            <p className="text-sm text-gray-500">No hay fechas bloqueadas.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Motivo</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {dates.map((d: any) => (
                  <tr key={d.id} className="border-b">
                    <td className="py-2">{new Date(d.date).toLocaleDateString("es-CL", { timeZone: "UTC" })}</td>
                    <td className="py-2">{d.reason ?? "-"}</td>
                    <td className="py-2">
                      <button onClick={() => handleDelete(d.id)} className="text-xs text-red-600 hover:underline">
                        Desbloquear
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
