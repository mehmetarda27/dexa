import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { useToast } from '../../components/common/ToastProvider';
import { getSession } from '../../services/authService';
import { useOperations } from '../../state/OperationsContext';

export default function CourierAnnouncements() {
  const session = getSession();
  const { announcements, markAnnouncementRead } = useOperations();
  const { notify } = useToast();
  const visible = announcements.filter((announcement) => announcement.target === 'all' || announcement.target === session?.courierId);

  return (
    <section className="glass-panel rounded-[2rem] p-5">
      <span className="eyebrow">Duyurular</span>
      <h1 className="mt-2 text-3xl font-black text-white">Size iletilen duyurular</h1>
      {visible.length ? <div className="mt-6 grid gap-3">
        {visible.map((announcement) => {
          const read = announcement.readBy.includes(session.courierId);
          return (
            <article key={announcement.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <strong className="text-white">{announcement.title}</strong>
                  <p className="mt-1 text-sm text-dexa-muted">{announcement.date}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge>{read ? 'Okundu' : 'Okunmadı'}</StatusBadge>
                  {!read && (
                    <button
                      className="secondary-button min-h-9 px-3"
                      type="button"
                      onClick={() => {
                        markAnnouncementRead(announcement.id, session.courierId);
                        notify({ title: 'Duyuru okundu', message: announcement.title });
                      }}
                    >
                      Okundu yap
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-dexa-muted">{announcement.description || announcement.content}</p>
            </article>
          );
        })}
      </div> : <EmptyState title="Henüz duyuru yok" description="Size gönderilen duyurular burada görünür." />}
    </section>
  );
}
