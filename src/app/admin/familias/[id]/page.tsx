"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { AdminNav } from "@/components/AdminNav";
import Link from "next/link";

export default function AdminFamiliaDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const [family, setFamily] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`/api/admin/families/${id}`)
      .then((r) => r.json())
      .then(setFamily)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (!family) return <div className="min-h-screen flex items-center justify-center">No encontrada</div>;

  const handleRoleChange = async (role: string) => {
    await fetch(`/api/admin/families/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerRole: role }),
    });
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#12161A] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <AppNav />
        <AdminNav />
        <Link href="/admin/familias" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
          ← Volver
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-[#E2E8F0]">{family.name}</h1>
        {family.code && <p className="text-sm text-gray-500 dark:text-slate-400 font-mono">Código: {family.code}</p>}
        <p className="mt-1 text-sm text-gray-600 dark:text-[#94a3b8]">
          Titular: {family.owner?.email ?? "Sin registrar"} {family.owner?.rut ? `(${family.owner.rut})` : ""}
        </p>
        {family.owner && (
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span>Rol titular:</span>
            <select
              value={family.owner.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="rounded border border-gray-300 dark:border-[#2a3440] px-2 py-1"
            >
              <option value="SOCIO">SOCIO</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-gray-200 dark:border-[#2a3440] bg-white dark:bg-[#12161A] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[#E2E8F0] mb-3">Integrantes</h2>
          <ul className="divide-y divide-gray-100">
            {family.members?.map((m: any) => (
              <li key={m.id} className="py-2 text-sm">
                <span className="font-medium">{m.fullName}</span>
                <span className="ml-2 text-gray-500 dark:text-[#94a3b8]">
                  {m.relation}
                  {m.rut ? ` · ${m.rut}` : ""}
                  {m.course ? ` · ${m.course}` : ""}
                  {m.exAlumno ? " · Exalumno" : ""}
                </span>
                {m.user?.email ? (
                  <span className="ml-2 rounded-full bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 text-xs text-emerald-700">
                    {m.user.email}
                  </span>
                ) : (
                  <span className="ml-2 rounded-full bg-gray-100 dark:bg-[#1A2026] px-2 py-0.5 text-xs text-gray-500 dark:text-[#94a3b8]">
                    Sin cuenta de acceso
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 dark:border-[#2a3440] bg-white dark:bg-[#12161A] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[#E2E8F0] mb-3">Reservas</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-[#94a3b8] border-b">
                <th className="py-2">Fecha</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {family.reservations?.map((r: any) => (
                <tr key={r.id} className="border-b">
                  <td className="py-2">{new Date(r.date).toLocaleDateString("es-CL", { timeZone: "UTC" })}</td>
                  <td className="py-2">{r.status}</td>
                  <td className="py-2">${Number(r.totalAmount).toLocaleString("es-CL")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 dark:border-[#2a3440] bg-white dark:bg-[#12161A] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[#E2E8F0] mb-3">Multas</h2>
          <ul className="divide-y divide-gray-100">
            {family.fines?.map((f: any) => (
              <li key={f.id} className="py-2 text-sm flex justify-between">
                <span>{f.reason}</span>
                <span className="font-medium">${Number(f.amount).toLocaleString("es-CL")}</span>
              </li>
            ))}
            {!family.fines?.length && <li className="text-sm text-gray-500 dark:text-[#94a3b8]">Sin multas</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
