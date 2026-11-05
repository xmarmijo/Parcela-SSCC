"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import Link from "next/link";

export default function PerfilPage() {
  const [user, setUser] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg("Contraseña actualizada correctamente.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(data.error || "Error al cambiar la contraseña");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#011627] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <AppNav />
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-[#d6deeb]">Mi perfil</h1>

        <div className="mt-6 rounded-xl border border-gray-200 dark:border-[#1d3b53] bg-white dark:bg-[#011627] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[#d6deeb] mb-3">Datos de la cuenta</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500 dark:text-[#637777]">Correo</span><span className="font-medium">{user?.email}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-[#637777]">RUT</span><span className="font-medium">{user?.rut ?? "-"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-[#637777]">Rol</span><span className="font-medium">{user?.role}</span></div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 dark:border-[#1d3b53] bg-white dark:bg-[#011627] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-[#d6deeb] mb-3">Cambiar contraseña</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-[#d6deeb]">Contraseña actual</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 bg-white dark:bg-[#0b253a] dark:text-[#d6deeb] dark:border-[#1d3b53] pr-10"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700">
                  {showCurrent ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-[#d6deeb]">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 bg-white dark:bg-[#0b253a] dark:text-[#d6deeb] dark:border-[#1d3b53] pr-10"
                  placeholder="Mínimo 6 caracteres"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700">
                  {showNew ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-[#d6deeb]">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 bg-white dark:bg-[#0b253a] dark:text-[#d6deeb] dark:border-[#1d3b53]"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
                {error}
              </div>
            )}
            {msg && (
              <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 dark:bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Cambiar contraseña"}
            </button>
          </form>
        </div>

        <div className="mt-4">
          <Link href="/mis-reservas" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">← Volver</Link>
        </div>
      </div>
    </div>
  );
}
