"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { normalizeRut } from "@/lib/rut";

interface Member {
  id: string;
  fullName: string;
  relation: string;
  rut?: string | null;
  email?: string | null;
  course?: string | null;
  exAlumno?: boolean;
  user?: { id: string; email: string } | null;
}

interface Family {
  id: string;
  name: string;
  members: Member[];
}

export default function FamiliaPage() {
  const router = useRouter();

  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [familyName, setFamilyName] = useState("");
  const [creating, setCreating] = useState(false);

  const [memberName, setMemberName] = useState("");
  const [memberRut, setMemberRut] = useState("");
  const [relation, setRelation] = useState("hijo/a");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [memberMsg, setMemberMsg] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [fines, setFines] = useState<any[]>([]);
  const loadFines = () => {
    fetch("/api/fines")
      .then((r) => r.json())
      .then((d) => setFines(Array.isArray(d) ? d : []))
      .catch(() => setFines([]));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/families");
      if (res.status === 401) {
        router.push("/login?callbackUrl=/familia");
        return;
      }
      if (res.ok) {
        setFamily(await res.json());
      } else {
        setFamily(null);
      }
    } catch {
      setError("No se pudo cargar la información de la familia.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        await fetch("/api/families/link", { method: "POST" });
      } catch {
        // ignore
      }
      load();
      loadFines();
    })();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!familyName.trim()) {
      setError("Escribe el nombre de tu familia.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: familyName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear la familia.");
        return;
      }
      setFamilyName("");
      await load();
    } catch {
      setError("Error de conexión al crear la familia.");
    } finally {
      setCreating(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!family) return;
    setError(null);
    setMemberMsg(null);

    if (!memberName.trim()) {
      setError("Escribe el nombre del integrante.");
      return;
    }

    setAdding(true);
    try {
      const res = await fetch(`/api/families/${family.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: memberName.trim(),
          relation,
          rut: memberRut.trim() || undefined,
          email: memberEmail.trim() || undefined,
          password: memberPassword.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo agregar el integrante.");
        return;
      }
      setMemberName("");
      setMemberRut("");
      setMemberEmail("");
      setMemberPassword("");
      setMemberMsg("Integrante agregado correctamente.");
      await load();
    } catch {
      setError("Error de conexión al agregar el integrante.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#ff00ff] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <AppNav />

        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-[#00ff00]">
          Mi Familia
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-[#ffff00]">
          Registra tu grupo familiar para poder reservar la parcela. Los
          integrantes del núcleo no pagan entrada; los invitados extra sí.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-gray-500 dark:text-[#ffff00]">Cargando...</p>
        ) : !family ? (
          <div className="mt-6 rounded-xl border border-gray-200 dark:border-[#00ffff] bg-white dark:bg-[#ff00ff] p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-[#00ff00]">
              Crear mi familia
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-[#ffff00]">
              Usa el apellido familiar, por ejemplo: &quot;Familia Armijo&quot;.
            </p>
            <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="Nombre de la familia"
                className="flex-1 rounded-lg border border-gray-300 dark:border-[#00ffff] px-3 py-2 text-gray-900 dark:text-[#00ff00] bg-white dark:bg-[#ff69b4] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-emerald-600 dark:bg-emerald-700 px-5 py-2 font-medium text-white transition-colors hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50"
              >
                {creating ? "Creando..." : "Crear familia"}
              </button>
            </form>
          </div>
        ) : (
          <>
            {fines.length > 0 && (
              <div className="mt-6 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
                  Multas pendientes
                </h2>
                <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                  Tu familia tiene multas pendientes. Regularízalas con la administración antes de reservar.
                </p>
                <ul className="divide-y divide-red-100 dark:divide-red-900">
                  {fines.filter((f: any) => !f.paidAt).map((f: any) => (
                    <li key={f.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-red-800 dark:text-red-300">{f.reason}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-900 dark:text-red-200">${Number(f.amount).toLocaleString("es-CL")} CLP</span>
                        <button
                          onClick={async () => {
                            let bankInfo = "la cuenta del club";
                            try {
                              const res = await fetch("/api/admin/settings");
                              if (res.ok) {
                                const s = await res.json();
                                const parts = [];
                                if (s.bankName) parts.push(`Banco: ${s.bankName}`);
                                if (s.bankAccountType) parts.push(`Tipo: ${s.bankAccountType}`);
                                if (s.bankAccountNumber) parts.push(`Cuenta: ${s.bankAccountNumber}`);
                                if (s.bankRut) parts.push(`RUT: ${s.bankRut}`);
                                if (s.bankEmail) parts.push(`Correo: ${s.bankEmail}`);
                                if (parts.length) bankInfo = parts.join("\\n");
                              }
                            } catch {
                              // ignore
                            }
                            alert(
                              `Para pagar la multa de $${Number(f.amount).toLocaleString("es-CL")} CLP, realiza una transferencia con los siguientes datos:\\n\\n${bankInfo}\\n\\nEnvía el comprobante a la administración. El admin marcará la multa como pagada.`
                            );
                          }}
                          className="rounded bg-red-600 dark:bg-red-700 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 dark:hover:bg-red-600"
                        >
                          Pagar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                {fines.filter((f: any) => !f.paidAt).length === 0 && (
                  <p className="text-sm text-red-700 dark:text-red-300">Todas las multas están pagadas.</p>
                )}
              </div>
            )}

            <div className="mt-6 rounded-xl border border-gray-200 dark:border-[#00ffff] bg-white dark:bg-[#ff00ff] p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-[#00ff00]">
                {family.name}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-[#ffff00]">
                Integrantes registrados: {family.members.length}
              </p>

              {family.members.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500 dark:text-[#ffff00]">
                  Todavía no has agregado integrantes.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-gray-100 dark:divide-[#1d3b53]">
                  {family.members.map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-[#00ff00]">{m.fullName}</p>
                        <p className="text-xs text-gray-500 dark:text-[#ffff00]">{m.relation}</p>
                        {m.rut && <p className="text-xs text-gray-500 dark:text-[#ffff00]">RUT: {m.rut}</p>}
                        {m.course && <p className="text-xs text-gray-500 dark:text-[#ffff00]">Curso: {m.course}</p>}
                        {m.exAlumno && <p className="text-xs text-gray-500 dark:text-[#ffff00]">Exalumno</p>}
                        {(m.email || m.user?.email) && (
                          <p className="text-xs text-emerald-700 dark:text-emerald-400">{m.email || m.user?.email}</p>
                        )}
                      </div>
                      {m.user?.email && (
                        <span className="rounded-full bg-emerald-50 dark:bg-emerald-950 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-400">
                          {m.user.email}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-6 rounded-xl border border-gray-200 dark:border-[#00ffff] bg-white dark:bg-[#ff00ff] p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-[#00ff00]">
                Agregar integrante
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-[#ffff00]">
                Si le pones correo, esa persona podrá entrar con su propia cuenta
                y reservar. Si no, queda solo como integrante del núcleo.
              </p>

              {memberMsg && (
                <div className="mt-3 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950 p-3 text-sm text-green-700 dark:text-green-300">
                  {memberMsg}
                </div>
              )}

              <form onSubmit={handleAddMember} className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-[#00ffff] px-3 py-2 text-gray-900 dark:text-slate-100 bg-white dark:bg-[#ff69b4] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ej: María Armijo"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                      RUT (obligatorio)
                    </label>
                    <input
                      type="text"
                      value={memberRut}
                      onChange={(e) => setMemberRut(e.target.value)}
                      required
                      className="w-full rounded-lg border border-gray-300 dark:border-[#00ffff] px-3 py-2 text-gray-900 dark:text-slate-100 bg-white dark:bg-[#ff69b4] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ej: 12.345.678-9"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                      Parentesco
                    </label>
                    <select
                      value={relation}
                      onChange={(e) => setRelation(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-[#00ffff] px-3 py-2 text-gray-900 dark:text-slate-100 bg-white dark:bg-[#ff69b4] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="titular">Titular</option>
                      <option value="cónyuge">Cónyuge</option>
                      <option value="hijo/a">Hijo/a</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                      Correo (opcional)
                    </label>
                    <input
                      type="email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-[#00ffff] px-3 py-2 text-gray-900 dark:text-slate-100 bg-white dark:bg-[#ff69b4] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="correo@ejemplo.cl"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                      Contraseña (opcional)
                    </label>
                    <input
                      type="password"
                      value={memberPassword}
                      onChange={(e) => setMemberPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-[#00ffff] px-3 py-2 text-gray-900 dark:text-slate-100 bg-white dark:bg-[#ff69b4] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-[#ffff00]">
                  Si agregas correo y no defines contraseña, la clave inicial será{" "}
                  <span className="font-mono">Parcela2026!</span>
                </p>
                <button
                  type="submit"
                  disabled={adding}
                  className="rounded-lg bg-emerald-600 dark:bg-emerald-700 px-5 py-2 font-medium text-white transition-colors hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50"
                >
                  {adding ? "Agregando..." : "Agregar integrante"}
                </button>
              </form>
            </div>

            <div className="mt-6 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 p-6">
              <p className="text-sm text-emerald-800 dark:text-emerald-300">
                ¿Listo? Ya puedes{" "}
                <a href="/reservar" className="font-semibold underline">
                  hacer una reserva
                </a>
                .
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
