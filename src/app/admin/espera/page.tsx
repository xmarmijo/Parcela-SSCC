"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { AdminNav } from "@/components/AdminNav";

export default function AdminEsperaPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/waitlist")
      .then((r) => r.json())
      .then((d) => setEntries(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar de la lista de espera?")) return;
    const res = await fetch(`/api/waitlist?id=${id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <AppNav />
        <AdminNav />
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Lista de espera</h1>
        <p className="mt-2 text-sm text-gray-600">Familias anotadas cuando un espacio está lleno.</p>

        {loading ? (
          <p className="mt-6 text-sm text-gray-500">Cargando...</p>
        ) : entries.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">No hay familias en lista de espera.</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b bg-gray-50">
                  <th className="px-4 py-2">Familia</th>
                  <th className="px-4 py-2">Titular</th>
                  <th className="px-4 py-2">Fecha solicitada</th>
                  <th className="px-4 py-2">Anotado el</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e: any) => (
                  <tr key={e.id} className="border-b">
                    <td className="px-4 py-2">{e.family?.name}</td>
                    <td className="px-4 py-2">{e.family?.owner?.email ?? "-"}</td>
                    <td className="px-4 py-2">{new Date(e.date).toLocaleDateString("es-CL", { timeZone: "UTC" })}</td>
                    <td className="px-4 py-2">{new Date(e.createdAt).toLocaleDateString("es-CL")}</td>
                    <td className="px-4 py-2">
                      <button onClick={() => handleDelete(e.id)} className="text-xs text-red-600 hover:underline">
                        Eliminar
                      </button>
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
