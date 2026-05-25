export default function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-dexa-blue via-dexa-cyan to-white text-lg font-black text-dexa-black shadow-glow">
        D
      </div>
      {!compact && (
        <div>
          <strong className="block text-lg font-black tracking-tight text-white">Dexa</strong>
          <span className="block text-xs font-medium text-dexa-muted">Vardiya operasyon sistemi</span>
        </div>
      )}
    </div>
  );
}
