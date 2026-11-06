"use client";

import { useState } from "react";
import { AppNav } from "@/components/AppNav";
import { AdminNav } from "@/components/AdminNav";

export default function AdminNotificacionesPage() {
  const [reminderResult, setReminderResult] = useState<any>(null);
  const [weeklyResult, setWeeklyResult] = useState<any>(null);
  const [loadingR, setLoadingR] = useState(false);
  const [loadingW, setLoadingW] = useState(false);

  const sendReminders = async () => {
    setLoadingR(true);
    setReminderResult(null);
    try {
      const res = await fetch("/api/admin/notify/reminders", { method: "POST" });
      const data = await res.json();
      setReminderResult(data);
    } catch {
      setReminderResult({ error: "Error de conexión" });
    } finally {
      setLoadingR(false);
    }
  };

  const sendWeekly = async () => {
    setLoadingW(true);
    setWeeklyResult(null);
    try {
      const res = await fetch("/api/admin/notify/weekly", { method: "POST" });
      const data = await res.json();
      setWeeklyResult(data);
    } catch {
      setWeeklyResult({ error: "Error de conexión" });
    } finally {
      setLoadingW(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <AppNav />
        <AdminNav />
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Notificaciones</h1>
        <p className="mt-2 text-sm text-gray-600">
          Envío manual de recordatorios y resúmenes por correo (Gmail).
        </p>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recordatorios de reserva</h2>
            <p className="text-sm text-gray-600">
              Envía un recordatorio a los socios con reserva confirmada en los próximos 2 días.
            </p>
            <button
              onClick={sendReminders}
              disabled={loadingR}
              className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loadingR ? "Enviando..." : "Enviar recordatorios"}
            </button>
            {reminderResult && (
              <p className="mt-2 text-sm text-gray-700">
                Enviados: {reminderResult.sent ?? 0} · Omitidos: {reminderResult.skipped ?? 0} · Errores: {reminderResult.errors ?? 0}
                {reminderResult.error ? ` · ${reminderResult.error}` : ""}
              </p>
            )}
          </div>

          <div className="border-t pt-4">
            <h2 className="text-lg font-semibold text-gray-900">Resumen semanal</h2>
            <p className="text-sm text-gray-600">
              Envía a todos los admins un resumen de la última semana (reservas, ingresos, multas).
            </p>
            <button
              onClick={sendWeekly}
              disabled={loadingW}
              className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loadingW ? "Enviando..." : "Enviar resumen semanal"}
            </button>
            {weeklyResult && (
              <p className="mt-2 text-sm text-gray-700">
                {weeklyResult.success ? "Enviado correctamente" : weeklyResult.skipped ? "Omitido (sin admin o sin correo)" : weeklyResult.error ?? "Error"}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Configuración requerida:</strong> agrega en Vercel las variables
          <code className="mx-1 rounded bg-amber-100 px-1">GMAIL_USER</code> (tu correo Gmail) y
          <code className="mx-1 rounded bg-amber-100 px-1">GMAIL_APP_PASSWORD</code> (contraseña de aplicación de Gmail).
          Sin ellas, los correos se omiten (no fallan).
        </div>
      </div>
    </div>
  );
}
