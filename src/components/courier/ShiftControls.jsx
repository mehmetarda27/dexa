import { Coffee, LogOut, Play, RotateCcw } from 'lucide-react';

export default function ShiftControls({
  canStart,
  canBreak,
  canReturn,
  canFinish,
  onStart,
  onBreak,
  onReturn,
  onFinish,
  busy,
  helperText,
}) {
  return (
    <section className="glass-panel shift-action-panel rounded-[2rem] p-5">
      <span className="eyebrow">Mesai kontrolü</span>
      <h2 className="mt-2 text-2xl font-black text-white">Vardiya işlemleri</h2>
      <div className="mt-6 grid gap-3">
        <button className="primary-button touch-button w-full" type="button" disabled={!canStart || busy} onClick={onStart}>
          <Play size={18} />
          Mesai başlat
        </button>
        <button className="secondary-button touch-button w-full" type="button" disabled={!canBreak || busy} onClick={onBreak}>
          <Coffee size={18} />
          Molaya çık
        </button>
        <button className="secondary-button touch-button w-full" type="button" disabled={!canReturn || busy} onClick={onReturn}>
          <RotateCcw size={18} />
          Moladan dön
        </button>
        <button className="secondary-button touch-button w-full" type="button" disabled={!canFinish || busy} onClick={onFinish}>
          <LogOut size={18} />
          Mesai bitir
        </button>
      </div>
      <p className="mt-4 text-sm leading-6 text-dexa-muted">{helperText}</p>
    </section>
  );
}
