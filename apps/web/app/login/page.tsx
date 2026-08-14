export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-navy p-12 text-white lg:flex">
        <div>
          <p className="text-2xl font-semibold">PilotsPOS</p>
          <p className="mt-1 text-sm text-white/70">Punto de venta Web SaaS</p>
        </div>
        <div className="space-y-2 text-sm text-white/80">
          <p>Plataforma cloud</p>
          <p>Multiempresa</p>
          <p>Acceso seguro con cookies HTTP-only</p>
        </div>
        <p className="text-xs text-white/50">DevPilots · PilotsPOS</p>
      </div>

      <div className="flex w-full flex-1 items-center justify-center bg-app p-8 lg:w-1/2">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold text-ink">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-muted">
            Ingresa tus credenciales para acceder a PilotsPOS.
          </p>
          <p className="mt-6 text-sm text-muted">
            El formulario de acceso se conecta con la API en la Fase 2 de la reconstrucción.
          </p>
        </div>
      </div>
    </div>
  );
}
