"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { AdminNav } from "@/components/AdminNav";

export default function AdminEspaciosPage() {
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/spaces")
      .then((r) => r.json())
      .then((d) => setSpaces(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const update = async (id: string, field: string, value: any) => {
    await fetch("/api/admin/spaces", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value }),
    });
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#ff00ff] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <AppNav />
        <AdminNav />
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-[#00ff00]">Espacios arrendables</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-[#ffff00]">Edita precio y capacidad de los espacios.</p>

        {loading ? (
          <p className="mt-6 text-sm text-gray-500 dark:text-[#ffff00]">Cargando...</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 dark:border-[#00ffff] bg-white dark:bg-[#ff00ff] shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-[#ffff00] border-b bg-gray-50 dark:bg-[#ff00ff]">
                  <th className="px-4 py-2">Espacio</th>
                  <th className="px-4 py-2">Precio (CLP)</th>
                  <th className="px-4 py-2">Capacidad</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {spaces.map((s: any) => (
                  <tr key={s.id} className="border-b">
                    <td className="px-4 py-2 font-medium capitalize">{s.name.replace("_", " ")}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        defaultValue={s.pricePerUnit}
                        onBlur={(e) => update(s.id, "pricePerUnit", Number(e.target.value))}
                        className="w-28 rounded border border-gray-300 dark:border-[#00ffff] px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        defaultValue={s.capacityGuests ?? ""}
                        placeholder="Sin límite"
                        onBlur={(e) =>
                          update(s.id, "capacityGuests", e.target.value ? Number(e.target.value) : null)
                        }
                        className="w-28 rounded border border-gray-300 dark:border-[#00ffff] px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-400">Guardado al salir del campo</td>
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
