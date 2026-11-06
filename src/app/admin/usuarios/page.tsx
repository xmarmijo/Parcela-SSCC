"use client";

import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { AdminNav } from "@/components/AdminNav";

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("GUARDIA");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => setUsers(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });
    if (res.ok) {
      setEmail("");
      setPassword("");
      load();
    } else {
      const d = await res.json();
      alert(d.error || "Error");
    }
  };

  const toggleSocio = async (u: any) => {
    await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSocio: !u.isSocio }),
    });
    load();
  };

  const toggleInscription = async (u: any) => {
    await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inscriptionPaid: !u.inscriptionPaid }),
    });
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AppNav />
        <AdminNav />
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Usuarios</h1>

        <form onSubmit={handleCreate} className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Crear usuario (guardia/admin)</h2>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña (mín. 6)" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="GUARDIA">GUARDIA</option>
            <option value="ADMIN">ADMIN</option>
            <option value="SOCIO">SOCIO</option>
          </select>
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Crear usuario
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Usuarios registrados</h2>
          {loading ? (
            <p className="text-sm text-gray-500">Cargando...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2">Correo</th>
                    <th className="py-2">Rol</th>
                    <th className="py-2">RUT</th>
                    <th className="py-2">Socio</th>
                    <th className="py-2">Inscripción</th>
                    <th className="py-2">Creado</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id} className="border-b">
                      <td className="py-2">{u.email}</td>
                      <td className="py-2">
                        <select
                          value={u.role}
                          onChange={async (e) => {
                            await fetch(`/api/admin/users/${u.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ role: e.target.value }),
                            });
                            load();
                          }}
                          className="rounded border border-gray-300 px-2 py-1 text-xs"
                        >
                          <option value="SOCIO">SOCIO</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="GUARDIA">GUARDIA</option>
                        </select>
                      </td>
                      <td className="py-2">{u.rut ?? "-"}</td>
                      <td className="py-2">
                        <button
                          onClick={() => toggleSocio(u)}
                          className={`text-xs ${u.isSocio ? "text-emerald-600" : "text-gray-400"} hover:underline`}
                        >
                          {u.isSocio ? "Sí" : "No"}
                        </button>
                      </td>
                      <td className="py-2">
                        {u.isSocio ? (
                          <span className="text-xs text-emerald-600">N/A (socio)</span>
                        ) : (
                          <button
                            onClick={() => toggleInscription(u)}
                            className={`text-xs ${u.inscriptionPaid ? "text-emerald-600" : "text-amber-600"} hover:underline`}
                          >
                            {u.inscriptionPaid ? "Pagada" : "Pendiente"}
                          </button>
                        )}
                      </td>
                      <td className="py-2">{new Date(u.createdAt).toLocaleDateString("es-CL")}</td>
                      <td className="py-2 space-x-2">
                        <button
                          onClick={async () => {
                            const pwd = prompt("Nueva contraseña (mín. 6 caracteres):");
                            if (!pwd) return;
                            const res = await fetch(`/api/admin/users/${u.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ password: pwd }),
                            });
                            if (res.ok) alert("Contraseña actualizada");
                            else {
                              const d = await res.json();
                              alert(d.error || "Error");
                            }
                          }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Resetear clave
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`¿Eliminar a ${u.email}?`)) return;
                            const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
                            if (res.ok) load();
                            else {
                              const d = await res.json();
                              alert(d.error || "Error");
                            }
                          }}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
