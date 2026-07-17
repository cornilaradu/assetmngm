import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', internalCode: '', category: '', location: '' });
  const { user } = useAuth();
  const canEdit = ['ADMIN', 'MANAGER'].includes(user?.role);

  async function load() {
    const { data } = await api.get('/assets', { params: search ? { search } : {} });
    setAssets(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleCreate(e) {
    e.preventDefault();
    await api.post('/assets', form);
    setForm({ name: '', internalCode: '', category: '', location: '' });
    setShowForm(false);
    load();
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
          <input required placeholder="Nume asset" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input required placeholder="Cod intern (ex: AST-0002)" value={form.internalCode}
            onChange={(e) => setForm({ ...form, internalCode: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input required placeholder="Categorie (ex: HVAC, IT, Auto)" value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Locatie" value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <button type="submit" className="col-span-2 bg-brand-600 text-white py-2 rounded-lg text-sm font-medium">
            Salveaza asset
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map((asset) => (
          <Link
            key={asset.id}
            to={`/assets/${asset.id}`}
            className="bg-white p-4 rounded-xl border hover:shadow-md transition"
          >
            <div className="font-semibold">{asset.name}</div>
            <div className="text-xs text-gray-500 mb-2">{asset.internalCode} · {asset.category}</div>
            <div className="text-sm text-gray-600">{asset.location || 'Fara locatie specificata'}</div>
            <div className="text-xs text-gray-400 mt-2">
              {asset.maintenanceSchedules?.length || 0} tip(uri) de mentenanta active
            </div>
          </Link>
        ))}
        {assets.length === 0 && <div className="text-gray-500">Niciun asset gasit.</div>}
      </div>
    </div>
  );
}
