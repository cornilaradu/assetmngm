import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const emptyForm = { name: '', internalCode: '', categoryId: '', location: '', departmentId: '' };

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = ['ADMIN', 'MANAGER'].includes(user?.role);
  const canDelete = user?.role === 'ADMIN';

  async function load() {
    const { data } = await api.get('/assets', { params: search ? { search } : {} });
    setAssets(data);
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
    loadDepartments();
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/assets', {
        ...form,
        departmentId: form.departmentId || null,
      });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la crearea asset-ului.');
    }
  }

  async function handleDelete(e, assetId, assetName) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Sigur vrei sa stergi asset-ul "${assetName}"? Aceasta actiune este ireversibila si va sterge si tot istoricul de mentenanta asociat.`)) {
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Asset-uri</h1>
        {canEdit && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            {showForm ? 'Anuleaza' : '+ Asset nou'}
          </button>
        )}
      </div>

      <input
        placeholder="Cauta dupa nume sau cod..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border rounded-lg px-3 py-2 text-sm w-full max-w-sm"
      />

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-5 rounded-xl border grid grid-cols-2 gap-4">
          {error && <div className="col-span-2 bg-red-50 text-red-700 text-sm p-2 rounded">{error}</div>}
          <input required placeholder="Nume asset" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input required placeholder="Cod intern (ex: AST-0002)" value={form.internalCode}
            onChange={(e) => setForm({ ...form, internalCode: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />

          <div>
            <label className="block text-xs text-gray-500 mb-1">Categorie</label>
            <select
              required
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm w-full"
            >
              <option value="">Selecteaza categoria...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {categories.length === 0 && (
              <div className="text-xs text-amber-600 mt-1">
                Nicio categorie creata inca. Adauga una din pagina de Administrare.
              </div>
            )}
          </div>

          <input placeholder="Locatie" value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />

          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Departament responsabil</label>
            <select
              required
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm w-full"
            >
              <option value="">Selecteaza departamentul...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {departments.length === 0 && (
              <div className="text-xs text-amber-600 mt-1">
                Niciun departament creat inca. Adauga unul din pagina de Administrare.
              </div>
            )}
          </div>
          <button type="submit" className="col-span-2 bg-brand-600 text-white py-2 rounded-lg text-sm font-medium">
            Salveaza asset
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map((asset) => (
          <div key={asset.id} className="relative group">
            <Link
              to={`/assets/${asset.id}`}
              className="block bg-white p-4 rounded-xl border hover:shadow-md transition"
            >
              <div className="font-semibold pr-12">{asset.name}</div>
              <div className="text-xs text-gray-500 mb-2">
                {asset.internalCode} · {asset.categoryRef?.name || asset.category || 'fara categorie'}
              </div>
              <div className="text-sm text-gray-600">{asset.location || 'Fara locatie specificata'}</div>
              <div className="text-xs text-gray-400">{asset.department?.name || 'Fara departament'}</div>
              <div className="text-xs text-gray-400 mt-2">
                {asset.maintenanceSchedules?.length || 0} tip(uri) de mentenanta active
              </div>
            </Link>
            {(canEdit || canDelete) && (
              <div className="absolute top-3 right-3 flex gap-2 text-xs">
                {canEdit && (
                  <button
                    onClick={(e) => handleEdit(e, asset.id)}
                    className="text-brand-600 hover:underline font-medium"
                  >
                    Editeaza
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={(e) => handleDelete(e, asset.id, asset.name)}
                    className="text-red-600 hover:underline font-medium"
                  >
                    Sterge
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {assets.length === 0 && <div className="text-gray-500">Niciun asset gasit.</div>}
      </div>
    </div>
  );
}
