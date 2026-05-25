import { Bell, CheckCheck, Megaphone, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { appEnv } from '../../config/env';
import { getSession } from '../../services/authService';
import { useOperations } from '../../state/OperationsContext';
import { useToast } from './ToastProvider';

function NotificationItem({ notification, onRead, readOnly = false }) {
  return (
    <article className={`rounded-2xl border p-3 ${notification.read ? 'border-white/10 bg-[#121927]' : 'border-dexa-cyan/30 bg-[#10243a]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <strong className="block text-sm text-white">{notification.title}</strong>
          <p className="mt-1 text-sm leading-5 text-dexa-muted">{notification.message}</p>
          <p className="mt-2 text-xs text-dexa-muted">
            {new Date(notification.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        {!readOnly && !notification.read && (
          <button className="icon-button h-10 w-10" type="button" onClick={() => onRead(notification.id)} aria-label="Okundu isaretle">
            <CheckCheck size={16} />
          </button>
        )}
      </div>
    </article>
  );
}

export default function NotificationCenter({ mode = 'courier' }) {
  if (!appEnv.enableNotifications) return null;

  const session = getSession();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useOperations();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const previousUnread = useRef(0);

  const visibleNotifications = useMemo(() => {
    const items = mode === 'admin'
      ? notifications
      : notifications.filter((notification) => notification.userId === session?.courierId);
    return [...items].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [mode, notifications, session?.courierId]);

  const unreadCount = visibleNotifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    if (mode !== 'courier') return;
    if (previousUnread.current && unreadCount > previousUnread.current) {
      const latest = visibleNotifications.find((notification) => !notification.read);
      if (latest) notify({ title: latest.title, message: latest.message });
    }
    previousUnread.current = unreadCount;
  }, [mode, notify, unreadCount, visibleNotifications]);

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      notify({ type: 'error', title: 'Tarayici desteklemiyor', message: 'Bu cihazda web bildirimi destegi yok.' });
      return;
    }
    const result = await Notification.requestPermission();
    notify({
      title: result === 'granted' ? 'Bildirim izni acildi' : 'Bildirim izni kapali',
      message: result === 'granted' ? 'Gelecekte push bildirimleri bu izinle calisacak.' : 'Tarayici ayarlarindan tekrar acilabilir.',
    });
  };

  return (
    <div className="relative">
      <button className="icon-button relative" type="button" onClick={() => setOpen((current) => !current)} aria-label="Bildirim merkezi">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-black text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-[82px] z-[70] max-h-[calc(100dvh-96px)] overflow-hidden rounded-2xl border border-white/12 bg-[#080d18] shadow-[0_28px_90px_rgba(0,0,0,0.72)] sm:absolute sm:inset-auto sm:right-0 sm:top-14 sm:w-[390px]">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
            <div>
              <p className="eyebrow">{mode === 'admin' ? 'Gönderilenler' : 'Bildirimler'}</p>
              <h3 className="mt-1 text-base font-black text-white">{unreadCount} okunmamış</h3>
            </div>
            <button className="icon-button h-10 w-10" type="button" onClick={() => setOpen(false)} aria-label="Bildirimleri kapat">
              <X size={16} />
            </button>
          </div>

          <div className="grid max-h-[58dvh] gap-3 overflow-y-auto p-3">
            {visibleNotifications.length ? (
              visibleNotifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} onRead={markNotificationRead} readOnly={mode === 'admin'} />
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#121927] p-5 text-sm text-dexa-muted">
                Henüz bildirim yok.
              </div>
            )}
          </div>

          {mode === 'courier' && (
            <div className="grid gap-2 border-t border-white/10 p-3 sm:grid-cols-2">
              <button className="secondary-button" type="button" onClick={requestPushPermission}>
                <Megaphone size={16} />
                İzin ver
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => markAllNotificationsRead(session?.courierId)}
                disabled={!visibleNotifications.some((notification) => !notification.read)}
              >
                <CheckCheck size={16} />
                Tümünü okundu yap
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
