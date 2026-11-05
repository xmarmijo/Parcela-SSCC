"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppNav } from "@/components/AppNav";

interface Reservation {
  id: string;
  date: string;
  status: string;
  totalAmount: number;
  family?: { name: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE_PAGO: "Pendiente de pago",
  CONFIRMADA: "Confirmada",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
};

const STATUS_STYLE: Record<string, string> = {
  PENDIENTE_PAGO: "bg-amber-50 dark:bg-amber-950 text-amber-700 border-amber-200",
  CONFIRMADA: "bg-green-50 text-green-700 border-green-200",
  COMPLETADA: "bg-gray-100 dark:bg-[#0b253a] text-gray-700 dark:text-[#d6deeb] border-gray-200 dark:border-[#1d3b53]",
  CANCELADA: "bg-red-50 dark:bg-red-950 text-red-700 border-red-200",
};

export default function MisReservasPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reservations");
      if (res.status === 401) {
        router.push("/login?callbackUrl=/mis-reservas");
        return;
      }
      if (!res.ok) {
        setError("No se pudieron cargar tus reservas.");
        return;
      }
      setReservations(await res.json());
    } catch {
      setError("Error de conexión al cargar tus reservas.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#011627] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <AppNav />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-[#d6deeb]">
            Mis Reservas
          </h1>
          <Link
            href="/reservar"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Nueva reserva
          </Link>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-gray-500 dark:text-[#637777]">Cargando...</p>
        ) : reservations.length === 0 ? (
          <div className="mt-6 rounded-xl border border-gray-200 dark:border-[#1d3b53] bg-white dark:bg-[#011627] p-8 text-center shadow-sm">
            <p className="text-gray-600 dark:text-[#637777]">Todavía no tienes reservas.</p>
            <Link
              href="/reservar"
              className="mt-4 inline-block rounded-lg bg-emerald-600 px-5 py-2 font-medium text-white hover:bg-emerald-700"
            >
              Hacer mi primera reserva
            </Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {reservations.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/reservas/${r.id}`}
                  className="block rounded-xl border border-gray-200 dark:border-[#1d3b53] bg-white dark:bg-[#011627] p-5 shadow-sm transition-colors hover:border-emerald-300"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-[#d6deeb]">
                        {new Date(r.date).toLocaleDateString("es-CL", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-[#637777]">
                        Total: ${Number(r.totalAmount).toLocaleString("es-CL")} CLP
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        STATUS_STYLE[r.status] || "border-gray-200 dark:border-[#1d3b53] bg-gray-50 dark:bg-[#011627] text-gray-700 dark:text-[#d6deeb]"
                      }`}
                    >
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
