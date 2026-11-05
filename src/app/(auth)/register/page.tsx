"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { z } from "zod";

const registerSchema = z
  .object({
    email: z.string().email("Ingresa un correo electrónico válido"),
    rut: z.string().min(1, "El RUT es obligatorio"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [rut, setRut] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    rut?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validation = registerSchema.safeParse({
      email,
      rut,
      password,
      confirmPassword,
    });

    if (!validation.success) {
      const fieldErrors: {
        email?: string;
        rut?: string;
        password?: string;
        confirmPassword?: string;
      } = {};
      for (const issue of validation.error.issues) {
        if (issue.path[0] === "email") fieldErrors.email = issue.message;
        if (issue.path[0] === "rut") fieldErrors.rut = issue.message;
        if (issue.path[0] === "password") fieldErrors.password = issue.message;
        if (issue.path[0] === "confirmPassword")
          fieldErrors.confirmPassword = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          rut: rut.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || "Ocurrió un error al registrarse.");
        setLoading(false);
        return;
      }

      await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        callbackUrl: "/reservar",
      });
    } catch {
      setServerError("Error de conexión. Inténtalo nuevamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-slate-950">
      <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:border-slate-700">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Crear Cuenta de Socio
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 dark:text-slate-400">
            Regístrate para reservar en la Parcela SSCC con tu núcleo familiar
          </p>
        </div>

        {serverError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 text-sm border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
              placeholder="socio@ejemplo.cl"
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="rut"
              className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
            >
              RUT
            </label>
            <input
              id="rut"
              type="text"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
              placeholder="12.345.678-9"
            />
            {errors.rut && (
              <p className="text-xs text-red-500 mt-1">{errors.rut}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 pr-10"
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-300"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
            >
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 pr-10"
                placeholder="Repite tu contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-300"
                aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            {loading ? "Creando cuenta..." : "Registrarme"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-slate-400">
          ¿Ya tienes una cuenta?{" "}
          <Link
            href="/login"
            className="font-medium text-emerald-600 hover:text-emerald-500 hover:underline dark:text-emerald-400"
          >
            Inicia sesión aquí
          </Link>
        </div>
      </div>
    </div>
  );
}
