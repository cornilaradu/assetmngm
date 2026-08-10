import React, { useEffect, useState } from 'react';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import MarkPerformedModal from '../components/MarkPerformedModal';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [performModalSchedule, setPerformModalSchedule] = useState(null);
  const { user } = useAuth();
  const canPerform = ['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(user?.role);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/maintenance', { params: filter ? { status: filter } : {} });
    setSchedules(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const counts = schedules.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});

  function handlePerformSuccess() {
    setPerformModalSchedule(null);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard mentenanta</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['OVERDUE', 'DUE_SOON', 'UPCOMING', 'DONE'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(filter === status ? '' : status)}
            className={`p-4 rounded-xl border text-left transition ${
              filter === status ? 'ring-2 ring-brand-600' : ''
            } bg-white`}
          >
            <div className="text-2xl font-semibold">{counts[status] || 0}</div>
            <StatusBadge status={status} />
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Asset</th>
              <th className="p-3">Tip mentenanta</th>
              <th className="p-3">Scadenta</th>
              <th className="p-3">Responsabil</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="p-4 text-gray-500" colSpan={6}>Se incarca...</td></tr>
            )}
            {!loading && schedules.length === 0 && (
              <tr><td className="p-4 text-gray-500" colSpan={6}>Nicio mentenanta gasita.</td></tr>
            )}
            {schedules.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium">{s.asset?.name}</td>
                <td className="p-3">{s.maintenanceType}</td>
                <td className="p-3">{new Date(s.nextDueDate).toLocaleDateString('ro-RO')}</td>
                <td className="p-3">{s.responsible?.fullName || '—'}</td>
                <td className="p-3"><StatusBadge status={s.status} /></td>
                <td className="p-3">
                  {canPerform && (
                    <button
                      onClick={() => setPerformModalSchedule(s)}
                      className="text-brand-600 hover:underline text-xs font-medium"
                    >
                      Marcheaza efectuata
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
