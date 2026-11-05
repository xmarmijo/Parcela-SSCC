"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";

export default function AdminReservasPage() {
  const [date, setDate] = useState("");
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    const url = date ? `/api/admin/reservations?date=${date}` : "/api/admin/reservations";
    fetch(url)
      .then((r) => r.json())
      .then((d) => setReservations(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const cancel = async (id: string) => {
    if (!confirm("¿Cancelar esta reserva?")) return;
    const res = await fetch("/api/admin/reservations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "cancel" }),
    });
    if (res.ok) load();
    else {
      const d = await res.json();
      alert(d.error || "Error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AppNav />
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Reservas</h1>

        <div className="mt-4 flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button onClick={load} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Filtrar
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
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Total</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r: any) => (
                  <tr key={r.id} className="border-b">
                    <td className="px-4 py-2">{r.family?.name}</td>
                    <td className="px-4 py-2">{new Date(r.date).toLocaleDateString("es-CL", { timeZone: "UTC" })}</td>
                    <td className="px-4 py-2">{r.status}</td>
                    <td className="px-4 py-2">${Number(r.totalAmount).toLocaleString("es-CL")}</td>
                    <td className="px-4 py-2">
                      {r.status !== "CANCELADA" && r.status !== "COMPLETADA" && (
                        <button onClick={() => cancel(r.id)} className="text-xs text-red-600 hover:underline">
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
