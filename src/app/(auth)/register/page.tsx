"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { z } from "zod";

const registerSchema = z
  .object({
    email: z.string().email("Ingresa un correo electrónico válido"),
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
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
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
      password,
      confirmPassword,
    });

    if (!validation.success) {
      const fieldErrors: {
        email?: string;
        password?: string;
        confirmPassword?: string;
      } = {};
      for (const issue of validation.error.issues) {
        if (issue.path[0] === "email") fieldErrors.email = issue.message;
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
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || "Ocurrió un error al registrarse.");
        setLoading(false);
        return;
      }

      // Automatically sign in after successful registration
      const signInRes = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (signInRes?.ok) {
        router.push("/reservar");
        router.refresh();
      } else {
        router.push("/login?registered=true");
      }
    } catch {
      setServerError("Error de conexión. Inténtalo nuevamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-md border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Crear Cuenta de Socio
          </h1>
          <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
            Regístrate para reservar en la Parcela SSCC con tu núcleo familiar
          </p>
        </div>

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
              placeholder="Mínimo 6 caracteres"
            />
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
              placeholder="Repite tu contraseña"
            />
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

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
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
