"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { AdminNav } from "@/components/AdminNav";

export default function AdminConfiguracionPage() {
  const [gmailUser, setGmailUser] = useState("");
  const [gmailAppPassword, setGmailAppPassword] = useState("");
  const [emailFrom, setEmailFrom] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setGmailUser(d.gmailUser ?? "");
        setHasPassword(!!d.hasPassword);
        setEmailFrom(d.emailFrom ?? "");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const body: any = { gmailUser, emailFrom };
      if (gmailAppPassword.trim() !== "") body.gmailAppPassword = gmailAppPassword;
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg("Configuracion guardada correctamente.");
        setGmailAppPassword("");
        load();
      } else {
        setMsg(data.error || "Error al guardar");
      }
    } catch {
      setMsg("Error de conexion");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <AppNav />
          <AdminNav />
          <p className="mt-6 text-sm text-gray-500">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <AppNav />
        <AdminNav />
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Configuracion de correo</h1>
        <p className="mt-2 text-sm text-gray-600">Configura Gmail para enviar notificaciones a los socios.</p>

        <form onSubmit={handleSave} className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Correo Gmail</label>
            <input
              type="email"
              value={gmailUser}
              onChange={(e) => setGmailUser(e.target.value)}
              placeholder="tucorreo@gmail.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Contrasena de aplicacion (App Password)</label>
            <input
              type="password"
              value={gmailAppPassword}
              onChange={(e) => setGmailAppPassword(e.target.value)}
              placeholder={hasPassword ? "Dejar vacio para no cambiar" : "16 caracteres de Gmail"}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Se crea en https://myaccount.google.com/apppasswords (requiere verificacion en 2 pasos).
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Remitente (opcional)</label>
            <input
              type="text"
              value={emailFrom}
              onChange={(e) => setEmailFrom(e.target.value)}
              placeholder="Parcela SSCC <tucorreo@gmail.com>"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {msg && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar configuracion"}
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Como obtener la App Password:</strong>
          <ol className="mt-2 list-decimal pl-5 space-y-1">
            <li>Ve a Seguridad de Google y activa la verificacion en 2 pasos.</li>
            <li>Luego ve a Contrasenas de aplicaciones.</li>
            <li>Selecciona Correo y Otro (nombre personalizado) escribiendo Parcela SSCC.</li>
            <li>Copia los 16 caracteres y pegalos aqui.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
