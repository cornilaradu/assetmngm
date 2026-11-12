import { Building2, Tags, Plus, Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [modules, setModules] = useState([]);
  const [savingModuleUserId, setSavingModuleUserId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newDept, setNewDept] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [newUser, setNewUser] = useState({ email: '', password: '', fullName: '', role: 'VIEWER', departmentId: '' });
  const [message, setMessage] = useState('');

  async function load() {
    const [u, d, c, m] = await Promise.all([
      api.get('/users'),
      api.get('/users/departments/all'),
      api.get('/categories'),
      api.get('/users/modules/all'),
    ]);
    setUsers(u.data);
    setModules(m.data);
    setDepartments(d.data);
    setCategories(c.data);
  }

  useEffect(() => { load(); }, []);

  async function createDepartment(e) {
    e.preventDefault();
    await api.post('/users/departments', { name: newDept });
    setNewDept('');
    load();
  }

  async function createCategory(e) {
    e.preventDefault();
    setCategoryError('');
    try {
      await api.post('/categories', { name: newCategory });
      setNewCategory('');
      load();
    } catch (err) {
      setCategoryError(err.response?.data?.error || 'Eroare la crearea categoriei.');
    }
  }

  function startEditCategory(cat) {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
    setCategoryError('');
  }

  async function saveEditCategory(e) {
    e.preventDefault();
    setCategoryError('');
    try {
      await api.put(`/categories/${editingCategoryId}`, { name: editingCategoryName });
      setEditingCategoryId(null);
      setEditingCategoryName('');
      load();
    } catch (err) {
      setCategoryError(err.response?.data?.error || 'Eroare la salvarea categoriei.');
    }
  }

  async function deleteCategory(cat) {
    const usageWarning = cat._count?.assets > 0
      ? `\n\nAceasta categorie este folosita in prezent de ${cat._count.assets} asset(uri). Dupa stergere, acele asset-uri vor ramane fara categorie.`
      : '';
    if (!window.confirm(`Sigur vrei sa stergi categoria "${cat.name}"?${usageWarning}`)) return;
    await api.delete(`/categories/${cat.id}`);
    load();
  }

  async function createUser(e) {
    e.preventDefault();
    setMessage('');
    try {
      await api.post('/auth/register', newUser);
      setNewUser({ email: '', password: '', fullName: '', role: 'VIEWER', departmentId: '' });
      setMessage('Utilizator creat cu succes.');
      load();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Eroare la crearea utilizatorului.');
    }
  }

  async function updateUserRole(userId, role) {
    await api.put(`/users/${userId}`, { role });
    load();
  }

  async function toggleUserModule(user, moduleId, checked) {
    const currentIds = (user.moduleAccess || []).map(a => a.moduleId);
    const nextIds = checked
      ? [...new Set([...currentIds, moduleId])]
      : currentIds.filter(id => id !== moduleId);

    setSavingModuleUserId(user.id);
    setMessage('');

    try {
      await api.put(`/users/${user.id}/modules`, {
        moduleIds: nextIds,
      });
      await load();
      setMessage(`Modulele utilizatorului ${user.fullName} au fost actualizate.`);
    } catch (err) {
      setMessage(
        err.response?.data?.error || 'Eroare la actualizarea modulelor.'
      );
    } finally {
      setSavingModuleUserId(null);
    }
  }

  async function toggleActive(userId, active) {
    await api.put(`/users/${userId}`, { active: !active });
    load();
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Administrare
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestionează utilizatorii, departamentele și categoriile de asset-uri.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Building2 size={21} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Departamente</h2>
              <p className="text-xs text-slate-500">
                Organizează asset-urile pe departamente.
              </p>
            </div>
          </div>

          <form onSubmit={createDepartment} className="flex flex-wrap gap-2">
            <input
              placeholder="Nume departament nou"
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              required
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={16} /> Adaugă
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {departments.map((d) => (
              <span
                key={d.id}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700"
              >
                {d.name}
              </span>
            ))}
            {departments.length === 0 && (
              <p className="text-sm text-slate-500">
                Nu există departamente.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
              <Tags size={21} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">
                Categorii de asset-uri
              </h2>
              <p className="text-xs text-slate-500">
                Categorii disponibile la crearea și editarea asset-urilor.
              </p>
            </div>
          </div>

          {categoryError && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {categoryError}
            </div>
          )}

          <form onSubmit={createCategory} className="flex flex-wrap gap-2">
            <input
              placeholder="Categorie nouă (ex: UPS, HVAC, Auto)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              required
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={16} /> Adaugă
            </button>
          </form>

          <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                {editingCategoryId === cat.id ? (
                  <form
                    onSubmit={saveEditCategory}
                    className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                  >
                    <input
                      autoFocus
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <button type="submit" className="text-xs font-semibold text-blue-600">
                      Salvează
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingCategoryId(null)}
                      className="text-xs text-slate-500"
                    >
                      Anulează
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="min-w-0">
                      <span className="font-medium text-slate-800">
                        {cat.name}
                      </span>
                      <span className="ml-2 text-xs text-slate-400">
                        ({cat._count?.assets || 0} asset-uri)
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => startEditCategory(cat)}
                        title="Editează categoria"
                        aria-label={`Editează ${cat.name}`}
                        className="rounded-lg border border-blue-100 bg-blue-50 p-2 text-blue-600 hover:bg-blue-100"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCategory(cat)}
                        title="Șterge categoria"
                        aria-label={`Șterge ${cat.name}`}
                        className="rounded-lg border border-red-100 bg-red-50 p-2 text-red-600 hover:bg-red-100"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 && (
              <div className="p-4 text-sm text-slate-500">
                Nicio categorie creată încă.
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 p-6">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
            <UserPlus size={21} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Utilizator nou</h2>
            <p className="text-xs text-slate-500">
              Creează un cont și atribuie rolul și departamentul.
            </p>
          </div>
        </div>

        <form onSubmit={createUser} className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Nume complet</span>
            <input
              required
              placeholder="Nume și prenume"
              value={newUser.fullName}
              onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Email</span>
            <input
              required
              type="email"
              placeholder="utilizator@firma.ro"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Parolă inițială</span>
            <input
              required
              type="password"
              placeholder="Parolă inițială"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Rol</span>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value="VIEWER">Viewer</option>
              <option value="TECHNICIAN">Tehnician</option>
              <option value="MANAGER">Manager</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
            <span>Departament</span>
            <select
              value={newUser.departmentId}
              onChange={(e) => setNewUser({ ...newUser, departmentId: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value="">Fără departament</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </label>

          <div className="flex justify-end border-t border-slate-100 pt-5 md:col-span-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <UserPlus size={17} /> Creează utilizator
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 p-6">
          <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
            <Users size={21} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Utilizatori existenți</h2>
            <p className="text-xs text-slate-500">
              {users.length} utilizatori înregistrați
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-5 py-4">Nume</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Rol</th>
                <th className="px-5 py-4">Module</th>
                <th className="px-5 py-4">Departament</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-5 py-4 font-semibold text-slate-800">
                    {u.fullName}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{u.email}</td>
                  <td className="px-5 py-4">
                    <select
                      value={u.role}
                      onChange={(e) => updateUserRole(u.id, e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium"
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="TECHNICIAN">Tehnician</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    {u.role === 'ADMIN' ? (
                      <span className="text-xs font-semibold text-emerald-700">
                        Acces complet
                      </span>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {modules.map((module) => (
                          <label
                            key={module.id}
                            className="flex items-center gap-2 text-xs text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={(u.moduleAccess || []).some(
                                a => a.moduleId === module.id
                              )}
                              disabled={savingModuleUserId === u.id}
                              onChange={(e) =>
                                toggleUserModule(u, module.id, e.target.checked)
                              }
                              className="h-4 w-4 accent-blue-600"
                            />
                            {module.name}
                          </label>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {u.department?.name || '—'}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => toggleActive(u.id, u.active)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        u.active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {u.active ? 'Activ' : 'Inactiv'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Nu există utilizatori.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
