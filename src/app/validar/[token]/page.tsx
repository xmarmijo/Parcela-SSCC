import React from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { validateQrToken } from "@/lib/qr";

interface ValidarPageProps {
  params: Promise<{ token: string }> | { token: string };
}

export default async function ValidarPage(props: ValidarPageProps) {
  const { token } = await Promise.resolve(props.params);
  let checkedInBy: string | null = null;
  try {
    const session = await auth();
    checkedInBy = session?.user?.id ?? null;
  } catch {
    checkedInBy = null;
  }
  const result = await validateQrToken(token, checkedInBy);

  const formatDateTime = (d: Date | string | null | undefined) => {
    if (!d) return "-";
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleString("es-CL", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatDateOnly = (d: Date | string | null | undefined) => {
    if (!d) return "-";
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleDateString("es-CL", {
      timeZone: "UTC",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-xl">
        {/* Parcela SSCC Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 mb-3 font-bold text-xl">
            SSCC
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            Parcela SSCC — Control de Acceso
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Validación de pase de ingreso y reservas
          </p>
        </div>

        {/* State: INVALID */}
        {result.status === "INVALID" && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-red-200">
            <div className="bg-red-500 p-6 text-white text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-400 bg-opacity-40 mb-3">
                <svg
                  className="w-10 h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                Código QR Inválido
              </h2>
              <p className="mt-1 text-red-100 text-sm">
                No se encontró ninguna reserva asociada a este código
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-50 text-red-800 rounded-lg p-4 text-sm border border-red-100">
                <p className="font-semibold">El pase escaneado no es válido.</p>
                <p className="text-xs text-red-600 mt-1 break-all">
                  Token: {token}
                </p>
              </div>

              <div className="pt-2 text-center">
                <Link
                  href="/"
                  className="inline-block px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
                >
                  Volver al inicio
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* State: ALREADY_USED */}
        {result.status === "ALREADY_USED" && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-amber-200">
            <div className="bg-amber-500 p-6 text-white text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-400 bg-opacity-40 mb-3">
                <svg
                  className="w-10 h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="inline-block px-3 py-1 bg-amber-700 bg-opacity-50 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
                Pase ya validado
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                Código QR Ya Utilizado
              </h2>
              <p className="mt-1 text-amber-100 text-sm">
                Este código de acceso ya fue registrado con anterioridad
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-amber-800 font-medium">
                    Fecha y hora de primer uso:
                  </span>
                  <span className="font-bold text-amber-900">
                    {formatDateTime(result.usedAt)}
                  </span>
                </div>
              </div>

              {/* Reservation info */}
              <div className="space-y-3 text-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 border-b pb-1">
                  Datos de la reserva
                </h3>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Familia:</span>
                  <span className="font-semibold text-gray-900">
                    {result.qrRecord?.reservation?.family?.name || "Sin nombre"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Fecha de visita:</span>
                  <span className="font-semibold text-gray-900 capitalize">
                    {formatDateOnly(result.qrRecord?.reservation?.date)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Estado:</span>
                  <span className="font-medium text-emerald-700">
                    {result.qrRecord?.reservation?.status}
                  </span>
                </div>

                {/* Add-on spaces */}
                {result.qrRecord?.reservation?.addOns?.length > 0 && (
                  <div className="py-1">
                    <span className="text-gray-500 block mb-1">
                      Espacios reservados:
                    </span>
                    <ul className="space-y-1 pl-2">
                      {result.qrRecord.reservation.addOns.map((addon: any) => (
                        <li
                          key={addon.id}
                          className="text-gray-800 font-medium text-xs bg-gray-100 rounded px-2 py-1 inline-block mr-1"
                        >
                          {addon.addOnSpace?.name || "Espacio"} (x{addon.quantity})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Extra persons */}
                {result.qrRecord?.reservation?.extraPersons?.length > 0 && (
                  <div className="py-1">
                    <span className="text-gray-500 block mb-1">
                      Invitados extra (
                      {result.qrRecord.reservation.extraPersons.length}):
                    </span>
                    <div className="space-y-1">
                      {result.qrRecord.reservation.extraPersons.map(
                        (person: any) => (
                          <div
                            key={person.id}
                            className="flex justify-between text-xs text-gray-700 bg-gray-50 p-2 rounded"
                          >
                            <span>{person.fullName}</span>
                            <span className="text-gray-500">
                              {person.usesPool ? "Con piscina" : "Sin piscina"}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 text-center">
                <Link
                  href="/"
                  className="inline-block px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
                >
                  Volver al inicio
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* State: VALID (First Use) */}
        {result.status === "VALID" && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-emerald-200">
            <div className="bg-emerald-600 p-6 text-white text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500 bg-opacity-40 mb-3">
                <svg
                  className="w-10 h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="inline-block px-3 py-1 bg-emerald-800 bg-opacity-40 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
                Ingreso Autorizado
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                ¡Pase Validado Exitosamente!
              </h2>
              <p className="mt-1 text-emerald-100 text-sm">
                Registro de acceso procesado en este momento
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-800 font-medium">
                    Hora de ingreso registrada:
                  </span>
                  <span className="font-bold text-emerald-900">
                    {formatDateTime(result.usedAt)}
                  </span>
                </div>
              </div>

              {/* Reservation Info */}
              <div className="space-y-3 text-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 border-b pb-1">
                  Detalles del Grupo / Familia
                </h3>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Familia:</span>
                  <span className="font-bold text-gray-900 text-base">
                    {result.qrRecord?.reservation?.family?.name || "Sin nombre"}
                  </span>
                </div>
                {result.qrRecord?.reservation?.family?.owner?.email && (
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500">Titular (email):</span>
                    <span className="text-gray-700">
                      {result.qrRecord.reservation.family.owner.email}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Fecha de visita:</span>
                  <span className="font-semibold text-gray-900 capitalize">
                    {formatDateOnly(result.qrRecord?.reservation?.date)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Total pagado:</span>
                  <span className="font-semibold text-gray-900">
                    $
                    {result.qrRecord?.reservation?.totalAmount?.toLocaleString(
                      "es-CL"
                    )}{" "}
                    CLP
                  </span>
                </div>

                {/* Add-ons */}
                {result.qrRecord?.reservation?.addOns?.length > 0 && (
                  <div className="py-1">
                    <span className="text-gray-500 block mb-1">
                      Espacios exclusivos arrendados:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {result.qrRecord.reservation.addOns.map((addon: any) => (
                        <span
                          key={addon.id}
                          className="bg-emerald-100 text-emerald-800 font-semibold text-xs px-2.5 py-1 rounded-md"
                        >
                          {addon.addOnSpace?.name || "Espacio"} (x{addon.quantity})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extra persons */}
                {result.qrRecord?.reservation?.extraPersons?.length > 0 && (
                  <div className="py-1">
                    <span className="text-gray-500 block mb-1">
                      Invitados adicionales (
                      {result.qrRecord.reservation.extraPersons.length}):
                    </span>
                    <div className="space-y-1">
                      {result.qrRecord.reservation.extraPersons.map(
                        (person: any) => (
                          <div
                            key={person.id}
                            className="flex justify-between text-xs text-gray-700 bg-gray-50 p-2 rounded"
                          >
                            <span className="font-medium">
                              {person.fullName}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] ${
                                person.usesPool
                                  ? "bg-blue-100 text-blue-800 font-medium"
                                  : "text-gray-500"
                              }`}
                            >
                              {person.usesPool ? "🏊 Piscina incluida" : "Sin piscina"}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 text-center">
                <Link
                  href="/"
                  className="inline-block px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition"
                >
                  Finalizar control
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
