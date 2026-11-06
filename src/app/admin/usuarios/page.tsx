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
  const [search, setSearch] = useState("");

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

  const filtered = users.filter((u) =>
    (u.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (u.rut ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (u.role ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AppNav />
        <AdminNav />
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Usuarios</h1>

        <form onSubmit={handleCreate} className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Crear usuario (guardia/admin)</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" required className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña (mín. 6)" required className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="GUARDIA">GUARDIA</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SOCIO">SOCIO</option>
            </select>
          </div>
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Crear usuario
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Usuarios registrados</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por correo, RUT o rol"
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm w-64"
            />
          </div>
          {loading ? (
            <p className="text-sm text-gray-500">Cargando...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b bg-gray-50">
                    <th className="py-2 px-2">Correo</th>
                    <th className="py-2 px-2">Rol</th>
                    <th className="py-2 px-2">RUT</th>
                    <th className="py-2 px-2">Estado</th>
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u: any) => (
                    <tr key={u.id} className="border-b">
                      <td className="py-2 px-2">{u.email}</td>
                      <td className="py-2 px-2">
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
                      <td className="py-2 px-2 text-xs">{u.rut ?? "-"}</td>
                      <td className="py-2 px-2">
                        {u.isSocio ? (
                          <span className="text-xs text-emerald-600">Socio</span>
                        ) : u.inscriptionPaid ? (
                          <span className="text-xs text-emerald-600">Inscrito (pagado)</span>
                        ) : (
                          <span className="text-xs text-amber-600">Inscripción pendiente</span>
                        )}
                      </td>
                      <td className="py-2 px-2 space-x-1">
                        {!u.isSocio && (
                          <button
                            onClick={() => toggleInscription(u)}
                            className="text-xs text-amber-600 hover:underline"
                          >
                            {u.inscriptionPaid ? "Marcar pendiente" : "Marcar pagada"}
                          </button>
                        )}
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
                          Clave
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
              <p className="mt-2 text-xs text-gray-500">Total: {filtered.length} de {users.length}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
