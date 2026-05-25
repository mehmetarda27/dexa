export default function StatCard({ icon: Icon, label, value, detail, tone = 'blue' }) {
  const tones = {
    blue: 'from-dexa-blue/25 to-dexa-cyan/10 text-dexa-cyan ring-dexa-blue/20',
    green: 'from-emerald-400/20 to-dexa-blue/10 text-emerald-200 ring-emerald-300/20',
    amber: 'from-amber-300/20 to-dexa-blue/10 text-amber-100 ring-amber-200/20',
    rose: 'from-rose-400/20 to-dexa-blue/10 text-rose-100 ring-rose-200/20',
  };

  return (
    <article className="stat-card group">
      <div className="flex items-start justify-between gap-4">
        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 transition group-hover:scale-105 ${tones[tone]}`}>
          {Icon && <Icon size={22} />}
        </div>
        <div className="h-2 w-2 rounded-full bg-dexa-cyan/70 shadow-[0_0_18px_rgba(41,211,255,0.8)]" />
      </div>
      <div className="mt-5">
        <p className="text-sm font-semibold text-dexa-muted">{label}</p>
        <strong className="mt-2 block text-2xl font-black tracking-tight text-white">{value}</strong>
        {detail && <span className="mt-2 block text-sm leading-5 text-dexa-muted">{detail}</span>}
      </div>
    </article>
  );
}
