"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { calculateTotal, DEFAULT_PRICING, type AddOnSpacePrice } from "@/lib/pricing";
import { AppNav } from "@/components/AppNav";

interface FamilyMemberItem {
  id: string;
  fullName: string;
  relation: string;
  rut?: string | null;
}

interface FamilyInfo {
  id: string;
  name: string;
  members: FamilyMemberItem[];
}

interface AddOnSpaceItem extends AddOnSpacePrice {
  id: string;
  name: string;
  pricePerUnit: number;
  capacityGuests: number | null;
  dailyLimit?: number | null;
  availableToday?: number | null;
  familyAlreadyBooked?: boolean;
}

interface ExtraGuest {
  id: string;
  fullName: string;
  rut: string;
  usesPool: boolean;
}

export default function ReservarPage() {
  const router = useRouter();

  // State
  const [date, setDate] = useState("");
  const [spaces, setSpaces] = useState<AddOnSpaceItem[]>([]);
  const [selectedSpaces, setSelectedSpaces] = useState<Record<string, boolean>>({});
  const [extraGuests, setExtraGuests] = useState<ExtraGuest[]>([]);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestRut, setNewGuestRut] = useState("");
  const [newGuestPool, setNewGuestPool] = useState(false);

  const [recurring, setRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState(6); // 0=Dom..6=Sab
  const [recurringWeeks, setRecurringWeeks] = useState(4);

  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [loadingFamily, setLoadingFamily] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReservation, setSuccessReservation] = useState<any | null>(null);

  // Today's date in YYYY-MM-DD for min attribute
  const todayStr = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Fetch add-on spaces (con disponibilidad si hay fecha)
  useEffect(() => {
    async function loadSpaces() {
      try {
        setLoadingSpaces(true);
        const url = date ? `/api/addon-spaces?date=${date}` : "/api/addon-spaces";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setSpaces(data);
        } else if (res.status === 401) {
          router.push("/api/auth/signin?callbackUrl=/reservar");
        }
      } catch (err) {
        console.error("Error al cargar espacios:", err);
      } finally {
        setLoadingSpaces(false);
      }
    }
    loadSpaces();
  }, [router, date]);

  // Load family info (nucleus members)
  useEffect(() => {
    async function loadFamily() {
      try {
        const res = await fetch("/api/families");
        if (res.ok) {
          setFamily(await res.json());
        }
      } catch (err) {
        console.error("Error al cargar la familia:", err);
      } finally {
        setLoadingFamily(false);
      }
    }
    loadFamily();
  }, []);

  // Selected add-ons for calculation
  const addOnsPayload = useMemo(() => {
    return Object.entries(selectedSpaces)
      .filter(([, selected]) => selected)
      .map(([id]) => {
        const space = spaces.find((s) => s.id === id);
        return {
          addOnSpaceId: id,
          name: space?.name,
          quantity: 1,
          pricePerUnit: space?.pricePerUnit ?? 0,
        };
      });
  }, [selectedSpaces, spaces]);

  // Total calculation using pure calculateTotal
  const totalAmount = useMemo(() => {
    return calculateTotal(
      {
        extraPersons: extraGuests.map((g) => ({
          fullName: g.fullName,
          usesPool: g.usesPool,
        })),
        addOns: addOnsPayload,
      },
      {
        addOnSpaces: spaces,
      }
    );
  }, [extraGuests, addOnsPayload, spaces]);

  // Handlers for extra guests
  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuestName.trim()) return;

    setExtraGuests((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        fullName: newGuestName.trim(),
        rut: newGuestRut.trim(),
        usesPool: newGuestPool,
      },
    ]);
    setNewGuestName("");
    setNewGuestRut("");
    setNewGuestPool(false);
  };

  const handleRemoveGuest = (id: string) => {
    setExtraGuests((prev) => prev.filter((g) => g.id !== id));
  };

  const handleToggleGuestPool = (id: string) => {
    setExtraGuests((prev) =>
      prev.map((g) => (g.id === id ? { ...g, usesPool: !g.usesPool } : g))
    );
  };

  const handleToggleSpace = (spaceId: string) => {
    const space = spaces.find((s) => s.id === spaceId);
    if (space?.dailyLimit != null) {
      if (space.availableToday === 0 || space.familyAlreadyBooked) return;
    }
    setSelectedSpaces((prev) => ({
      ...prev,
      [spaceId]: !prev[spaceId],
    }));
  };

  // Submit reservation
  const generateRecurringDates = (): string[] => {
    const dates: string[] = [];
    const start = new Date(date + "T00:00:00.000Z");
    for (let w = 0; w < recurringWeeks; w++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + w * 7);
      // adjust to the selected weekday
      const diff = (recurringDay - d.getUTCDay() + 7) % 7;
      d.setUTCDate(d.getUTCDate() + diff);
      const iso = d.toISOString().slice(0, 10);
      if (!dates.includes(iso)) dates.push(iso);
    }
    return dates;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!date) {
      setErrorMessage("Por favor selecciona una fecha de reserva.");
      return;
    }

    setSubmitting(true);
    try {
      const dates = recurring ? generateRecurringDates() : [date];

      const payload = {
        extraPersons: extraGuests.map((g) => ({
          fullName: g.fullName,
          rut: g.rut,
          usesPool: g.usesPool,
        })),
        addOns: addOnsPayload.map((a) => ({
          addOnSpaceId: a.addOnSpaceId,
          quantity: a.quantity,
        })),
      };

      const results: any[] = [];
      for (const d of dates) {
        const res = await fetch("/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, date: d }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 409) {
            setErrorMessage(`Ya existe una reserva activa para tu familia el ${d}.`);
          } else {
            setErrorMessage(data.error || "Ocurrió un error al procesar la reserva.");
          }
          return;
        }
        results.push(data);
      }

      setSuccessReservation(results.length === 1 ? results[0] : { multiple: results.length, ids: results.map((r) => r.id) });
    } catch (err: any) {
      setErrorMessage(err.message || "Error de conexión al enviar la reserva.");
    } finally {
      setSubmitting(false);
    }
  };

  const poolUsersCount = extraGuests.filter((g) => g.usesPool).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <AppNav />
        {/* Header */}
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100 tracking-tight">
            Reserva de Parcela SSCC
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
            Reserva por día completo para tu familia, agrega invitados adicionales o
            arrienda espacios exclusivos como quincho y salas.
          </p>
        </div>

        {/* Success view */}
        {successReservation ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-8 border border-green-200">
            <div className="flex items-center space-x-3 text-green-700 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <h2 className="text-2xl font-bold">¡Reserva creada con éxito!</h2>
            </div>
            <p className="text-gray-700 dark:text-slate-300 mb-4">
              Tu reserva ha sido registrada en estado{" "}
              <span className="font-semibold text-amber-600">
                {successReservation.status}
              </span>
              .
            </p>
            <div className="bg-gray-50 dark:bg-slate-950 rounded-lg p-4 mb-6 space-y-2 border text-sm">
              <p>
                <span className="font-semibold text-gray-700 dark:text-slate-300">ID Reserva:</span>{" "}
                {successReservation.id}
              </p>
              <p>
                <span className="font-semibold text-gray-700 dark:text-slate-300">Fecha:</span>{" "}
                {new Date(successReservation.date).toLocaleDateString("es-CL", {
                  timeZone: "UTC",
                })}
              </p>
              <p>
                <span className="font-semibold text-gray-700 dark:text-slate-300">Total a pagar:</span>{" "}
                ${successReservation.totalAmount?.toLocaleString("es-CL")} CLP
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setSuccessReservation(null);
                  setDate("");
                  setSelectedSpaces({});
                  setExtraGuests([]);
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-gray-200 dark:bg-slate-700 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition"
              >
                Hacer otra reserva
              </button>
              <button
                onClick={() => router.push(`/reservas/${successReservation.id}`)}
                className="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
              >
                Ir al detalle y pago
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Error banner */}
            {errorMessage && (
              <div className="bg-red-50 dark:bg-red-950 border-l-4 border-red-500 p-4 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Form Controls */}
              <div className="lg:col-span-2 space-y-6">
                {/* Núcleo familiar */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-2">
                    Tu núcleo familiar
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                    Los integrantes de tu núcleo no pagan entrada. Para agregar o
                    editar integrantes ve a{" "}
                    <a href="/familia" className="font-medium text-emerald-600 underline">
                      Mi familia
                    </a>
                    .
                  </p>

                  {loadingFamily ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400">Cargando...</p>
                  ) : !family ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-800">
                      Aún no has creado tu familia.{" "}
                      <a href="/familia" className="font-semibold underline">
                        Créala aquí
                      </a>{" "}
                      para poder reservar.
                    </p>
                  ) : family.members.length === 0 ? (
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      La familia &quot;{family.name}&quot; aún no tiene integrantes.{" "}
                      <a href="/familia" className="font-medium text-emerald-600 underline">
                        Agrégalos aquí
                      </a>
                      .
                    </p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {family.members.map((m) => (
                        <li
                          key={m.id}
                          className="rounded-full bg-emerald-50 dark:bg-emerald-950 px-3 py-1 text-sm text-emerald-800"
                        >
                          {m.fullName}{" "}
                          <span className="text-emerald-600">· {m.relation}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 1. Date Picker */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                  <label htmlFor="reservation-date" className="block text-base font-semibold text-gray-900 dark:text-slate-100 mb-2">
                    1. Fecha de Visita
                  </label>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                    El acceso es por el día completo. Múltiples familias pueden asistir el mismo día.
                  </p>
                  <input
                    id="reservation-date"
                    type="date"
                    min={todayStr}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full sm:w-72 px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-slate-100"
                  />
                </div>
                  <div className="mt-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                      <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="h-4 w-4 text-green-600 rounded border-gray-300" />
                      Reserva recurrente (varias semanas, mismo d�a de la semana)
                    </label>
                    {recurring && (
                      <div className="mt-2 flex flex-wrap gap-3 text-sm">
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">D�a de la semana</label>
                          <select value={recurringDay} onChange={(e) => setRecurringDay(Number(e.target.value))} className="rounded border border-gray-300 dark:border-slate-600 px-2 py-1 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
                            {["Domingo","Lunes","Martes","Mi�rcoles","Jueves","Viernes","S�bado"].map((d,i) => (<option key={i} value={i}>{d}</option>))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1">Semanas</label>
                          <select value={recurringWeeks} onChange={(e) => setRecurringWeeks(Number(e.target.value))} className="rounded border border-gray-300 dark:border-slate-600 px-2 py-1 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
                            {[2,3,4,6,8].map((w) => (<option key={w} value={w}>{w}</option>))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                {/* 2. Rentable Spaces */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-2">
                    2. Espacios Arrendables Opcionales
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                    Selecciona si deseas reservar de forma exclusiva alguno de los espacios.
                  </p>

                  {loadingSpaces ? (
                    <div className="text-sm text-gray-500 dark:text-slate-400 py-3">Cargando espacios...</div>
                  ) : spaces.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-slate-400 py-3">No hay espacios disponibles.</div>
                  ) : (
                    <div className="space-y-3">
                      {spaces.map((space) => {
                        const isChecked = Boolean(selectedSpaces[space.id]);
                        return (
                          <label
                            key={space.id}
                            className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition ${
                              isChecked
                                ? "border-green-600 bg-green-50/50 ring-1 ring-green-600"
                                : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSpace(space.id)}
                                className="h-5 w-5 text-green-600 rounded border-gray-300 dark:border-slate-600 focus:ring-green-500"
                              />
                              <div>
                                <span className="text-sm font-semibold text-gray-900 dark:text-slate-100 capitalize">
                                  {space.name.replace("_", " ")}
                                </span>
                                {space.capacityGuests && (
                                  <span className="block text-xs text-gray-500 dark:text-slate-400">
                                    Capacidad: hasta {space.capacityGuests} invitados
                                  </span>
                                )}
                                 {space.dailyLimit != null && (
                                   <span className={`block text-xs ${space.availableToday === 0 || space.familyAlreadyBooked ? "text-red-600" : "text-emerald-600"}`}>
                                     {space.familyAlreadyBooked ? "Ya reservaste uno hoy" : `Disponibles: ${space.availableToday} de ${space.dailyLimit}`}
                                   </span>
                                 )}
                              </div>
                            </div>
                            <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
                              ${space.pricePerUnit.toLocaleString("es-CL")} CLP
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Extra Guests */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                      3. Invitados Extra (Fuera del Núcleo)
                    </h2>
                    <span className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 px-2.5 py-1 rounded-full">
                      ${DEFAULT_PRICING.EXTRA_PERSON_PRICE.toLocaleString("es-CL")} c/u
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                    Tu núcleo familiar no paga costo de entrada. Los invitados adicionales tienen un costo
                    por persona (+${DEFAULT_PRICING.POOL_PRICE.toLocaleString("es-CL")} si usan la piscina).
                  </p>

                  {/* Add guest input */}
                  <div className="bg-gray-50 dark:bg-slate-950 p-3.5 rounded-lg border border-gray-200 dark:border-slate-700 mb-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        placeholder="Nombre completo del invitado"
                        value={newGuestName}
                        onChange={(e) => setNewGuestName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm text-gray-900 dark:text-slate-100 focus:ring-green-500 focus:border-green-500"
                      />
                      <input
                        type="text"
                        placeholder="RUT (opcional)"
                        value={newGuestRut}
                        onChange={(e) => setNewGuestRut(e.target.value)}
                        className="sm:w-40 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm text-gray-900 dark:text-slate-100 focus:ring-green-500 focus:border-green-500"
                      />
                      <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-slate-300 select-none py-1">
                        <input
                          type="checkbox"
                          checked={newGuestPool}
                          onChange={(e) => setNewGuestPool(e.target.checked)}
                          className="h-4 w-4 text-green-600 rounded border-gray-300 dark:border-slate-600 focus:ring-green-500"
                        />
                        <span>Usa piscina</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAddGuest}
                        disabled={!newGuestName.trim()}
                        className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-black transition disabled:opacity-40"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>

                  {/* Guest list */}
                  {extraGuests.length === 0 ? (
                    <p className="text-xs text-gray-400 italic text-center py-2">
                      No has agregado invitados extra.
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {extraGuests.map((guest) => (
                        <li
                          key={guest.id}
                          className="py-2.5 flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-800">
                              {guest.fullName}
                            </span>
                            {guest.usesPool && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                Piscina
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={() => handleToggleGuestPool(guest.id)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {guest.usesPool ? "Quitar piscina" : "+ Piscina"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveGuest(guest.id)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Eliminar
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Right Column: Pricing Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 sticky top-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 pb-4 border-b border-gray-100 dark:border-slate-700">
                    Resumen de Reserva
                  </h3>

                  <div className="py-4 space-y-3 text-sm border-b border-gray-100 dark:border-slate-700">
                    <div className="flex justify-between text-gray-600 dark:text-slate-400">
                      <span>Núcleo Familiar Base</span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">$0 CLP</span>
                    </div>

                    <div className="flex justify-between text-gray-600 dark:text-slate-400">
                      <span>
                        Invitados Extra ({extraGuests.length})
                      </span>
                      <span className="font-medium text-gray-900 dark:text-slate-100">
                        ${(extraGuests.length * DEFAULT_PRICING.EXTRA_PERSON_PRICE).toLocaleString("es-CL")} CLP
                      </span>
                    </div>

                    {poolUsersCount > 0 && (
                      <div className="flex justify-between text-gray-600 dark:text-slate-400">
                        <span>
                          Piscina Invitados ({poolUsersCount})
                        </span>
                        <span className="font-medium text-gray-900 dark:text-slate-100">
                          ${(poolUsersCount * DEFAULT_PRICING.POOL_PRICE).toLocaleString("es-CL")} CLP
                        </span>
                      </div>
                    )}

                    {addOnsPayload.map((addon) => (
                      <div key={addon.addOnSpaceId} className="flex justify-between text-gray-600 dark:text-slate-400">
                        <span className="capitalize">{addon.name?.replace("_", " ")}</span>
                        <span className="font-medium text-gray-900 dark:text-slate-100">
                          ${addon.pricePerUnit.toLocaleString("es-CL")} CLP
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 pb-6 flex justify-between items-baseline">
                    <span className="text-base font-bold text-gray-900 dark:text-slate-100">Total a Pagar</span>
                    <span className="text-2xl font-extrabold text-green-700">
                      ${totalAmount.toLocaleString("es-CL")} CLP
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !date}
                    className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed text-center"
                  >
                    {submitting ? "Procesando..." : "Reservar y pagar"}
                  </button>
                  <p className="mt-2 text-center text-xs text-gray-400">
                    La reserva quedará en estado Pendiente de Pago hasta completar la transacción.
                  </p>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
