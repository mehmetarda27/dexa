import { MapPin, Navigation } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

export default function DistanceCard({ distanceState, position }) {
  return (
    <section className="glass-panel rounded-[2rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="eyebrow">Konum doğrulama</span>
          <h2 className="mt-2 text-2xl font-black text-white">{distanceState.restaurant.name}</h2>
          <p className="mt-2 text-sm text-dexa-muted">
            Menzil sınırı {distanceState.restaurant.radius} metre. Mesai işlemleri restoran çevresinde aktifleşir.
          </p>
        </div>
        <StatusBadge>{distanceState.inRange ? 'Aktif' : 'Pasif'}</StatusBadge>
      </div>
      <div className="relative mt-6 grid min-h-64 place-items-center overflow-hidden rounded-[1.6rem] border border-dexa-blue/20 bg-dexa-blue/10">
        <div className="absolute h-44 w-44 animate-pulseSoft rounded-full border border-dexa-cyan/40 bg-dexa-cyan/10" />
        <div className="absolute h-28 w-28 rounded-full border border-dexa-blue/40 bg-dexa-blue/15" />
        <MapPin className="relative z-10 text-dexa-cyan drop-shadow-[0_0_24px_rgba(41,211,255,0.7)]" size={42} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <span className="text-sm text-dexa-muted">Restorana mesafe</span>
          <strong className="mt-1 block text-2xl font-black text-white">{Number.isFinite(distanceState.distance) ? `${distanceState.distance} m` : 'Bekleniyor'}</strong>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <span className="flex items-center gap-2 text-sm text-dexa-muted">
            <Navigation size={15} />
            Menzil durumu
          </span>
          <strong className="mt-1 block text-lg font-black text-white">{distanceState.inRange ? 'Mesaiye uygun' : 'Restorana yaklaşın'}</strong>
        </div>
      </div>
      {position && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-dexa-muted">
          Konum: {position.lat.toFixed(6)}, {position.lng.toFixed(6)} · Doğruluk: {Math.round(position.accuracy)} m
        </div>
      )}
    </section>
  );
}
