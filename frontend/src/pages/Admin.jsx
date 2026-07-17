import React, { useEffect, useState } from 'react';
import api from '../api/client';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [newDept, setNewDept] = useState('');
  const [newUser, setNewUser] = useState({ email: '', password: '', fullName: '', role: 'VIEWER', departmentId: '' });
  const [message, setMessage] = useState('');

  async function load() {
    const [u, d] = await Promise.all([
      api.get('/users'),
      api.get('/users/departments/all'),
    ]);
    setUsers(u.data);
    setDepartments(d.data);
  }

  useEffect(() => { load(); }, []);

  async function createDepartment(e) {
    e.preventDefault();
    await api.post('/users/departments', { name: newDept });
    setNewDept('');
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

  async function toggleActive(userId, active) {
    await api.put(`/users/${userId}`, { active: !active });
    load();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Administrare</h1>

      {message && <div className="bg-blue-50 text-blue-700 text-sm p-3 rounded-lg">{message}</div>}

      <section className="bg-white p-5 rounded-xl border space-y-4">
        <h2 className="font-semibold">Departamente</h2>
        <form onSubmit={createDepartment} className="flex gap-2">
          <input
            placeholder="Nume departament nou"
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm flex-1"
            required
          />
          <button className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Adauga</button>
        </form>
        <div className="flex flex-wrap gap-2">
          {departments.map((d) => (
            <span key={d.id} className="bg-gray-100 px-3 py-1 rounded-full text-xs">{d.name}</span>
          ))}
        </div>
      </section>

      <section className="bg-white p-5 rounded-xl border space-y-4">
        <h2 className="font-semibold">Utilizator nou</h2>
        <form onSubmit={createUser} className="grid grid-cols-2 gap-4">
          <input required placeholder="Nume complet" value={newUser.fullName}
            onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <input required type="password" placeholder="Parola initiala" value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm" />
          <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="VIEWER">Viewer</option>
            <option value="TECHNICIAN">Tehnician</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
          <select value={newUser.departmentId} onChange={(e) => setNewUser({ ...newUser, departmentId: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm col-span-2">
            <option value="">Fara departament</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button className="col-span-2 bg-brand-600 text-white py-2 rounded-lg text-sm font-medium">
            Creeaza utilizator
          </button>
        </form>
      </section>

      <section className="bg-white p-5 rounded-xl border">
        <h2 className="font-semibold mb-4">Utilizatori existenti</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">Nume</th>
              <th className="p-2">Email</th>
              <th className="p-2">Rol</th>
              <th className="p-2">Departament</th>
              <th className="p-2">Activ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-2">{u.fullName}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">
                  <select value={u.role} onChange={(e) => updateUserRole(u.id, e.target.value)}
                    className="border rounded px-2 py-1 text-xs">
                    <option value="VIEWER">Viewer</option>
                    <option value="TECHNICIAN">Tehnician</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </td>
                <td className="p-2">{u.department?.name || '—'}</td>
                <td className="p-2">
                  <button
                    onClick={() => toggleActive(u.id, u.active)}
                    className={`text-xs px-2 py-1 rounded-full ${u.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
                  >
                    {u.active ? 'Activ' : 'Inactiv'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
