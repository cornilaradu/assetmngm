import React, { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Dashboard from './Dashboard';

const moduleCodes = {
  auto: 'AUTO',
  ups: 'UPS',
  facilities: 'FACILITIES',
};

export default function ModuleDashboard() {
  const { moduleCode } = useParams();
  const { user, authReady } = useAuth();

  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const code = moduleCodes[moduleCode];

  const allowed =
    user?.role === 'ADMIN' ||
    user?.moduleAccess?.some(
      access => access.module?.code === code
    );

  useEffect(() => {
    let cancelled = false;

    async function loadModule() {
      setLoading(true);
      setModule(null);
      setError('');

      if (!code || !allowed) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/users/modules/all');

        if (!cancelled) {
          setModule(data.find(item => item.code === code) || null);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Nu s-au putut incarca modulele.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadModule();

    return () => {
      cancelled = true;
    };
  }, [code, allowed]);

  if (!authReady) {
    return <p className="p-6 text-slate-500">Se verifică accesul...</p>;
  }

  if (!code || !allowed) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return <p className="p-6 text-slate-500">Se încarcă modulul...</p>;
  }

  if (error) {
    return <p className="p-6 text-red-600">{error}</p>;
  }

  if (!module) {
    return <p className="p-6 text-slate-500">Modul indisponibil.</p>;
  }

  return (
    <Dashboard
      key={module.id}
      moduleId={module.id}
      moduleName={module.name}
    />
  );
}
