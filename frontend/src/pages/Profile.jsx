import React, { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.newPassword !== form.confirmPassword) {
      setError('Parola noua si confirmarea nu coincid.');
      return;
    }
    if (form.newPassword.length < 6) {
      setError('Parola noua trebuie sa aiba cel putin 6 caractere.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setSuccess('Parola a fost schimbata cu succes.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la schimbarea parolei.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <h1 className="text-2xl font-semibold">Contul meu</h1>

      <div className="bg-white p-5 rounded-xl border text-sm text-gray-600">
        <div><span className="text-gray-400">Nume:</span> {user?.fullName}</div>
        <div><span className="text-gray-400">Email:</span> {user?.email}</div>
        <div><span className="text-gray-400">Rol:</span> {user?.role}</div>
      </div>

      <div className="bg-white p-5 rounded-xl border space-y-4">
        <h2 className="font-semibold">Schimba parola</h2>

        {error && <div className="bg-red-50 text-red-700 text-sm p-2 rounded">{error}</div>}
        {success && <div className="bg-green-50 text-green-700 text-sm p-2 rounded">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Parola curenta</label>
            <input
              type="password"
              required
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Parola noua</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Confirma parola noua</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Se salveaza...' : 'Schimba parola'}
          </button>
        </form>
      </div>
    </div>
  );
}
