import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
            PS
          </span>
          <span className="text-lg font-semibold text-gray-900">
            Parcela SSCC
          </span>
        </div>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Registrarme
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-16 pt-12 text-center sm:pt-20">
        <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Colegio Sagrados Corazones
        </span>
        <h1 className="mt-6 text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">
          Reserva tu día en la Parcela SSCC
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">
          Sistema de reservas exclusivo para las familias socias. Elige el día,
          suma los espacios que necesites y recibe tu pase de acceso con código
          QR.
        </p>

        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/reservar"
            className="rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            Hacer una reserva
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-800 transition-colors hover:border-emerald-500 hover:text-emerald-700"
          >
            Ya tengo cuenta
          </Link>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          ¿Primera vez?{" "}
          <Link
            href="/register"
            className="font-medium text-emerald-600 hover:underline"
          >
            Crea tu cuenta aquí
          </Link>
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl gap-5 px-6 pb-20 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="text-2xl">📅</div>
          <h2 className="mt-3 text-base font-semibold text-gray-900">
            Reserva por día completo
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Cada reserva cubre la jornada completa del día elegido. Varias
            familias pueden reservar el mismo día.
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="text-2xl">🏕️</div>
          <h2 className="mt-3 text-base font-semibold text-gray-900">
            Espacios con precios propios
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Quincho, sala de eventos y sala de cafetería, además de invitados
            extra y uso de piscina.
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="text-2xl">🎟️</div>
          <h2 className="mt-3 text-base font-semibold text-gray-900">
            Pago y QR de acceso
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Al confirmar el pago recibirás un código QR para presentar en la
            portería de la parcela.
          </p>
        </div>
      </section>

      <footer className="border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-6 text-center text-xs text-gray-500">
          Parcela SSCC · Colegio Sagrados Corazones
        </div>
      </footer>
    </main>
  );
}
