import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const containerRef = useRef(null);

  async function loadNotifications() {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setError(false);
    } catch (err) {
      console.error('Eroare notificari:', err);
      setError(true);
    }
  }

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(event) {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  async function markAllRead() {
    const unread = notifications.filter((item) => !item.isRead);
    if (unread.length === 0 || markingAll) return;

    setMarkingAll(true);

    try {
      const results = await Promise.allSettled(
        unread.map((item) =>
          api.post('/notifications/read', {
            scheduleId: item.scheduleId,
            status: item.status,
            dueDate: item.dueDate,
          })
        )
      );

      if (results.some((result) => result.status === 'rejected')) {
        setError(true);
      }

      await loadNotifications();
    } catch (err) {
      console.error('Eroare la marcarea tuturor notificarilor:', err);
      setError(true);
    } finally {
      setMarkingAll(false);
    }
  }

  async function markRead(item) {
    if (item.isRead) return true;

    setBusyId(item.scheduleId);

    try {
      await api.post('/notifications/read', {
        scheduleId: item.scheduleId,
        status: item.status,
        dueDate: item.dueDate,
      });

      await loadNotifications();
      return true;
    } catch (err) {
      console.error('Eroare marcare notificare:', err);
      setError(true);
      return false;
    } finally {
      setBusyId(null);
    }
  }

  const overdue = notifications.filter(
    (n) => n.status === 'OVERDUE'
  ).length;

  const dueSoon = notifications.filter(
    (n) => n.status === 'DUE_SOON'
  ).length;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) loadNotifications();
        }}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm transition hover:bg-gray-50"
        aria-label="Notificari mentenanta"
        aria-expanded={open}
      >
        <span className="text-xl">🔔</span>

        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-14 z-50 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Notificari
              </h3>

              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                {unreadCount} necitite
              </span>
            </div>

            <p className="mt-1 text-xs text-gray-500">
              {overdue} depasite · {dueSoon} apropiate
            </p>
          </div>

          {unreadCount > 0 && (
            <div className="border-b border-gray-100 px-4 py-2 text-right">
              <button
                type="button"
                onClick={markAllRead}
                disabled={markingAll}
                className="text-xs font-medium text-blue-700 hover:underline disabled:opacity-50"
              >
                {markingAll
                  ? 'Se salveaza...'
                  : 'Marcheaza toate ca citite'}
              </button>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {error && (
              <p className="bg-red-50 p-3 text-sm text-red-600">
                Eroare la actualizarea notificarilor.
              </p>
            )}

            {notifications.length === 0 && !error && (
              <div className="p-6 text-center">
                <p className="text-sm font-medium text-gray-700">
                  Nu exista alerte active
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Toate mentenantele sunt in regula.
                </p>
              </div>
            )}

            {notifications.map((item) => (
              <div
                key={`${item.scheduleId}-${item.status}-${item.dueDate}`}
                className={`border-b border-gray-100 p-4 transition ${
                  item.isRead ? 'bg-white' : 'bg-blue-50/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-1 text-lg">
                    {item.status === 'OVERDUE' ? '🔴' : '🟠'}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {item.asset?.name || 'Asset necunoscut'}
                      </p>

                      {!item.isRead && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                      )}
                    </div>

                    <p className="mt-1 text-xs text-gray-600">
                      {item.maintenanceType}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Scadenta:{' '}
                      {new Date(item.dueDate).toLocaleDateString('ro-RO')}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Link
                        to={item.asset?.id ? `/assets/${item.asset.id}` : '/'}
                        onClick={() => {
                          if (!item.isRead) markRead(item);
                          setOpen(false);
                        }}
                        className="text-xs font-medium text-blue-700 hover:underline"
                      >
                        Vezi asset
                      </Link>

                      {!item.isRead && (
                        <button
                          type="button"
                          disabled={busyId === item.scheduleId}
                          onClick={() => markRead(item)}
                          className="text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
                        >
                          {busyId === item.scheduleId
                            ? 'Se salveaza...'
                            : 'Marcheaza citita'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
