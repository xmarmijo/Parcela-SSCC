"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppNav } from "@/components/AppNav";

interface Reservation {
  id: string;
  date: string;
  status: string;
  totalAmount: number;
  family?: { name: string } | null;
  extraPersons: Array<{ id: string; fullName: string; rut?: string | null; isSocio?: boolean; usesPool: boolean }>;
  addOns: Array<{
    id: string;
    quantity: number;
    addOnSpace?: { name: string; pricePerUnit: number } | null;
  }>;
  payments: Array<{ id: string; status: string; amount: number }>;
  qrTokens: Array<{ id: string; token: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE_PAGO: "Pendiente de pago",
  CONFIRMADA: "Confirmada",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

export default function ReservaDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string;

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reservations/${id}`);
      if (res.status === 401) {
        router.push(`/login?callbackUrl=/reservas/${id}`);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo cargar la reserva.");
        return;
      }
      setReservation(data);
    } catch {
      setError("Error de conexión al cargar la reserva.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePay = async () => {
    if (!reservation) return;
    setError(null);
    setPaying(true);
    try {
      const res = await fetch("/api/payments/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: reservation.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error ||
            "No se pudo iniciar el pago. Revisa la configuración de Mercado Pago."
        );
        return;
      }
      if (data.free) {
        await load();
        return;
      }
      const url = data.isTest
        ? data.sandbox_init_point || data.init_point
        : data.init_point || data.sandbox_init_point;
      if (url) {
        window.location.href = url;
        return;
      }
      setError("Mercado Pago no devolvió un enlace de pago.");
    } catch {
      setError("Error de conexión al iniciar el pago.");
    } finally {
      setPaying(false);
    }
  };

  const handleCancel = async () => {
    if (!reservation) return;
    if (!confirm("¿Seguro que quieres cancelar esta reserva?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo cancelar la reserva.");
        return;
      }
      await load();
    } catch {
      setError("Error de conexión al cancelar la reserva.");
    }
  };

  const qrToken = reservation?.qrTokens?.[0]?.token;

  const saveEdit = async (extraPersons: any[], addOns: any[]) => {
    if (!reservation) return;
    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraPersons, addOns }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo actualizar la reserva.");
        return;
      }
      setReservation(data);
    } catch {
      setError("Error de conexión al actualizar.");
    }
  };

  const handleAddGuestDetail = async () => {
    if (!reservation) return;
    const name = prompt("Nombre del invitado:");
    if (!name?.trim()) return;
    const rut = prompt("RUT (opcional):") ?? "";
    const pool = confirm("¿Usa piscina?");
    const newGuests = [
      ...reservation.extraPersons.map((p) => ({
        fullName: p.fullName,
        rut: p.rut,
        isSocio: p.isSocio,
        usesPool: p.usesPool,
      })),
      { fullName: name.trim(), rut: rut.trim() || null, usesPool: pool },
    ];
    const newAddOns = reservation.addOns.map((a) => ({
      addOnSpaceId: a.addOnSpace?.name || "",
      quantity: a.quantity,
    }));
    await saveEdit(newGuests, newAddOns);
  };

  const handleRemoveGuestDetail = async (guestId: string) => {
    if (!reservation) return;
    const newGuests = reservation.extraPersons
      .filter((p) => p.id !== guestId)
      .map((p) => ({
        fullName: p.fullName,
        rut: p.rut,
        isSocio: p.isSocio,
        usesPool: p.usesPool,
      }));
    const newAddOns = reservation.addOns.map((a) => ({
      addOnSpaceId: a.addOnSpace?.name || "",
      quantity: a.quantity,
    }));
    await saveEdit(newGuests, newAddOns);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <AppNav />

        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-zinc-50">
          Detalle de la Reserva
        </h1>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-gray-500 dark:text-zinc-400">Cargando...</p>
        ) : !reservation ? (
          <div className="mt-6 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center shadow-sm">
            <p className="text-gray-600 dark:text-zinc-400">Reserva no encontrada.</p>
            <Link href="/mis-reservas" className="mt-4 inline-block text-emerald-700 underline">
              Volver a mis reservas
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-gray-500 dark:text-zinc-400">
                    {reservation.family?.name}
                  </p>
                  <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-zinc-50">
                    {new Date(reservation.date).toLocaleDateString("es-CL", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </p>
                </div>
                <span className="rounded-full border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 px-3 py-1 text-xs font-medium text-gray-700 dark:text-zinc-50">
                  {STATUS_LABEL[reservation.status] || reservation.status}
                </span>
              </div>

              <div className="mt-5 space-y-2 border-t border-gray-100 dark:border-zinc-800 pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-zinc-400">Espacios</span>
                  <span className="font-medium text-gray-900 dark:text-zinc-50">
                    {reservation.addOns.length > 0
                      ? reservation.addOns
                          .map((a) => a.addOnSpace?.name || "Espacio")
                          .join(", ")
                      : "Uso general de parcela"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-zinc-400">Invitados extra</span>
                  <span className="font-medium text-gray-900 dark:text-zinc-50">
                    {reservation.extraPersons.length > 0 ? (
                      <ul className="text-right space-y-0.5">
                        {reservation.extraPersons.map((p) => (
                          <li key={p.id}>
                            {p.fullName}
                            {p.rut ? (
                              <span className="ml-1 text-xs text-gray-500 dark:text-zinc-400">
                                ({p.rut})
                              </span>
                            ) : null}
                            {p.usesPool ? (
                              <span className="ml-1 text-xs text-blue-700">
                                (piscina)
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "Sin invitados extra"
                  )}
                  {reservation.status === "PENDIENTE_PAGO" && (
                    <div className="mt-2">
                      <button onClick={handleAddGuestDetail} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">+ Agregar invitado</button>
                    </div>
                  )}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-100 dark:border-zinc-800 pt-3">
                  <span className="font-semibold text-gray-800">Total</span>
                  <span className="text-lg font-bold text-emerald-700">
                    ${Number(reservation.totalAmount).toLocaleString("es-CL")} CLP
                  </span>
                </div>
              </div>
            </div>

            {qrToken && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950 p-6 text-center">
                <p className="text-sm font-medium text-emerald-800">
                  Tu pase de acceso está listo
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/qr/${qrToken}`}
                  alt="Código QR de acceso"
                  className="mx-auto mt-4 h-56 w-56 rounded-lg border border-emerald-200 bg-white dark:bg-zinc-900 p-2"
                />
                <p className="mt-3 break-all font-mono text-xs text-emerald-700">
                  {qrToken}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <a
                    href={`/api/qr/${qrToken}`}
                    download={`qr-${qrToken}.png`}
                    className="rounded-lg bg-emerald-600 dark:bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 dark:hover:bg-emerald-600"
                  >
                    Descargar QR
                  </a>
                  <button
                    onClick={() => window.print()}
                    className="rounded-lg border border-gray-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-zinc-50 hover:bg-gray-50 dark:bg-zinc-900"
                  >
                    Imprimir comprobante
                  </button>
                </div>
              </div>
            )}

            {reservation.payments.length > 0 && (
              <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-50 mb-3">Comprobantes de pago</h2>
                <ul className="divide-y divide-gray-100">
                  {reservation.payments.map((p) => (
                    <li key={p.id} className="py-2 text-sm flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-zinc-50">
                          {p.status === "APPROVED" ? "Pago aprobado" : p.status}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400">Ref: {p.id}</p>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-zinc-50">
                        ${Number(p.amount).toLocaleString("es-CL")} CLP
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {reservation.status === "PENDIENTE_PAGO" && (
                <>
                  <button
                    onClick={handlePay}
                    disabled={paying}
                    className="rounded-lg bg-emerald-600 dark:bg-emerald-700 px-6 py-2.5 font-medium text-white transition-colors hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {paying
                      ? "Procesando..."
                      : reservation.totalAmount > 0
                      ? "Pagar ahora"
                      : "Confirmar reserva"}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="rounded-lg border border-gray-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-2.5 font-medium text-gray-700 dark:text-zinc-50 transition-colors hover:bg-gray-50 dark:bg-zinc-900"
                  >
                    Cancelar reserva
                  </button>
                </>
              )}
              <Link
                href="/mis-reservas"
                className="rounded-lg border border-gray-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-2.5 font-medium text-gray-700 dark:text-zinc-50 transition-colors hover:bg-gray-50 dark:bg-zinc-900"
              >
                Volver
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
