"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { AdminNav } from "@/components/AdminNav";

export default function AdminMultasPage() {
  const [fines, setFines] = useState<any[]>([]);
  const [families, setFamilies] = useState<any[]>([]);
  const [familyId, setFamilyId] = useState("");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/fines").then((r) => r.json()),
      fetch("/api/admin/families").then((r) => r.json()),
    ])
      .then(([f, fam]) => {
        setFines(Array.isArray(f) ? f : []);
        setFamilies(fam?.families ?? []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/fines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyId, reason, amount: Number(amount) }),
    });
    if (res.ok) {
      setReason("");
      setAmount("");
      load();
    } else {
      const d = await res.json();
      alert(d.error || "Error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <AppNav />
        <AdminNav />
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Multas</h1>

        <form onSubmit={handleCreate} className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Emitir multa</h2>
          <select
            value={familyId}
            onChange={(e) => setFamilyId(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Seleccionar familia</option>
            {families.map((f: any) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Monto (CLP)"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Emitir multa
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Multas emitidas</h2>
          {loading ? (
            <p className="text-sm text-gray-500">Cargando...</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2">Familia</th>
                  <th className="py-2">Motivo</th>
                  <th className="py-2">Monto</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {fines.map((f: any) => (
                  <tr key={f.id} className="border-b">
                    <td className="py-2">{f.family?.name}</td>
                    <td className="py-2">{f.reason}</td>
                    <td className="py-2">${Number(f.amount).toLocaleString("es-CL")}</td>
                    <td className="py-2">{f.paidAt ? "Pagada" : "Pendiente"}</td>
                    <td className="py-2">
                      {!f.paidAt && (
                        <button
                          onClick={async () => {
                            await fetch(`/api/admin/fines/${f.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ paid: true }),
                            });
                            load();
                          }}
                          className="text-xs text-emerald-600 hover:underline"
                        >
                          Marcar pagada
                        </button>
                      )}
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
