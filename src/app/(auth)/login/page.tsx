"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Ingresa tu correo o RUT"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/reservar";
  const registered = searchParams.get("registered");
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urlError) {
      setServerError("Credenciales incorrectas. Verifica tu correo/RUT y contraseña.");
    }
  }, [urlError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      for (const issue of validation.error.issues) {
        if (issue.path[0] === "email") fieldErrors.email = issue.message;
        if (issue.path[0] === "password") fieldErrors.password = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await signIn("credentials", {
        email: email.trim(),
        password,
        callbackUrl,
      });
    } catch {
      setServerError("Ocurrió un error inesperado al intentar iniciar sesión.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:border-slate-700">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Iniciar Sesión
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 dark:text-slate-400">
          Accede al sistema de reservas de la Parcela SSCC
        </p>
      </div>

      {registered && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
          ¡Cuenta creada con éxito! Ahora puedes iniciar sesión.
        </div>
      )}

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
            Correo o RUT
          </label>
          <input
            id="email"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-900 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600"
            placeholder="correo@ejemplo.cl o 12.345.678-9"
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email}</p>
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
              placeholder="••••••••"
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

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          {loading ? "Iniciando sesión..." : "Ingresar"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600 dark:text-slate-400">
        ¿No tienes una cuenta aún?{" "}
        <Link
          href="/register"
          className="font-medium text-emerald-600 hover:text-emerald-500 hover:underline dark:text-emerald-400"
        >
          Regístrate aquí
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-slate-950">
      <Suspense fallback={<div className="text-gray-600 dark:text-slate-400">Cargando formulario...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
