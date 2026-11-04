
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

const statusColors = {
  OVERDUE: 'bg-red-100 text-red-800 border-red-200',
  DUE_SOON: 'bg-amber-100 text-amber-800 border-amber-200',
  UPCOMING: 'bg-blue-100 text-blue-800 border-blue-200',
  DONE: 'bg-green-100 text-green-800 border-green-200',
};

const weekdays = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sa', 'Du'];

function dateKey(date) {
  return new Date(date).toLocaleDateString('en-CA', {
    timeZone: 'Europe/Bucharest',
  });
}

export default function Calendar() {
  const [month, setMonth] = useState(() => new Date());
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/maintenance');
        setSchedules(data);
      } catch (err) {
        setError('Nu am putut incarca mentenantele.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function changeMonth(offset) {
    setMonth((current) =>
      new Date(current.getFullYear(), current.getMonth() + offset, 1)
    );
  }

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;

  const cells = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = month.toLocaleDateString('ro-RO', {
    month: 'long',
    year: 'numeric',
  });

  function schedulesForDay(day) {
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedules.filter((schedule) => dateKey(schedule.nextDueDate) === key);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Calendar mentenante</h1>

      <div className="bg-white rounded-xl border shadow-sm p-4">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => changeMonth(-1)}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            ← Anterior
          </button>

          <h2 className="text-xl font-semibold capitalize">{monthLabel}</h2>

          <button
            onClick={() => changeMonth(1)}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Urmator →
          </button>
        </div>

        {loading && <p className="text-gray-500">Se incarca...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="grid grid-cols-7 gap-1">
            {weekdays.map((day) => (
              <div key={day} className="text-center text-sm font-semibold py-2 bg-gray-100">
                {day}
              </div>
            ))}

            {cells.map((day, index) => (
              <div
                key={index}
                className="min-h-28 border rounded-lg p-2 bg-white"
              >
                {day && (
                  <>
                    <div className="text-sm font-medium mb-2">{day}</div>
                    <div className="space-y-1">
                      {schedulesForDay(day).map((schedule) => (
                        <Link
                          key={schedule.id}
                          to={`/assets/${schedule.assetId}`}
                          title={`${schedule.asset?.name} - ${schedule.maintenanceType}`}
                          className={`block text-xs p-1 rounded border hover:opacity-80 ${
                            statusColors[schedule.status] || statusColors.UPCOMING
                          }`}
                        >
                          <span className="font-medium">{schedule.asset?.name}</span>
                          <span className="block">{schedule.maintenanceType}</span>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <span className="text-red-700">● Depasita</span>
        <span className="text-amber-700">● Scadenta apropiata</span>
        <span className="text-blue-700">● Programata</span>
        <span className="text-green-700">● Finalizata</span>
      </div>
    </div>
  );
}
