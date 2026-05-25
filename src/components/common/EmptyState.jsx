import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'Kayıt bulunamadı', description = 'Bu alanda gösterilecek veri oluştuğunda burada listelenecek.' }) {
  return (
    <div className="glass-panel grid min-h-48 place-items-center p-6 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-dexa-cyan">
          <Inbox size={22} />
        </div>
        <h3 className="mt-4 text-lg font-black text-white">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-dexa-muted">{description}</p>
      </div>
    </div>
  );
}
