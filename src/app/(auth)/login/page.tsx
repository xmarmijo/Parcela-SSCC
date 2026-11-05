"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Ingresa un correo electrónico válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

function LoginForm() {
  // router no longer needed (NextAuth handles redirect)
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/reservar";
  const registered = searchParams.get("registered");
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (urlError) {
      setServerError("Credenciales incorrectas. Verifica tu correo y contraseña.");
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
        email: email.trim().toLowerCase(),
        password,
        callbackUrl,
      });
      // Si llega aquí, la redirección la maneja NextAuth
    } catch {
      setServerError("Ocurrió un error inesperado al intentar iniciar sesión.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-md border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Iniciar Sesión
        </h1>
        <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
          Accede al sistema de reservas de la Parcela SSCC
        </p>
      </div>

      {registered && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
          ¡Cuenta creada con éxito! Ahora puedes iniciar sesión.
        </div>
      )}

      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
            placeholder="socio@ejemplo.cl"
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
            placeholder="••••••••"
          />
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

      <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
      <Suspense fallback={<div className="text-gray-600">Cargando formulario...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
