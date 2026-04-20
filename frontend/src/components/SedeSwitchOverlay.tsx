import { Hotel, MapPin, Check } from 'lucide-react';

export default function SedeSwitchOverlay({ sedeNombre }: { sedeNombre: string }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background:
          'radial-gradient(circle at 50% 50%, rgba(109,40,217,0.95) 0%, rgba(76,29,149,0.98) 70%, rgba(30,10,60,1) 100%)',
        animation: 'fade-in 0.25s ease-out',
      }}
    >
      {/* Círculos decorativos flotando */}
      <div className="absolute top-12 left-12 w-40 h-40 rounded-full bg-violet-500/20 blur-3xl animate-float" />
      <div
        className="absolute bottom-16 right-16 w-60 h-60 rounded-full bg-violet-400/20 blur-3xl animate-float"
        style={{ animationDelay: '1s' }}
      />

      {/* Card central */}
      <div className="relative text-center text-white animate-scale-in">
        {/* Anillo con pulso */}
        <div className="relative w-28 h-28 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-gold-400/40 animate-pulse-ring" />
          <div className="absolute inset-3 rounded-full border-2 border-gold-300/30 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-gold-400 animate-spin" />
          <div className="absolute inset-4 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center animate-glow">
            <Hotel size={36} className="text-white" />
          </div>
        </div>

        <div className="text-[10px] uppercase tracking-[0.3em] text-violet-200 mb-2">
          Cambiando de sede
        </div>
        <div className="flex items-center justify-center gap-2 mb-3">
          <MapPin size={18} className="text-gold-400" />
          <h2 className="font-hotel text-3xl sm:text-4xl font-bold tracking-tight">
            {sedeNombre}
          </h2>
        </div>
        <p className="text-violet-200 text-sm">
          Cargando configuración y datos de la sede...
        </p>

        {/* Progress bar animada */}
        <div className="mt-8 w-64 mx-auto">
          <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden progress-indeterminate">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold-400 to-transparent opacity-0" />
          </div>
        </div>

        {/* Checklist de items */}
        <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-md mx-auto">
          {['Habitaciones', 'Productos', 'Personal', 'Caja', 'Inventario'].map(
            (item, i) => (
              <div
                key={item}
                className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full animate-slide-in-right"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <Check size={12} className="text-emerald-300" />
                {item}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
