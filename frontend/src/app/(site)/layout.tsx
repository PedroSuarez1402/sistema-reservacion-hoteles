import { Navbar } from '../../components';

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50/60">
      <Navbar />
      <main className="flex-1 w-full">{children}</main>
      <footer className="border-t border-slate-200 bg-white/60">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} HotelReserva — Sistema de Gestión de Reservas.
            </p>
            <p className="text-xs text-slate-400">
              Construido con Next.js · Express · Sequelize
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
