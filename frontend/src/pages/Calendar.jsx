import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  AlertCircle,
  CheckCircle2,
  CalendarCheck,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const calendarModules = [
  { code: 'AUTO', label: 'AUTO' },
  { code: 'UPS', label: 'UPS' },
  { code: 'FACILITIES', label: 'FACILITĂȚI' },
];

const statusStyles = {
  OVERDUE: {
    event: 'border-red-200 border-l-red-500 bg-red-50 text-red-800 hover:bg-red-100',
    dot: 'bg-red-500',
    label: 'Depășită',
    icon: AlertCircle,
  },
  DUE_SOON: {
    event: 'border-amber-200 border-l-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100',
    dot: 'bg-amber-500',
    label: 'Scadență apropiată',
    icon: Clock3,
  },
  UPCOMING: {
    event: 'border-blue-200 border-l-blue-500 bg-blue-50 text-blue-900 hover:bg-blue-100',
    dot: 'bg-blue-500',
    label: 'Programată',
    icon: CalendarDays,
  },
  DONE: {
    event: 'border-emerald-200 border-l-emerald-500 bg-emerald-50 text-emerald-900 hover:bg-emerald-100',
    dot: 'bg-emerald-500',
    label: 'Finalizată',
    icon: CheckCircle2,
  },
};

const weekdays = [
  'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sa', 'Du',
];

function dateKey(date) {
  return new Date(date).toLocaleDateString('en-CA', {
    timeZone: 'Europe/Bucharest',
  });
}

function localDayKey(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Bucharest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type) =>
    parts.find((part) => part.type === type)?.value;

  return `${get('year')}-${get('month')}-${get('day')}`;
}

export default function Calendar() {
  const { user } = useAuth();
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [month, setMonth] = useState(() => new Date());
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/maintenance');
        setSchedules(data);
        setError('');
      } catch (err) {
        console.error('Eroare calendar:', err);
        setError('Nu am putut încărca mentenanțele.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function changeMonth(offset) {
    setMonth((current) =>
      new Date(
        current.getFullYear(),
        current.getMonth() + offset,
        1
      )
    );
  }

  const visibleModules = calendarModules.filter((module) =>
    user?.role === 'ADMIN' ||
    user?.moduleAccess?.some(
      (access) => access.module?.code === module.code
    )
  );

  const [moduleRecords, setModuleRecords] = useState([]);

  useEffect(() => {
    api.get('/users/modules/all')
      .then(({ data }) => setModuleRecords(data))
      .catch(() => setError('Nu am putut încărca modulele.'));
  }, []);

  const filteredSchedules = useMemo(() => {
    if (selectedModule === 'ALL') return schedules;

    const moduleRecord = moduleRecords.find(
      (module) => module.code === selectedModule
    );

    if (!moduleRecord) return [];

    return schedules.filter(
      (schedule) => schedule.asset?.moduleId === moduleRecord.id
    );
  }, [schedules, selectedModule, moduleRecords]);

  const today = new Date();
  const todayKey = localDayKey(today);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(
    year,
    monthIndex + 1,
    0
  ).getDate();

  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells = [
    ...Array(startOffset).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, index) => index + 1
    ),
  ];

  const monthLabel = month.toLocaleDateString('ro-RO', {
    month: 'long',
    year: 'numeric',
  });

  const schedulesByDay = useMemo(() => {
    const grouped = {};

    for (const schedule of filteredSchedules) {
      if (!schedule.nextDueDate) continue;

      const key = dateKey(schedule.nextDueDate);

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(schedule);
    }

    return grouped;
  }, [filteredSchedules]);

  function schedulesForDay(day) {
    const key =
      `${year}-` +
      `${String(monthIndex + 1).padStart(2, '0')}-` +
      `${String(day).padStart(2, '0')}`;

    return schedulesByDay[key] || [];
  }

  return (
    <div className="space-y-7">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600">
          <CalendarDays size={27} strokeWidth={1.8} />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Calendar mentenanțe
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Planificarea și urmărirea mentenanțelor pe luni
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label htmlFor="calendar-module" className="text-sm font-semibold text-slate-700">
          Modul mentenanță:
        </label>
        <select
          id="calendar-module"
          value={selectedModule}
          onChange={(e) => setSelectedModule(e.target.value)}
          className="min-w-[220px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm"
        >
          <option value="ALL">Toate modulele</option>
          {visibleModules.map((module) => (
            <option key={module.code} value={module.code}>
              {module.label}
            </option>
          ))}
        </select>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-5">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ChevronLeft size={17} />
            Anterior
          </button>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarDays
                size={21}
                className="text-[#172B4D]"
              />

              <h2 className="text-xl font-bold capitalize text-slate-900">
                {monthLabel}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setMonth(new Date())}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Astăzi
            </button>
          </div>

          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Următor
            <ChevronRight size={17} />
          </button>
        </div>

        {loading && (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Se încarcă mentenanțele...
          </div>
        )}

        {error && (
          <div className="mx-5 my-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto px-4 pt-4 pb-5">
            <div className="min-w-[760px]">
              <div className="mb-2 grid grid-cols-7 gap-1.5">
                {weekdays.map((day) => (
                  <div
                    key={day}
                    className="rounded-lg bg-slate-100 px-2 py-2.5 text-center text-xs font-bold text-slate-600"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {cells.map((day, index) => {
                  const key = day
                    ? `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    : null;

                  const isToday = key === todayKey;

                  const daySchedules = day
                    ? schedulesForDay(day)
                    : [];

                  return (
                    <div
                      key={index}
                      className={`min-h-[116px] rounded-xl border p-2 transition-colors ${
                        !day
                          ? 'border-transparent bg-slate-50/50'
                          : isToday
                          ? 'border-2 border-blue-500 bg-blue-50/60'
                          : 'border-slate-200 bg-white hover:bg-slate-50/60'
                      }`}
                    >
                      {day && (
                        <>
                          <div className="mb-2 flex items-center justify-between">
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm font-semibold ${
                                isToday
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-800'
                              }`}
                            >
                              {day}
                            </span>

                            {daySchedules.length > 0 && (
                              <span className="text-[10px] font-medium text-slate-400">
                                {daySchedules.length}
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            {daySchedules.map((schedule) => {
                              const style =
                                statusStyles[schedule.status] ||
                                statusStyles.UPCOMING;

                              const EventIcon = style.icon;

                              return (
                                <Link
                                  key={schedule.id}
                                  to={
                                    schedule.asset?.id
                                      ? `/assets/${schedule.asset.id}`
                                      : `/assets/${schedule.assetId}`
                                  }
                                  title={`${schedule.asset?.name || 'Asset'} - ${schedule.maintenanceType}`}
                                  className={`block rounded-lg border border-l-[3px] px-2 py-2 text-xs transition-colors ${style.event}`}
                                >
                                  <div className="flex items-start gap-1">
                                    <EventIcon
                                      size={13}
                                      className="mt-0.5 shrink-0"
                                    />

                                    <span className="break-words font-semibold leading-4">
                                      {schedule.asset?.name || 'Asset'}
                                    </span>
                                  </div>

                                  <div className="mt-1 pl-[17px] text-[10px] opacity-80">
                                    {schedule.maintenanceType}
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <span className="text-xs font-semibold text-slate-700">
              Legendă status mentenanță:
            </span>

            {Object.entries(statusStyles).map(([status, style]) => (
              <span
                key={status}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${style.dot}`}
                />

                {style.label}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
