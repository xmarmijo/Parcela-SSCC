"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNav } from "@/components/AppNav";

interface Member {
  id: string;
  fullName: string;
  relation: string;
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
  const [relation, setRelation] = useState("hijo/a");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [memberMsg, setMemberMsg] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

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
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <AppNav />

        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          Mi Familia
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Registra tu grupo familiar para poder reservar la parcela. Los
          integrantes del núcleo no pagan entrada; los invitados extra sí.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-gray-500">Cargando...</p>
        ) : !family ? (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              Crear mi familia
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Usa el apellido familiar, por ejemplo: &quot;Familia Armijo&quot;.
            </p>
            <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="Nombre de la familia"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-emerald-600 px-5 py-2 font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {creating ? "Creando..." : "Crear familia"}
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                {family.name}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Integrantes registrados: {family.members.length}
              </p>

              {family.members.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">
                  Todavía no has agregado integrantes.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-gray-100">
                  {family.members.map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-3"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{m.fullName}</p>
                        <p className="text-xs text-gray-500">{m.relation}</p>
                      </div>
                      {m.user?.email && (
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                          {m.user.email}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Agregar integrante
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Si le pones correo, esa persona podrá entrar con su propia cuenta
                y reservar. Si no, queda solo como integrante del núcleo.
              </p>

              {memberMsg && (
                <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  {memberMsg}
                </div>
              )}

              <form onSubmit={handleAddMember} className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ej: María Armijo"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Parentesco
                    </label>
                    <select
                      value={relation}
                      onChange={(e) => setRelation(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="titular">Titular</option>
                      <option value="cónyuge">Cónyuge</option>
                      <option value="hijo/a">Hijo/a</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Correo (opcional)
                    </label>
                    <input
                      type="email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="correo@ejemplo.cl"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Contraseña (opcional)
                    </label>
                    <input
                      type="password"
                      value={memberPassword}
                      onChange={(e) => setMemberPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Si agregas correo y no defines contraseña, la clave inicial será{" "}
                  <span className="font-mono">Parcela2026!</span>
                </p>
                <button
                  type="submit"
                  disabled={adding}
                  className="rounded-lg bg-emerald-600 px-5 py-2 font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  {adding ? "Agregando..." : "Agregar integrante"}
                </button>
              </form>
            </div>

            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
              <p className="text-sm text-emerald-800">
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
