const styles = {
  Çalışıyor: 'border-emerald-400/30 bg-emerald-400/12 text-emerald-200',
  Molada: 'border-amber-300/30 bg-amber-300/12 text-amber-100',
  'Mesai Bitti': 'border-slate-300/20 bg-slate-300/10 text-slate-200',
  Aktif: 'border-dexa-cyan/30 bg-dexa-cyan/10 text-dexa-cyan',
  Pasif: 'border-rose-300/30 bg-rose-300/10 text-rose-100',
  Onaylandı: 'border-emerald-400/30 bg-emerald-400/12 text-emerald-200',
  'Onay Bekliyor': 'border-amber-300/30 bg-amber-300/12 text-amber-100',
  Okunmadı: 'border-dexa-cyan/30 bg-dexa-cyan/10 text-dexa-cyan',
  Okundu: 'border-white/10 bg-white/5 text-dexa-muted',
  'Geç Kaldı': 'border-amber-300/30 bg-amber-300/12 text-amber-100',
  Gelmedi: 'border-rose-300/30 bg-rose-300/10 text-rose-100',
  Reddedildi: 'border-rose-300/30 bg-rose-300/10 text-rose-100',
};

export default function StatusBadge({ children }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${styles[children] || styles.Aktif}`}>
      {children}
    </span>
  );
}
