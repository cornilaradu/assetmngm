import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CalendarClock,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  RotateCcw,
  CarFront,
  CalendarDays,
  UserRound,
  CircleCheck,
  ArrowRight,
} from 'lucide-react';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import MarkPerformedModal from '../components/MarkPerformedModal';
import { useAuth } from '../context/AuthContext';

const statusCards = [
  {
    status: 'OVERDUE',
    label: 'Depășite',
    icon: AlertCircle,
    accent: 'border-l-red-500',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
  },
  {
    status: 'DUE_SOON',
    label: 'Scadență apropiată',
    icon: CalendarClock,
    accent: 'border-l-amber-500',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    status: 'UPCOMING',
    label: 'Programate',
    icon: CalendarDays,
    accent: 'border-l-blue-500',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    status: 'DONE',
    label: 'Finalizate',
    icon: CheckCircle2,
    accent: 'border-l-emerald-500',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
];

export default function Dashboard({ moduleId = null, moduleName = null }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [performModalSchedule, setPerformModalSchedule] = useState(null);

  const { user } = useAuth();
  const canPerform = ['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(user?.role);

  async function load() {
    setLoading(true);

    try {
      const { data } = await api.get('/maintenance', {
        params: moduleId ? { moduleId } : {},
      });
      setSchedules(data);
    } catch (error) {
      console.error('Eroare la incarcarea mentenantelor:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setSchedules([]);
    setFilter('');
    setPerformModalSchedule(null);
    load();
  }, [moduleId]);

  const counts = schedules.reduce((acc, schedule) => {
    acc[schedule.status] = (acc[schedule.status] || 0) + 1;
    return acc;
  }, {});

  const filteredSchedules = filter
    ? schedules.filter((schedule) => schedule.status === filter)
    : schedules;

  function handlePerformSuccess() {
    setPerformModalSchedule(null);
    load();
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {moduleName ? `Dashboard ${moduleName}` : 'Dashboard mentenanță'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Prezentare generală a asseturilor și mentenanțelor
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statusCards.map((card) => {
          const Icon = card.icon;
          const isActive = filter === card.status;

          return (
            <button
              key={card.status}
              type="button"
              onClick={() => setFilter(isActive ? '' : card.status)}
              aria-pressed={isActive}
              className={`flex items-center gap-4 rounded-2xl border border-slate-200 border-l-4 ${card.accent} bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                isActive ? 'ring-2 ring-blue-500 ring-offset-2' : ''
              }`}
            >
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}
              >
                <Icon size={27} className={card.iconColor} strokeWidth={1.8} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-3xl font-bold text-slate-900">
                  {counts[card.status] || 0}
                </div>
                <div className="mt-1">
                  <StatusBadge status={card.status} />
                </div>
              </div>

              <ArrowRight size={17} className="shrink-0 text-slate-400" />
            </button>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ClipboardList size={21} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Mentenanțe active și viitoare
              </h2>
              <p className="text-xs text-slate-500">
                {loading
                  ? 'Se încarcă mentenanțele...'
                  : `${filteredSchedules.length} mentenanțe afișate`}
              </p>
            </div>
          </div>

          {filter && (
            <button
              type="button"
              onClick={() => setFilter('')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
            >
              <RotateCcw size={15} />
              Afișează toate
            </button>
          )}
        </div>

        {filter && (
          <div className="flex items-center gap-2 border-b border-slate-100 bg-blue-50/50 px-6 py-3 text-sm text-slate-600">
            Filtru activ:
            <StatusBadge status={filter} />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-5 py-4">Asset</th>
                <th className="px-5 py-4">Tip mentenanță</th>
                <th className="px-5 py-4">Scadență</th>
                <th className="px-5 py-4">Responsabil</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Acțiuni</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td className="px-5 py-8 text-center text-slate-500" colSpan={6}>
                    Se încarcă...
                  </td>
                </tr>
              )}

              {!loading && filteredSchedules.length === 0 && (
                <tr>
                  <td className="px-5 py-10 text-center text-slate-500" colSpan={6}>
                    Nicio mentenanță găsită.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredSchedules.map((schedule) => (
                  <tr
                    key={schedule.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <ClipboardList size={17} />
                        </div>

                        <div className="font-semibold">
                          {schedule.asset?.id ? (
                            <Link
                              to={`/assets/${schedule.asset.id}`}
                              className="text-blue-700 hover:text-blue-900 hover:underline"
                            >
                              {schedule.asset.name}
                            </Link>
                          ) : (
                            <span className="text-slate-700">
                              {schedule.asset?.name || '—'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {schedule.maintenanceType}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 whitespace-nowrap text-slate-700">
                        <CalendarDays size={16} className="text-slate-400" />
                        {schedule.nextDueDate
                          ? new Date(schedule.nextDueDate).toLocaleDateString('ro-RO')
                          : '—'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 text-slate-700">
                        <UserRound size={16} className="text-slate-400" />
                        {schedule.responsible?.fullName || '—'}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={schedule.status} />
                    </td>

                    <td className="px-5 py-4 text-right">
                      {canPerform && (
                        <button
                          type="button"
                          onClick={() => setPerformModalSchedule(schedule)}
                          className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                        >
                          <CircleCheck size={16} />
                          Marchează efectuată
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {performModalSchedule && (
        <MarkPerformedModal
          scheduleId={performModalSchedule.id}
          assetName={performModalSchedule.asset?.name}
          maintenanceType={performModalSchedule.maintenanceType}
          onClose={() => setPerformModalSchedule(null)}
          onSuccess={handlePerformSuccess}
        />
      )}
    </div>
  );
}
