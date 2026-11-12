import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  AlertCircle,
  Clock3,
  CheckCheck,
  Check,
  ExternalLink,
  CalendarDays,
  Inbox,
} from 'lucide-react';
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
    (item) => item.status === 'OVERDUE'
  ).length;

  const dueSoon = notifications.filter(
    (item) => item.status === 'DUE_SOON'
  ).length;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) loadNotifications();
        }}
        className={`relative flex h-11 w-11 items-center justify-center rounded-xl border bg-white shadow-sm transition-all hover:bg-blue-50 hover:border-blue-200 ${
          open ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'
        }`}
        aria-label="Notificări mentenanță"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={21} strokeWidth={1.9} className="text-[#172B4D]" />

        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-14 z-50 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-[#172B4D]" />
                <h3 className="text-base font-semibold text-slate-900">
                  Notificări
                </h3>
              </div>

              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {unreadCount} necitite
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                <AlertCircle size={13} />
                {overdue} depășite
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                <Clock3 size={13} />
                {dueSoon} apropiate
              </span>
            </div>
          </div>

          {unreadCount > 0 && (
            <div className="border-b border-slate-100 px-5 py-3 text-right">
              <button
                type="button"
                onClick={markAllRead}
                disabled={markingAll}
                className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 transition hover:text-blue-900 hover:underline disabled:opacity-50"
              >
                <CheckCheck size={15} />
                {markingAll
                  ? 'Se salvează...'
                  : 'Marchează toate ca citite'}
              </button>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 px-5 py-3 text-sm text-red-700">
                <AlertCircle size={17} />
                Eroare la actualizarea notificărilor.
              </div>
            )}

            {notifications.length === 0 && !error && (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Inbox size={23} />
                </div>

                <p className="text-sm font-semibold text-slate-800">
                  Nu există alerte active
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Toate mentenanțele sunt în regulă.
                </p>
              </div>
            )}

            {notifications.map((item) => {
              const isOverdue = item.status === 'OVERDUE';
              const StatusIcon = isOverdue ? AlertCircle : Clock3;

              return (
                <div
                  key={`${item.scheduleId}-${item.status}-${item.dueDate}`}
                  className={`border-b border-slate-100 px-5 py-4 transition-colors hover:bg-slate-50 ${
                    item.isRead ? 'bg-white' : 'bg-blue-50/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        isOverdue
                          ? 'bg-red-50 text-red-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      <StatusIcon size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {item.asset?.name || 'Asset necunoscut'}
                        </p>

                        {!item.isRead && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                        )}
                      </div>

                      <p className="mt-1 text-xs text-slate-600">
                        {item.maintenanceType}
                      </p>

                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <CalendarDays size={13} />
                        Scadență:{' '}
                        {new Date(item.dueDate).toLocaleDateString('ro-RO')}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <Link
                          to={item.asset?.id ? `/assets/${item.asset.id}` : '/'}
                          onClick={() => {
                            if (!item.isRead) markRead(item);
                            setOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                        >
                          <ExternalLink size={13} />
                          Vezi asset
                        </Link>

                        {!item.isRead && (
                          <button
                            type="button"
                            disabled={busyId === item.scheduleId}
                            onClick={() => markRead(item)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
                          >
                            <Check size={14} />
                            {busyId === item.scheduleId
                              ? 'Se salvează...'
                              : 'Marchează citită'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
