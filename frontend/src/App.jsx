
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ModuleDashboard from './pages/ModuleDashboard';
import Calendar from './pages/Calendar';
import Assets from './pages/Assets';
import AssetDetail from './pages/AssetDetail';
import ImportExport from './pages/ImportExport';
import Admin from './pages/Admin';
import Profile from './pages/Profile';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="modules/:moduleCode"
          element={<ModuleDashboard />}
        />
        <Route path="calendar" element={<Calendar />} />
        <Route path="assets" element={<Assets />} />
        <Route path="assets/:id" element={<AssetDetail />} />
        <Route path="import-export" element={<ImportExport />} />
        <Route path="profile" element={<Profile />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
