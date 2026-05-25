import { Megaphone, Send } from 'lucide-react';
import { useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import { useToast } from '../../components/common/ToastProvider';
import EmptyState from '../../components/common/EmptyState';
import { useOperations } from '../../state/OperationsContext';

export default function Announcements() {
  const { announcements, couriers, addAnnouncement } = useOperations();
  const { notify } = useToast();
  const [form, setForm] = useState({ title: '', content: '', targetType: 'all', targetCourierId: '' });

  const submit = (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      notify({ type: 'error', title: 'Eksik bilgi', message: 'Başlık ve açıklama zorunludur.' });
      return;
    }
    addAnnouncement(form);
    notify({ title: 'Duyuru gönderildi', message: form.targetType === 'all' ? 'Tüm kuryeler' : 'Seçili kurye' });
    setForm({ title: '', content: '', targetType: 'all', targetCourierId: '' });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Duyuru yönetimi"
        title="Kurye iletişim paneli"
        description="Duyurular tüm kuryelere veya seçili bir kuryeye hedeflenebilir. Okundu durumu kurye panelinde takip edilir."
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form className="glass-panel grid gap-4 p-5" onSubmit={submit}>
          <h2 className="text-xl font-bold text-white">Duyuru oluştur</h2>
          <input className="field" placeholder="Başlık" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <textarea className="field min-h-32 py-3" placeholder="Açıklama" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
          <select className="field" value={form.targetType} onChange={(event) => setForm({ ...form, targetType: event.target.value })}>
            <option value="all">Tüm kuryeler</option>
            <option value="courier">Seçili kurye</option>
          </select>
          {form.targetType === 'courier' && (
            <select className="field" value={form.targetCourierId} onChange={(event) => setForm({ ...form, targetCourierId: event.target.value })}>
              <option value="">Kurye seç</option>
              {couriers.map((courier) => <option key={courier.id} value={courier.id}>{courier.fullName}</option>)}
            </select>
          )}
          <button className="primary-button" type="submit"><Send size={18} />Duyuruyu gönder</button>
        </form>
        <section className="glass-panel rounded-3xl p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Yayınlanan duyurular</h2>
            <Megaphone className="text-dexa-cyan" />
          </div>
          {announcements.length ? <div className="grid gap-3">
            {announcements.map((announcement) => (
              <article key={announcement.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <strong className="text-white">{announcement.title}</strong>
                    <p className="mt-1 text-sm text-dexa-muted">{announcement.date} · {announcement.target === 'all' ? 'Tüm kuryeler' : couriers.find((c) => c.id === announcement.target)?.fullName}</p>
                  </div>
                  <StatusBadge>{announcement.readBy.length > 0 ? 'Okundu' : 'Okunmadı'}</StatusBadge>
                </div>
                <p className="mt-3 text-sm leading-6 text-dexa-muted">{announcement.description || announcement.content}</p>
              </article>
            ))}
          </div> : <EmptyState title="Henüz duyuru gönderilmedi" description="Oluşturulan duyurular ve okundu bilgileri burada görünür." />}
        </section>
      </div>
    </div>
  );
}
