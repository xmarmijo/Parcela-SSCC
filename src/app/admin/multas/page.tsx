"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { AdminNav } from "@/components/AdminNav";

export default function AdminMultasPage() {
  const [fines, setFines] = useState<any[]>([]);
  const [familySearch, setFamilySearch] = useState("");
  const [familyResults, setFamilyResults] = useState<any[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<any>(null);
  const [familyId, setFamilyId] = useState("");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [reasons, setReasons] = useState<any[]>([]);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/fines").then((r) => r.json()),
      fetch("/api/admin/settings").then((r) => r.json()),
    ])
      .then(([f, s]) => {
        setFines(Array.isArray(f) ? f : []);
        setReasons(Array.isArray(s?.fineReasons) ? s.fineReasons : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const searchFamilies = (q: string) => {
    setFamilySearch(q);
    setSelectedFamily(null);
    setFamilyId("");
    if (q.trim().length < 2) {
      setFamilyResults([]);
      return;
    }
    fetch(`/api/admin/families?q=${encodeURIComponent(q.trim())}`)
      .then((r) => r.json())
      .then((d) => setFamilyResults(d?.families ?? []))
      .catch(() => setFamilyResults([]));
  };

  const selectFamily = (f: any) => {
    setSelectedFamily(f);
    setFamilyId(f.id);
    setFamilySearch(f.name);
    setFamilyResults([]);
  };

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
      setFamilySearch("");
      setSelectedFamily(null);
      setFamilyId("");
      load();
    } else {
      const d = await res.json();
      alert(d.error || "Error");
    }
  };

  const handleMarkPaid = async (id: string) => {
    const res = await fetch(`/api/admin/fines/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: true }),
    });
    if (res.ok) load();
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <AppNav />
        <AdminNav />
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Multas</h1>

        <form onSubmit={handleCreate} className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Emitir multa</h2>
          <div className="relative">
            <input
              value={familySearch}
              onChange={(e) => searchFamilies(e.target.value)}
              placeholder="Buscar familia por RUT, correo o nombre"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            {familyResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                {familyResults.map((f: any) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => selectFamily(f)}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-emerald-50"
                  >
                    <span className="font-medium">{f.name}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      {f.owner?.email} {f.owner?.rut ? `(${f.owner.rut})` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedFamily && (
            <p className="text-xs text-emerald-700">
              Seleccionada: {selectedFamily.name} ({selectedFamily.owner?.email})
            </p>
          )}
          <input
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              const match = reasons.find((r: any) => r.reason === e.target.value);
              if (match) setAmount(String(match.amount));
            }}
            list="reason-suggestions"
            placeholder="Motivo"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <datalist id="reason-suggestions">
            {reasons.map((r: any, i: number) => (
              <option key={i} value={r.reason} />
            ))}
          </datalist>
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
                        <button onClick={() => handleMarkPaid(f.id)} className="text-xs text-emerald-600 hover:underline">
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
