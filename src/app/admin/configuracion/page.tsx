"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { AdminNav } from "@/components/AdminNav";

export default function AdminConfiguracionPage() {
  const [gmailUser, setGmailUser] = useState("");
  const [gmailAppPassword, setGmailAppPassword] = useState("");
  const [emailFrom, setEmailFrom] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankAccountType, setBankAccountType] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankRut, setBankRut] = useState("");
  const [bankEmail, setBankEmail] = useState("");
  const [fineReasonsText, setFineReasonsText] = useState("");
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
        setBankName(d.bankName ?? "");
        setBankAccountType(d.bankAccountType ?? "");
        setBankAccountNumber(d.bankAccountNumber ?? "");
        setBankRut(d.bankRut ?? "");
        setBankEmail(d.bankEmail ?? "");
        const fr = Array.isArray(d.fineReasons) ? d.fineReasons : [];
        setFineReasonsText(fr.map((x: any) => `${x.reason}: ${x.amount}`).join("\n"));
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
      const body: any = { gmailUser, emailFrom, bankName, bankAccountType, bankAccountNumber, bankRut, bankEmail };
      if (gmailAppPassword.trim() !== "") body.gmailAppPassword = gmailAppPassword;
      const fineReasons = fineReasonsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [reason, amount] = line.split(":").map((s) => s.trim());
          return { reason, amount: Number(amount) || 0 };
        })
        .filter((x) => x.reason);
      body.fineReasons = fineReasons;
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg("Configuración guardada correctamente.");
        setGmailAppPassword("");
        load();
      } else {
        setMsg(data.error || "Error al guardar");
      }
    } catch {
      setMsg("Error de conexión");
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
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Configuración</h1>
        <p className="mt-2 text-sm text-gray-600">
          Configura el correo (Gmail) y los datos bancarios para transferencias.
        </p>

        <form onSubmit={handleSave} className="mt-6 space-y-6">
          {/* Correo */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Correo electrónico (Gmail)</h2>
            <p className="text-xs text-gray-500 mb-4">
              Se usa para enviar confirmaciones, recordatorios y multas.
            </p>
            <div className="space-y-3">
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
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Contraseña de aplicación (App Password)
                </label>
                <input
                  type="password"
                  value={gmailAppPassword}
                  onChange={(e) => setGmailAppPassword(e.target.value)}
                  placeholder={hasPassword ? "Dejar vacío para no cambiar" : "16 caracteres de Gmail"}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se crea en myaccount.google.com/apppasswords (requiere verificación en 2 pasos).
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
            </div>
          </section>

          {/* Datos bancarios */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Datos bancarios</h2>
            <p className="text-xs text-gray-500 mb-4">
              Se muestran a los socios cuando pagan una multa por transferencia.
            </p>
            <div className="space-y-3">
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Banco (ej. Banco Estado)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input value={bankAccountType} onChange={(e) => setBankAccountType(e.target.value)} placeholder="Tipo de cuenta (ej. Cuenta Corriente)" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder="Número de cuenta" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input value={bankRut} onChange={(e) => setBankRut(e.target.value)} placeholder="RUT de la cuenta" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input value={bankEmail} onChange={(e) => setBankEmail(e.target.value)} placeholder="Correo para comprobantes" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </section>

          {/* Motivos de multa */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Motivos de multa (sugeridos)</h2>
            <p className="text-xs text-gray-500 mb-4">
              Un motivo por línea, formato: <code>Motivo: Monto</code> (ej. "Daño a quincho: 15000").
              Al crear una multa, estos aparecen en el autocompletado y el monto se llena solo.
            </p>
            <textarea
              value={fineReasonsText}
              onChange={(e) => setFineReasonsText(e.target.value)}
              rows={6}
              placeholder={"Daño a quincho: 15000\nRuido excesivo: 10000\nNo limpió el espacio: 5000"}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
            />
          </section>

          {msg && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar configuración"}
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Cómo obtener la App Password de Gmail:</strong>
          <ol className="mt-2 list-decimal pl-5 space-y-1">
            <li>Ve a <a href="https://myaccount.google.com/security" target="_blank" className="underline">Seguridad de Google</a> y activa la verificación en 2 pasos.</li>
            <li>Luego ve a <a href="https://myaccount.google.com/apppasswords" target="_blank" className="underline">Contraseñas de aplicaciones</a>.</li>
            <li>Selecciona "Correo" y "Otro (nombre personalizado)" escribiendo "Parcela SSCC".</li>
            <li>Copia los 16 caracteres y pégalos en el campo de arriba.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
