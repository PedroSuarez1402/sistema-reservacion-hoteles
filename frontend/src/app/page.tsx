export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-4xl w-full text-center">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-primary-700 mb-4">
            🏨 Sistema de Reservación de Hoteles
          </h1>
          <p className="text-xl text-gray-600">
            Gestione reservas, habitaciones y clientes de manera eficiente
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-4">📅</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Reservas</h2>
            <p className="text-gray-600">
              Cree, edite y administre reservas de forma intuitiva
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-4">🛏️</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Habitaciones</h2>
            <p className="text-gray-600">
              Administre el inventario y disponibilidad de habitaciones
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-4">👥</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Clientes</h2>
            <p className="text-gray-600">
              Gestione la información y historial de sus huéspedes
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-primary-700 mb-2">
            🚀 Estado del Proyecto
          </h3>
          <p className="text-gray-700">
            Backend Express.js (puerto 3001) • Frontend Next.js (puerto 3000)
          </p>
        </div>
      </div>
    </main>
  );
}
