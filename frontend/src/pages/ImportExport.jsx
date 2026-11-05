
import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ImportExport() {
  const { user } = useAuth();

  const [mode, setMode] = useState('');
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const [selectedIds, setSelectedIds] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const canImport = ['ADMIN', 'MANAGER'].includes(user?.role);

  useEffect(() => {
    async function loadFilters() {
      try {
        const [categoriesResponse, departmentsResponse] =
          await Promise.all([
            api.get('/categories'),
            api.get('/users/departments/all'),
          ]);

        setCategories(categoriesResponse.data);
        setDepartments(departmentsResponse.data);
      } catch (err) {
        setError('Nu s-au putut incarca filtrele.');
      }
    }

    loadFilters();
  }, []);

  useEffect(() => {
    if (mode !== 'export') return;

    let cancelled = false;

    async function loadAssets() {
      setLoading(true);
      setError('');

      try {
        const { data } = await api.get('/assets', {
          params: {
            ...(search ? { search } : {}),
            ...(categoryFilter
              ? { categoryId: categoryFilter }
              : {}),
            ...(departmentFilter
              ? { departmentId: departmentFilter }
              : {}),
          },
        });

        if (!cancelled) setAssets(data);
      } catch (err) {
        if (!cancelled) {
          setError('Nu s-au putut incarca asset-urile.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAssets();

    return () => {
      cancelled = true;
    };
  }, [mode, search, categoryFilter, departmentFilter]);

  function resetSelection() {
    setSelectedIds([]);
    setSelectionMode(false);
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    resetSelection();
    setError('');
  }

  function changeSearch(value) {
    setSearch(value);
    resetSelection();
  }

  function changeCategory(value) {
    setCategoryFilter(value);
    resetSelection();
  }

  function changeDepartment(value) {
    setDepartmentFilter(value);
    resetSelection();
  }

  function toggleAsset(id) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  const allSelected =
    assets.length > 0 &&
    assets.every((asset) => selectedIds.includes(asset.id));

  function toggleAll() {
    setSelectedIds(
      allSelected ? [] : assets.map((asset) => asset.id)
    );
  }

  async function handleExport() {
    if (loading || exporting) return;

    const items = selectionMode
      ? assets.filter((asset) => selectedIds.includes(asset.id))
      : assets;

    if (!items.length) {
      setError('Nu exista asset-uri selectate pentru export.');
      return;
    }

    setError('');
    setExporting(true);

    try {
      const { exportAssetsExcel } = await import(
        '../utils/exportExcel'
      );
      await exportAssetsExcel(items);
    } catch (err) {
      console.error(err);
      setError('Nu s-a putut genera fisierul Excel.');
    } finally {
      setExporting(false);
    }
  }
async function handleExportPdf() {
  if (loading || exporting) return;

  const items = selectionMode
    ? assets.filter((asset) => selectedIds.includes(asset.id))
    : assets;

  if (!items.length) {
    setError('Nu exista asset-uri selectate pentru export.');
    return;
  }

  setError('');
  setExporting(true);

  try {
    const { exportAssetsPdf } = await import(
      '../utils/exportPdf'
    );

    const selectedCategory = categories.find(
      (category) => category.id === categoryFilter
    );

    const selectedDepartment = departments.find(
      (department) => department.id === departmentFilter
    );

    await exportAssetsPdf(items, {
      search,
      category: selectedCategory?.name || '',
      department: selectedDepartment?.name || '',
    });
  } catch (err) {
    console.error(err);
    setError('Nu s-a putut genera fisierul PDF.');
  } finally {
    setExporting(false);
  }
}
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Import / Export
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestioneaza transferul datelor din inventar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => changeMode('export')}
          className={`text-left bg-white border rounded-xl p-5 hover:shadow-md transition ${
            mode === 'export'
              ? 'border-brand-600 ring-1 ring-brand-600'
              : ''
          }`}
        >
          <div className="text-lg font-semibold">
            Export date
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Exporta asset-uri si mentenante in Excel,
            folosind filtre sau selectie individuala.
          </p>
          <div className="text-sm text-brand-600 font-medium mt-4">
            Configureaza exportul
          </div>
        </button>

        <button
          type="button"
          onClick={() => changeMode('import')}
          disabled={!canImport}
          className={`text-left bg-white border rounded-xl p-5 transition ${
            canImport
              ? 'hover:shadow-md'
              : 'opacity-50 cursor-not-allowed'
          } ${
            mode === 'import'
              ? 'border-brand-600 ring-1 ring-brand-600'
              : ''
          }`}
        >
          <div className="text-lg font-semibold">
            Import date
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Adauga asset-uri folosind un fisier Excel
            standardizat.
          </p>
          <div className="text-sm text-brand-600 font-medium mt-4">
            {canImport
              ? 'Configureaza importul'
              : 'Disponibil pentru ADMIN si MANAGER'}
          </div>
        </button>
      </div>

      {mode === 'export' && (
        <div className="bg-white border rounded-xl p-5 space-y-5">
          <div>
            <h2 className="text-lg font-semibold">
              Configurare export
            </h2>
            <p className="text-sm text-gray-500">
              Filtreaza inventarul si alege ce doresti
              sa exporti.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Cautare
              </label>
              <input
                value={search}
                onChange={(e) => changeSearch(e.target.value)}
                placeholder="Nume sau cod..."
                className="border rounded-lg px-3 py-2 text-sm w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Categorie
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => changeCategory(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              >
                <option value="">Toate categoriile</option>
                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
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
                onChange={(e) => changeDepartment(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              >
                <option value="">Toate departamentele</option>
                {departments.map((department) => (
                  <option
                    key={department.id}
                    value={department.id}
                  >
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div>
              <div className="text-sm font-medium">
                {loading
                  ? 'Se incarca asset-urile...'
                  : `${assets.length} asset-uri gasite`}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectionMode
                  ? `${selectedIds.length} selectate pentru export`
                  : 'Implicit, exportul include toate rezultatele filtrate.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (selectionMode) {
                  resetSelection();
                } else {
                  setSelectionMode(true);
                }
              }}
              disabled={loading || assets.length === 0}
              className="border rounded-lg px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {selectionMode
                ? 'Anuleaza selectia'
                : 'Selecteaza individual'}
            </button>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  {selectionMode && (
                    <th className="p-3 text-left w-12">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Selecteaza toate asset-urile"
                      />
                    </th>
                  )}
                  <th className="p-3 text-left">Cod intern</th>
                  <th className="p-3 text-left">Asset</th>
                  <th className="p-3 text-left">Categorie</th>
                  <th className="p-3 text-left">Departament</th>
                  <th className="p-3 text-left">Mentenante</th>
                </tr>
              </thead>

              <tbody>
                {!loading &&
                  assets.map((asset) => (
                    <tr
                      key={asset.id}
                      className="border-t hover:bg-gray-50"
                    >
                      {selectionMode && (
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(asset.id)}
                            onChange={() => toggleAsset(asset.id)}
                            aria-label={`Selecteaza ${asset.name}`}
                          />
                        </td>
                      )}
                      <td className="p-3">
                        {asset.internalCode}
                      </td>
                      <td className="p-3 font-medium">
                        {asset.name}
                      </td>
                      <td className="p-3">
                        {asset.categoryRef?.name ||
                          asset.category ||
                          '-'}
                      </td>
                      <td className="p-3">
                        {asset.department?.name || '-'}
                      </td>
                      <td className="p-3">
                        {asset.maintenanceSchedules?.length || 0}
                      </td>
                    </tr>
                  ))}

                {!loading && assets.length === 0 && (
                  <tr>
                    <td
                      colSpan={selectionMode ? 6 : 5}
                      className="p-6 text-center text-gray-500"
                    >
                      Niciun asset gasit.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t pt-4">
<button
  type="button"
  onClick={handleExportPdf}
  disabled={
    loading ||
    exporting ||
    assets.length === 0 ||
    (selectionMode && selectedIds.length === 0)
  }
  className="bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {exporting
    ? 'Se genereaza...'
    : selectionMode
      ? `Export PDF (${selectedIds.length})`
      : `Export PDF (${assets.length})`}
</button>
            <button
              type="button"
              onClick={handleExport}
              disabled={
                loading ||
                exporting ||
                assets.length === 0 ||
                (selectionMode && selectedIds.length === 0)
              }
              className="bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting
                ? 'Se genereaza Excel...'
                : selectionMode
                  ? `Export Excel (${selectedIds.length})`
                  : `Export Excel (${assets.length})`}
            </button>
          </div>
        </div>
      )}

      {mode === 'import' && canImport && (
        <div className="bg-white border rounded-xl p-5 space-y-3">
          <h2 className="text-lg font-semibold">
            Import asset-uri din Excel
          </h2>
          <p className="text-sm text-gray-600">
            Aici vom adauga descarcarea sablonului Excel,
            incarcarea fisierului, verificarea datelor
            si confirmarea importului.
          </p>
          <p className="text-sm text-amber-700">
            Importul nu este inca activ. Il implementam
            dupa finalizarea exportului.
          </p>
        </div>
      )}
    </div>
  );
}
