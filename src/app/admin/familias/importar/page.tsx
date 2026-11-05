"use client";

import { useState } from "react";
import { AppNav } from "@/components/AppNav";
import { AdminNav } from "@/components/AdminNav";

export default function ImportarFamiliasPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = () => {
    window.location.href = "/api/admin/families/template";
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/families/import", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al importar");
        return;
      }
      setResult(data);
    } catch {
      setError("Error de conexión al importar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#ff00ff] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <AppNav />
        <AdminNav />
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-[#00ff00]">
          Importar núcleos familiares
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-[#ffff00]">
          Carga el Excel del colegio para crear/actualizar los núcleos familiares.
        </p>

        <div className="mt-6 rounded-xl border border-gray-200 dark:border-[#00ffff] bg-white dark:bg-[#ff00ff] p-6 shadow-sm space-y-4">
          <button
            onClick={handleDownload}
            className="rounded-lg bg-gray-100 dark:bg-[#ff69b4] px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 dark:bg-[#ff1493]"
          >
            Descargar plantilla Excel
          </button>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[#00ff00] mb-1">
              Archivo Excel
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-700 dark:text-[#00ff00]"
            />
          </div>

          <button
            onClick={handleImport}
            disabled={!file || loading}
            className="rounded-lg bg-emerald-600 dark:bg-emerald-700 px-5 py-2 font-medium text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50"
          >
            {loading ? "Importando..." : "Importar"}
          </button>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950 p-4 text-sm text-emerald-800 space-y-1">
              <p>Núcleos creados: {result.created}</p>
              <p>Núcleos actualizados: {result.updated}</p>
              <p>Integrantes procesados: {result.members}</p>
              {result.errors?.length > 0 && (
                <div className="mt-2">
                  <p className="font-semibold">Errores:</p>
                  <ul className="list-disc pl-5">
                    {result.errors.map((e: string, i: number) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
