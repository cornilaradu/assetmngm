import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  maintenanceType: '',
  description: '',
  recurrenceDays: 365,
  firstDueDate: '',
  reminderDaysBefore: 7,
  responsibleId: '',
  responsibleEmailCc: '',
};

export default function AssetDetail() {
  const { id } = useParams();
  const [asset, setAsset] = useState(null);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { user } = useAuth();
  const canEdit = ['ADMIN', 'MANAGER'].includes(user?.role);

  async function load() {
    const { data } = await api.get(`/assets/${id}`);
    setAsset(data);
  }

  async function loadUsers() {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch {
      // MANAGER/ADMIN only endpoint; ignora daca nu are acces
    }
  }

  useEffect(() => {
    load();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCreateSchedule(e) {
    e.preventDefault();
    await api.post('/maintenance', { ...form, assetId: id });
    setForm(emptyForm);
    setShowForm(false);
    load();
  }

  async function markPerformed(scheduleId) {
    await api.post(`/maintenance/${scheduleId}/mark-performed`, {});
    load();
  }

  if (!asset) return <div>Se incarca...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{asset.name}</h1>
        <div className="text-sm text-gray-500">
          {asset.internalCode} · {asset.category} · {asset.location || 'fara locatie'}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Tipuri de mentenanta</h2>
        {canEdit && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            {showForm ? 'Anuleaza' : '+ Tip de mentenanta nou'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreateSchedule} className="bg-white p-5 rounded-xl border grid grid-cols-2 gap-4">
          <input required placeholder="Tip mentenanta (ex: Revizie anuala)" value={form.maintenanceType}
            onChange={(e) => setForm({ ...form, maintenanceType: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm col-span-2" />

          <textarea placeholder="Descriere (optional)" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm col-span-2" />

          <div>
            <label className="block text-xs text-gray-500 mb-1">Prima data scadenta</label>
            <input required type="date" value={form.firstDueDate}
              onChange={(e) => setForm({ ...form, firstDueDate: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm w-full" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Recurenta (zile, 0 = o singura data)</label>
            <input type="number" min="0" value={form.recurrenceDays}
              onChange={(e) => setForm({ ...form, recurrenceDays: Number(e.target.value) })}
              className="border rounded-lg px-3 py-2 text-sm w-full" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Reminder (zile inainte de scadenta)</label>
            <input type="number" min="0" value={form.reminderDaysBefore}
              onChange={(e) => setForm({ ...form, reminderDaysBefore: Number(e.target.value) })}
              className="border rounded-lg px-3 py-2 text-sm w-full" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Responsabil</label>
            <select value={form.responsibleId}
              onChange={(e) => setForm({ ...form, responsibleId: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm w-full">
              <option value="">Fara responsabil</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Email CC suplimentar (optional)</label>
            <input type="email" value={form.responsibleEmailCc}
              onChange={(e) => setForm({ ...form, responsibleEmailCc: e.target.value })}
              placeholder="ex: mentenanta@compania.ro"
              className="border rounded-lg px-3 py-2 text-sm w-full" />
          </div>

          <button type="submit" className="col-span-2 bg-brand-600 text-white py-2 rounded-lg text-sm font-medium">
            Salveaza tip de mentenanta
          </button>
        </form>
      )}

      <div className="grid gap-4">
        {asset.maintenanceSchedules.map((s) => (
          <div key={s.id} className="bg-white p-4 rounded-xl border">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">{s.maintenanceType}</div>
                {s.description && <div className="text-sm text-gray-500">{s.description}</div>}
              </div>
              <StatusBadge status={s.status} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-3">
              <div>
                <div className="text-xs text-gray-400">Scadenta urmatoare</div>
                <div>{new Date(s.nextDueDate).toLocaleDateString('ro-RO')}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Recurenta</div>
                <div>{s.recurrenceDays > 0 ? `la ${s.recurrenceDays} zile` : 'o singura data'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Reminder</div>
                <div>cu {s.reminderDaysBefore} zile inainte</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Responsabil</div>
                <div>{s.responsible?.fullName || '—'}</div>
              </div>
            </div>
            <button
              onClick={() => markPerformed(s.id)}
              className="mt-3 text-brand-600 hover:underline text-xs font-medium"
            >
              Marcheaza ca efectuata acum
            </button>

            {s.history?.length > 0 && (
              <div className="mt-3 border-t pt-2">
                <div className="text-xs text-gray-400 mb-1">Istoric</div>
                <ul className="text-xs text-gray-600 space-y-1">
                  {s.history.slice(0, 5).map((h) => (
                    <li key={h.id}>
                      {new Date(h.performedAt).toLocaleDateString('ro-RO')} — {h.performedBy || 'necunoscut'}
                      {h.notes ? ` (${h.notes})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        {asset.maintenanceSchedules.length === 0 && (
          <div className="text-gray-500">Niciun tip de mentenanta configurat pentru acest asset.</div>
        )}
      </div>
    </div>
  );
}
