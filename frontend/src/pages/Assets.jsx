
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Plus,
  X,
  Search,
  MapPin,
  Building2,
  ClipboardList,
  Pencil,
  Trash2,
  Filter,
  LayoutGrid,
  Grid2X2,
  List,
} from 'lucide-react';

const emptyForm = {
  name: '',
  internalCode: '',
  moduleId: '',
  categoryId: '',
  location: '',
  departmentId: '',
};

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modules, setModules] = useState([]);
  const [search, setSearch] = useState('');

  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('asset-view-mode');
      return ['compact', 'normal', 'list'].includes(saved)
        ? saved
        : 'normal';
    } catch {
      return 'normal';
    }
  });

  function changeViewMode(mode) {
    setViewMode(mode);
    try {
      localStorage.setItem('asset-view-mode', mode);
    } catch {
      // Preferinta ramane activa pana la reincarcarea paginii.
    }
  }
  const [moduleFilter, setModuleFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();

  const canEdit = ['ADMIN', 'MANAGER'].includes(user?.role);
  const canDelete = user?.role === 'ADMIN';

  const availableModules = modules.filter((module) =>
    user?.role === 'ADMIN' ||
    user?.moduleAccess?.some((access) => access.moduleId === module.id)
  );

  async function load() {
    const { data } = await api.get('/assets', {
      params: {
        ...(search ? { search } : {}),
        ...(moduleFilter ? { moduleId: moduleFilter } : {}),
        ...(categoryFilter ? { categoryId: categoryFilter } : {}),
        ...(departmentFilter ? { departmentId: departmentFilter } : {}),
      },
    });

    setAssets(data);
  }

  async function loadModules() {
    try {
      const { data } = await api.get('/users/modules/all');
      setModules(data);
    } catch (err) {
      console.error('Eroare la incarcarea modulelor:', err);
      setError('Nu s-au putut incarca modulele.');
    }
  }

  async function loadDepartments() {
    const { data } = await api.get('/users/departments/all');
    setDepartments(data);
  }

  async function loadCategories() {
    const { data } = await api.get('/categories');
    setCategories(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, moduleFilter, categoryFilter, departmentFilter]);

  useEffect(() => {
    loadDepartments();
    loadCategories();
    loadModules();
  }, []);

  function openCreateForm() {
    setError('');
    setForm(emptyForm);
    setShowForm(true);
  }

  function closeCreateForm() {
    setError('');
    setForm(emptyForm);
    setShowForm(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError('');

    try {
      await api.post('/assets', {
        ...form,
        departmentId: form.departmentId || null,
      });

      closeCreateForm();
      await load();
    } catch (err) {
      setError(
        err.response?.data?.error || 'Eroare la crearea asset-ului.'
      );
    }
  }

  async function handleDelete(e, assetId, assetName) {
    e.preventDefault();
    e.stopPropagation();

    if (
      !window.confirm(
        `Sigur vrei sa stergi asset-ul "${assetName}"? Aceasta actiune este ireversibila si va sterge si tot istoricul de mentenanta asociat.`
      )
    ) {
      return;
    }

    await api.delete(`/assets/${assetId}`);
    load();
  }

  function handleEdit(e, assetId) {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/assets/${assetId}?edit=1`);
  }

  return (
    <div className="space-y-7">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {showForm ? 'Asset nou' : 'Asset-uri'}
        </h1>

        {canEdit && (
          <button
            onClick={showForm ? closeCreateForm : openCreateForm}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition ${
              showForm
                ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {showForm ? <X size={17} /> : <Plus size={17} />}
            {showForm ? 'Anulează' : 'Asset nou'}
          </button>
        )}
      </div>

      {showForm ? (
        <form
          onSubmit={handleCreate}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/60 px-6 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Package size={23} strokeWidth={1.8} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Adaugă un asset nou
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Completează informațiile echipamentului.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-6 md:grid-cols-2">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 md:col-span-2"
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="asset-name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Nume asset <span className="text-red-500">*</span>
              </label>
              <input
                id="asset-name"
                required
                placeholder="Ex: UPS Server Room"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="asset-code"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Cod intern <span className="text-red-500">*</span>
              </label>
              <input
                id="asset-code"
                required
                placeholder="Ex: UPS-0001"
                value={form.internalCode}
                onChange={(e) =>
                  setForm({ ...form, internalCode: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="asset-module"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Modul mentenanță <span className="text-red-500">*</span>
              </label>
              <select
                id="asset-module"
                required
                value={form.moduleId}
                onChange={(e) =>
                  setForm({ ...form, moduleId: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Selectează modulul...</option>
                {availableModules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.name}
                  </option>
                ))}
              </select>
              {availableModules.length === 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  Nu ai module disponibile pentru crearea asset-urilor.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="asset-category"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Categorie <span className="text-red-500">*</span>
              </label>
              <select
                id="asset-category"
                required
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Selectează categoria...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {categories.length === 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  Adaugă o categorie din pagina Administrare.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="asset-location"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Locație
              </label>
              <input
                id="asset-location"
                placeholder="Ex: Data Center O2"
                value={form.location}
                onChange={(e) =>
                  setForm({ ...form, location: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="asset-department"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Departament responsabil <span className="text-red-500">*</span>
              </label>
              <select
                id="asset-department"
                required
                value={form.departmentId}
                onChange={(e) =>
                  setForm({ ...form, departmentId: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Selectează departamentul...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              {departments.length === 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  Adaugă un departament din pagina Administrare.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-5">
            <button
              type="button"
              onClick={closeCreateForm}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Anulează
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus size={17} />
              Salvează asset
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <input
              placeholder="Cauta dupa nume sau cod..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-slate-200 rounded-xl px-4 py-3 text-sm w-full max-w-md focus:outline-none focus:ring-2 focus:ring-blue-200"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="asset-module-filter"
                  className="block text-sm font-medium mb-1"
                >
                  Modul mentenanță
                </label>
                <select
                  id="asset-module-filter"
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                >
                  <option value="">Toate modulele</option>
                  {availableModules.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Categorie
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(e.target.value)
                  }
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                >
                  <option value="">Toate categoriile</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Departament
                </label>
                <select
                  value={departmentFilter}
                  onChange={(e) =>
                    setDepartmentFilter(e.target.value)
                  }
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                >
                  <option value="">Toate departamentele</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              {assets.length} asset-uri afișate
            </p>

            <div
              role="group"
              aria-label="Mod de afișare asset-uri"
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
            >
              {[
                { id: 'compact', label: 'Compact', Icon: LayoutGrid },
                { id: 'normal', label: 'Normal', Icon: Grid2X2 },
                { id: 'list', label: 'Listă', Icon: List },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => changeViewMode(id)}
                  aria-pressed={viewMode === id}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    viewMode === id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={
            viewMode === 'list'
              ? 'grid grid-cols-1 gap-3'
              : viewMode === 'compact'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3'
              : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'
          }>
            {assets.map((asset) => (
              <div key={asset.id} className="relative group">
                <Link
                  to={`/assets/${asset.id}`}
                  className={`block h-full bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all ${
                    viewMode === 'list'
                      ? 'rounded-xl px-5 py-4'
                      : viewMode === 'compact'
                      ? 'rounded-xl p-3'
                      : 'rounded-2xl p-5'
                  }`}
                >
                  <div className={`font-semibold text-slate-900 pr-28 ${
                    viewMode === 'compact' ? 'text-sm mb-1' : 'mb-2'
                  }`}>
                    {asset.name}
                  </div>

                  <div className="text-xs text-blue-700 font-medium mb-3">
                    {asset.internalCode} ·{' '}
                    {asset.categoryRef?.name ||
                      asset.category ||
                      'fara categorie'}
                  </div>

                  {viewMode !== 'compact' && (
                    <div className="text-sm text-slate-600 mb-1">
                      {asset.location || 'Fără locație specificată'}
                    </div>
                  )}

                  {viewMode !== 'compact' && (
                    <div className="text-xs text-slate-500">
                      {asset.department?.name || 'Fără departament'}
                    </div>
                  )}

                  <div className={`text-xs text-slate-500 ${
                    viewMode === 'compact'
                      ? 'mt-2'
                      : 'mt-3 pt-3 border-t border-slate-100'
                  }`}>
                    {asset.maintenanceSchedules?.length || 0}{' '}
                    tip(uri) de mentenanță active
                  </div>
                </Link>

                {(canEdit || canDelete) && (
                  <div className="absolute right-3 top-3 flex items-center gap-1.5">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={(e) => handleEdit(e, asset.id)}
                        title="Editează asset"
                        aria-label={`Editează ${asset.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 transition hover:border-blue-200 hover:bg-blue-100"
                      >
                        <Pencil size={15} strokeWidth={1.8} />
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) =>
                          handleDelete(e, asset.id, asset.name)
                        }
                        title="Șterge asset"
                        aria-label={`Șterge ${asset.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 transition hover:border-red-200 hover:bg-red-100"
                      >
                        <Trash2 size={15} strokeWidth={1.8} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {assets.length === 0 && (
              <div className="text-gray-500">
                Niciun asset gasit.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
