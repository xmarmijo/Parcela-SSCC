import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import type { Role } from "@/generated/prisma/client";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const nextAuth = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const passwordsMatch = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );

        if (!passwordsMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});

export const { handlers, signIn, signOut } = nextAuth;

export const auth = ((...args: any[]) => {
  if ((globalThis as any).__mockSession !== undefined) {
    return (globalThis as any).__mockSession;
  }
  return (nextAuth.auth as any)(...args);
}) as typeof nextAuth.auth;

export async function requireRole(role: Role | "SOCIO" | "ADMIN") {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  const userRole = session.user.role;
  if (role === "ADMIN" && userRole !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }

  if (role === "SOCIO" && userRole !== "SOCIO" && userRole !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }

  return session.user;
}
