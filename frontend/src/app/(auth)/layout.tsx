import Link from 'next/link';
import { Building2 } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-stretch overflow-hidden bg-gradient-to-br from-primary-50 via-white to-slate-50">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary-200/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl" />
      </div>

      <div className="relative flex-1 hidden lg:block">
        <div className="flex h-full w-full flex-col justify-between p-10">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-600/30">
              <Building2 className="h-5 w-5" />
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Hotel<span className="text-primary-600">Reserva</span>
            </span>
          </Link>
          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900">
              Gestiona tus estancias con
              <span className="block text-primary-600">simplicidad y confianza</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Reserva habitaciones en segundos, consulta tu historial y disfruta
              de una experiencia pensada para ti.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
                Disponibilidad en tiempo real
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
                Panel personalizado por tipo de usuario
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
                Proceso de reserva en tres pasos
              </li>
            </ul>
          </div>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} HotelReserva. Todos los derechos reservados.
          </p>
        </div>
      </div>

      <div className="relative flex min-h-screen w-full flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:flex-none lg:w-full lg:max-w-lg lg:border-l lg:border-slate-200/60 lg:bg-white/70 lg:backdrop-blur">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
