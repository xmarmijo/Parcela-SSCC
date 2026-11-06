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
    <div className="card w-full max-w-md">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Iniciar Sesión
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Accede al sistema de reservas de la Parcela SSCC
        </p>
      </div>

      {registered && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200">
          ¡Cuenta creada con éxito! Ahora puedes iniciar sesión.
        </div>
      )}

      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="label"
          >
            Correo o RUT
          </label>
          <input
            id="email"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
            placeholder="correo@ejemplo.cl o 12.345.678-9"
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="label"
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
              className="input pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
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
          className="btn-primary w-full"
        >
          {loading ? "Iniciando sesión..." : "Ingresar"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-gray-600">
        ¿No tienes una cuenta aún?{" "}
        <Link
          href="/register"
          className="font-medium text-emerald-600 hover:text-emerald-500 hover:underline"
        >
          Regístrate aquí
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Suspense fallback={<div className="text-gray-600">Cargando formulario...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
