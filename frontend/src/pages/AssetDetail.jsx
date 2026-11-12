import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import StatusBadge from '../components/StatusBadge';
import MarkPerformedModal from '../components/MarkPerformedModal';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const emptyScheduleForm = {
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [asset, setAsset] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modules, setModules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyScheduleForm);

  const [editMode, setEditMode] = useState(searchParams.get('edit') === '1');
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState('');

  const [performModalSchedule, setPerformModalSchedule] = useState(null);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [scheduleEdit, setScheduleEdit] = useState(null);
  const [scheduleEditError, setScheduleEditError] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = ['ADMIN', 'MANAGER'].includes(user?.role);
  const canPerform = ['ADMIN', 'MANAGER', 'TECHNICIAN'].includes(user?.role);
  const canDelete = user?.role === 'ADMIN';

  const availableModules = modules.filter((module) =>
    user?.role === 'ADMIN' ||
    user?.moduleAccess?.some(
      (access) => access.moduleId === module.id
    )
  );

  async function load() {
    const { data } = await api.get(`/assets/${id}`);
    setAsset(data);
    setEditForm({
      name: data.name,
      moduleId: data.moduleId || '',
      categoryId: data.categoryId || '',
      location: data.location || '',
      description: data.description || '',
      status: data.status,
      departmentId: data.departmentId || '',
      ownerId: data.ownerId || '',
    });
  }

  async function loadUsers() {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch {
      // MANAGER/ADMIN only endpoint; ignora daca nu are acces
    }
  }

  async function loadDepartments() {
    const { data } = await api.get('/users/departments/all');
    setDepartments(data);
  }

  async function loadModules() {
    try {
      const { data } = await api.get('/users/modules/all');
      setModules(data);
    } catch (err) {
      console.error('Eroare la incarcarea modulelor:', err);
      setEditError('Nu s-au putut incarca modulele.');
    }
  }

  async function loadCategories() {
    const { data } = await api.get('/categories');
    setCategories(data);
  }

  useEffect(() => {
    load();
    loadUsers();
    loadDepartments();
    loadCategories();
    loadModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCreateSchedule(e) {
    e.preventDefault();
    await api.post('/maintenance', { ...form, assetId: id });
    setForm(emptyScheduleForm);
    setShowForm(false);
    load();
  }

  function startScheduleEdit(schedule) {
    setEditingScheduleId(schedule.id);
    setScheduleEditError('');
    setScheduleEdit({
      maintenanceType: schedule.maintenanceType,
      description: schedule.description || '',
      nextDueDate: schedule.nextDueDate.slice(0, 10),
      recurrenceDays: schedule.recurrenceDays,
      reminderDaysBefore: schedule.reminderDaysBefore,
      responsibleId: schedule.responsibleId || '',
      responsibleEmailCc: schedule.responsibleEmailCc || '',
    });
  }

  async function handleSaveSchedule(e) {
    e.preventDefault();
    if (!editingScheduleId || scheduleSaving) return;

    setScheduleSaving(true);
    setScheduleEditError('');

    try {
      await api.put(`/maintenance/${editingScheduleId}`, {
        ...scheduleEdit,
        nextDueDate: `${scheduleEdit.nextDueDate}T12:00:00.000Z`,
        responsibleId: scheduleEdit.responsibleId || null,
        responsibleEmailCc: scheduleEdit.responsibleEmailCc || null,
      });

      await load();
      setEditingScheduleId(null);
      setScheduleEdit(null);
    } catch (err) {
      setScheduleEditError(
        err.response?.data?.error || 'Nu s-a putut salva mentenanta.'
      );
    } finally {
      setScheduleSaving(false);
    }
  }

  function handlePerformSuccess() {
    setPerformModalSchedule(null);
    load();
  }

  async function handleSaveAsset(e) {
    e.preventDefault();
    setEditError('');
    try {
      await api.put(`/assets/${id}`, {
        ...editForm,
        departmentId: editForm.departmentId || null,
        ownerId: editForm.ownerId || null,
      });
      setEditMode(false);
      searchParams.delete('edit');
      setSearchParams(searchParams);
      load();
    } catch (err) {
      setEditError(err.response?.data?.error || 'Eroare la salvarea asset-ului.');
    }
  }

  async function handleDeleteAsset() {
    if (!window.confirm(`Sigur vrei sa stergi asset-ul "${asset.name}"? Aceasta actiune este ireversibila si va sterge si tot istoricul de mentenanta asociat.`)) {
      return;
    }
    await api.delete(`/assets/${id}`);
    navigate('/assets');
  }

  if (!asset || !editForm) return <div>Se incarca...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          {!editMode ? (
            <>
              <h1 className="text-2xl font-semibold">{asset.name}</h1>
              <div className="text-sm text-gray-500">
                {asset.internalCode} · {asset.categoryRef?.name || asset.category || 'fara categorie'} · {asset.location || 'fara locatie'}
              </div>
              <div className="text-sm text-gray-500">
                Departament: {asset.department?.name || 'nedefinit'} · Status: {asset.status}
              </div>
            </>
          ) : (
            <h1 className="text-2xl font-semibold">Editare asset</h1>
          )}
        </div>
        {(canEdit || canDelete) && (
          <div className="flex gap-3 text-sm">
            {canEdit && !editMode && (
              <button onClick={() => setEditMode(true)} className="text-brand-600 hover:underline font-medium">
                Editeaza asset
              </button>
            )}
            {canDelete && (
              <button onClick={handleDeleteAsset} className="text-red-600 hover:underline font-medium">
                Sterge asset
              </button>
            )}
          </div>
        )}
      </div>

      {editMode && (
        <form onSubmit={handleSaveAsset} className="bg-white p-5 rounded-xl border grid grid-cols-2 gap-4">
          {editError && <div className="col-span-2 bg-red-50 text-red-700 text-sm p-2 rounded">{editError}</div>}

          <input required placeholder="Nume asset" value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />

          <div>
            <label
              htmlFor="edit-asset-module"
              className="block text-xs text-gray-500 mb-1"
            >
              Modul mentenanță
            </label>
            <select
              id="edit-asset-module"
              required
              value={editForm.moduleId}
              onChange={(e) =>
                setEditForm({ ...editForm, moduleId: e.target.value })
              }
              className="border rounded-lg px-3 py-2 text-sm w-full"
            >
              <option value="">Selectează modulul...</option>
              {availableModules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.name}
                </option>
              ))}
            </select>
            {availableModules.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                Nu ai module disponibile pentru editare.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Categorie</label>
            <select required value={editForm.categoryId}
              onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm w-full">
              <option value="">Selecteaza categoria...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <input placeholder="Locatie" value={editForm.location}
            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />

          <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="ACTIVE">Activ</option>
            <option value="IN_REPAIR">In reparatie</option>
            <option value="RETIRED">Casat / scos din uz</option>
          </select>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Departament responsabil</label>
            <select value={editForm.departmentId}
              onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm w-full">
              <option value="">Fara departament</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Proprietar / persoana de contact</label>
            <select value={editForm.ownerId}
              onChange={(e) => setEditForm({ ...editForm, ownerId: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm w-full">
              <option value="">Fara proprietar</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>

          <textarea placeholder="Descriere (optional)" value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm col-span-2" />

          <div className="col-span-2 flex gap-3">
            <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Salveaza modificarile
            </button>
            <button
              type="button"
              onClick={() => { setEditMode(false); searchParams.delete('edit'); setSearchParams(searchParams); }}
              className="text-gray-600 text-sm font-medium"
            >
              Anuleaza
            </button>
          </div>
        </form>
      )}

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
              <div className="flex items-center gap-3">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      if (editingScheduleId === s.id) {
                        setEditingScheduleId(null);
                        setScheduleEdit(null);
                      } else {
                        startScheduleEdit(s);
                      }
                    }}
                    className="text-sm font-medium text-brand-600 hover:underline"
                  >
                    {editingScheduleId === s.id ? 'Anuleaza' : 'Editeaza mentenanta'}
                  </button>
                )}
                <StatusBadge status={s.status} />
              </div>
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
            {editingScheduleId === s.id && scheduleEdit && (
              <form
                onSubmit={handleSaveSchedule}
                className="mt-4 grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2"
              >
                {scheduleEditError && (
                  <div className="md:col-span-2 text-sm text-red-600">
                    {scheduleEditError}
                  </div>
                )}
                <label className="text-sm">
                  Tip mentenanta
                  <input required className="mt-1 w-full rounded-lg border p-2"
                    value={scheduleEdit.maintenanceType}
                    onChange={(e) => setScheduleEdit({
                      ...scheduleEdit, maintenanceType: e.target.value
                    })} />
                </label>
                <label className="text-sm">
                  Scadenta urmatoare
                  <input required type="date" className="mt-1 w-full rounded-lg border p-2"
                    value={scheduleEdit.nextDueDate}
                    onChange={(e) => setScheduleEdit({
                      ...scheduleEdit, nextDueDate: e.target.value
                    })} />
                </label>
                <label className="text-sm">
                  Recurenta (zile)
                  <input required type="number" min="0" step="1"
                    className="mt-1 w-full rounded-lg border p-2"
                    value={scheduleEdit.recurrenceDays}
                    onChange={(e) => setScheduleEdit({
                      ...scheduleEdit, recurrenceDays: Number(e.target.value)
                    })} />
                </label>
                <label className="text-sm">
                  Reminder (zile inainte)
                  <input required type="number" min="0" step="1"
                    className="mt-1 w-full rounded-lg border p-2"
                    value={scheduleEdit.reminderDaysBefore}
                    onChange={(e) => setScheduleEdit({
                      ...scheduleEdit, reminderDaysBefore: Number(e.target.value)
                    })} />
                </label>
                <label className="text-sm">
                  Responsabil
                  <select className="mt-1 w-full rounded-lg border p-2"
                    value={scheduleEdit.responsibleId}
                    onChange={(e) => setScheduleEdit({
                      ...scheduleEdit, responsibleId: e.target.value
                    })}>
                    <option value="">Fara responsabil</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.fullName}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Email CC suplimentar
                  <input type="email" className="mt-1 w-full rounded-lg border p-2"
                    value={scheduleEdit.responsibleEmailCc}
                    onChange={(e) => setScheduleEdit({
                      ...scheduleEdit, responsibleEmailCc: e.target.value
                    })} />
                </label>
                <label className="text-sm md:col-span-2">
                  Descriere
                  <textarea className="mt-1 w-full rounded-lg border p-2"
                    value={scheduleEdit.description}
                    onChange={(e) => setScheduleEdit({
                      ...scheduleEdit, description: e.target.value
                    })} />
                </label>
                <div className="flex gap-3 md:col-span-2">
                  <button type="submit" disabled={scheduleSaving}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                    {scheduleSaving ? 'Se salveaza...' : 'Salveaza modificarile'}
                  </button>
                  <button type="button" disabled={scheduleSaving}
                    onClick={() => {
                      setEditingScheduleId(null);
                      setScheduleEdit(null);
                    }}
                    className="rounded-lg border px-4 py-2 text-sm">
                    Anuleaza
                  </button>
                </div>
              </form>
            )}
            {canPerform && (
              <button
                onClick={() => setPerformModalSchedule(s)}
                className="mt-3 text-brand-600 hover:underline text-xs font-medium"
              >
                Marcheaza ca efectuata acum
              </button>
            )}

            {s.history?.length > 0 && (
              <div className="mt-3 border-t pt-2">
                <div className="text-xs text-gray-400 mb-1">Istoric</div>
                <ul className="text-xs text-gray-600 space-y-2">
                  {s.history.slice(0, 5).map((h) => (
                    <li key={h.id}>
                      <div>
                        {new Date(h.performedAt).toLocaleDateString('ro-RO')} — {h.performedBy || 'necunoscut'}
                        {h.notes ? ` (${h.notes})` : ''}
                      </div>
                      {h.documents?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {h.documents.map((doc) => (
                            <a
                              key={doc.id}
                              href={`${API_BASE_URL}/maintenance/documents/${doc.id}/download`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 bg-blue-50 text-brand-700 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100"
                              onClick={(e) => {
                                // Trimitem tokenul prin fetch + blob, link-ul simplu nu poate atasa header Authorization
                                e.preventDefault();
                                api.get(`/maintenance/documents/${doc.id}/download`, { responseType: 'blob' })
                                  .then((res) => {
                                    const url = window.URL.createObjectURL(new Blob([res.data]));
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = doc.fileName;
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                  });
                              }}
                            >
                              📎 {doc.fileName}
                            </a>
                          ))}
                        </div>
                      )}
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

      {performModalSchedule && (
        <MarkPerformedModal
          scheduleId={performModalSchedule.id}
          assetName={asset.name}
          maintenanceType={performModalSchedule.maintenanceType}
          onClose={() => setPerformModalSchedule(null)}
          onSuccess={handlePerformSuccess}
        />
      )}
    </div>
  );
}
