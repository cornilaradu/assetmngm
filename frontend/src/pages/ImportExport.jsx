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
  const [importRows, setImportRows] = useState([]);
  const [importFileName, setImportFileName] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [selectedImportRows, setSelectedImportRows] = useState([]);
  const [importSaving, setImportSaving] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

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
        setFiltersLoaded(true);
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
  async function handleDownloadTemplate() {
    setError('');

    try {
      const { downloadImportTemplate } = await import(
        '../utils/importExcel'
      );

      await downloadImportTemplate(categories, departments);
    } catch (err) {
      console.error(err);
      setError('Nu s-a putut genera sablonul Excel.');
    }
  }
  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setImportRows([]);
    setSelectedImportRows([]);
    setImportResult(null);
    setImportFileName('');
    setError('');

    if (!file) return;
    if (!canImport) {
      setError('Nu ai permisiunea de a importa asset-uri.');
      return;
    }
    if (!filtersLoaded) {
      setError('Categoriile si departamentele nu sunt incarcate. Reincarca pagina.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Selecteaza un fisier Excel .xlsx.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Fisierul nu poate depasi 5 MB.');
      return;
    }

    setImportLoading(true);
    try {
      const { readImportExcel, validateImportRows } = await import('../utils/importExcel');
      const rows = await readImportExcel(file);
      if (!rows.length) {
        setError('Fisierul Excel nu contine asset-uri.');
        return;
      }
      const { data: existingAssets } = await api.get('/assets');
      if (!Array.isArray(existingAssets)) {
        throw new Error('Inventarul nu a putut fi verificat integral.');
      }
      const validated = validateImportRows(rows, categories, departments, existingAssets);

       setImportRows(validated);

        setSelectedImportRows(
          validated
         .filter((row) => row.status === 'VALID')
         .map((row) => row.rowNumber)
    );

setImportFileName(file.name);
    } catch (err) {
      console.error(err);
      setError(
        err.message?.startsWith('Fisierul') ||
        err.message?.startsWith('Coloana') ||
        err.message?.startsWith('Inventarul')
          ? err.message
          : 'Nu s-a putut citi sau valida fisierul Excel.'
      );
    } finally {
      setImportLoading(false);
    }
  }
async function handleConfirmImport() {
  if (!canImport || importSaving || importLoading) return;

  const rowsToImport = importRows.filter(
    (row) =>
      row.status === 'VALID' &&
      selectedImportRows.includes(row.rowNumber)
  );

  if (rowsToImport.length === 0) return;

  const confirmed = window.confirm(
    `Esti sigur ca doresti sa importi ${rowsToImport.length} asset-uri selectate?`
  );

  if (!confirmed) return;

  setImportSaving(true);
  setImportResult(null);
  setError('');

  let created = 0;
  let failed = 0;
  const updatedRows = [...importRows];

  try {
    for (const row of rowsToImport) {
      const index = updatedRows.findIndex(
        (item) => item.rowNumber === row.rowNumber
      );

      try {
        await api.post('/assets', row.payload);

        created++;

        updatedRows[index] = {
          ...row,
          status: 'IMPORTED',
          errors: [],
        };
            } catch (err) {
        failed++;

        const status = err.response?.status;
        const noResponse = !err.response;

        updatedRows[index] = {
          ...row,
          status: noResponse
            ? 'UNVERIFIED'
            : status === 409
              ? 'DUPLICATE'
              : 'ERROR',
          errors: [
            noResponse
              ? 'Nu am primit raspuns de la server. Verifica daca asset-ul exista deja in inventar inainte de o noua incercare.'
              : err.response?.data?.error ||
                'Serverul a respins importul acestui asset.',
          ],
        };
      }

      setImportRows([...updatedRows]);
      setSelectedImportRows((current) =>
        current.filter((id) => id !== row.rowNumber)
      );
    }

    setImportResult({ created, failed });
  } finally {
    setImportSaving(false);
  }
}
function toggleImportRow(rowNumber) {
  setSelectedImportRows((current) =>
    current.includes(rowNumber)
      ? current.filter((id) => id !== rowNumber)
      : [...current, rowNumber]
  );
}

function selectAllImportRows() {
  setSelectedImportRows(
    importRows
      .filter((row) => row.status === 'VALID')
      .map((row) => row.rowNumber)
  );
}

function deselectAllImportRows() {
  setSelectedImportRows([]);
}
  function resetSelection() {
    setSelectedIds([]);
    setSelectionMode(false);
  }

  function changeMode(nextMode) {
    if (importSaving) return;
    setMode(nextMode);
    resetSelection();
    setImportRows([]);
setSelectedImportRows([]);
setImportResult(null);
setImportFileName('');
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
          disabled={importSaving}
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
          disabled={importSaving}
          className={`text-left bg-white border rounded-xl p-5 transition hover:shadow-md ${
            mode === 'import' ? 'border-brand-600 ring-1 ring-brand-600' : ''
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
              : 'Descarca sablonul Excel'}
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

            {mode === 'import' && (
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold">
            Import asset-uri din Excel
          </h2>

          <p className="text-sm text-gray-600">
            Descarca sablonul Excel si completeaza datele
            asset-urilor folosind categoriile si departamentele
            existente in portal.
          </p>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Descarca sablon Excel
          </button>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          {canImport ? (
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold">Incarcare asset-uri</h3>
              <p className="text-sm text-gray-600">
                Selecteaza fisierul Excel completat. Datele vor fi verificate
                inainte de orice import.
              </p>
              <input
                type="file"
                accept=".xlsx"
                onChange={handleImportFile}
                disabled={importLoading || importSaving || !filtersLoaded}
                className="block w-full max-w-lg text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white hover:file:bg-blue-700 disabled:opacity-50"
              />
              {importLoading && (
                <p className="text-sm text-blue-700">Se citeste si se valideaza fisierul...</p>
              )}
              {importFileName && (
                <p className="text-sm text-gray-600">Fisier incarcat: {importFileName}</p>
              )}
              {importRows.length > 0 && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4 text-sm font-semibold">
                    <span className="text-green-700">Valide: {importRows.filter((r) => r.status === 'VALID').length}</span>
                    <span className="text-amber-700">Duplicate: {importRows.filter((r) => r.status === 'DUPLICATE').length}</span>
                    <span className="text-red-700">Erori: {importRows.filter((r) => r.status === 'ERROR').length}</span>
                  </div>
<div className="flex flex-wrap items-center gap-3">
  <button
    type="button"
    onClick={selectAllImportRows}
    disabled={importSaving}
    className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
  >
    Selecteaza toate
  </button>

  <button
    type="button"
    onClick={deselectAllImportRows}
    disabled={importSaving}
    className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
  >
    Deselecteaza toate
  </button>

  <span className="text-sm font-semibold text-emerald-700">
    {selectedImportRows.length} asset-uri selectate pentru import
  </span>
</div>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-center p-3">Selecteaza</th>
                          <th className="text-left p-3">Rand</th>
                          <th className="text-left p-3">Asset</th>
                          <th className="text-left p-3">Cod intern</th>
                          <th className="text-left p-3">Categorie</th>
                          <th className="text-left p-3">Departament</th>
                          <th className="text-left p-3">Status</th>
                          <th className="text-left p-3">Detalii</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.map((row) => (
                          <tr key={row.rowNumber} className="border-t">
                          <td className="p-3 text-center">
                             <input
                              type="checkbox"
                              checked={selectedImportRows.includes(row.rowNumber)}
                              onChange={() => toggleImportRow(row.rowNumber)}
                              disabled={row.status !== 'VALID' || importSaving}
                              className="h-4 w-4 cursor-pointer accent-emerald-600 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="p-3">{row.rowNumber}</td>
                            <td className="p-3">{row.name}</td>
                            <td className="p-3">{row.internalCode}</td>
                            <td className="p-3">{row.categoryName}</td>
                            <td className="p-3">{row.departmentName}</td>
                            <td className="p-3 font-semibold">
                              <span
  className={
    row.status === 'VALID' || row.status === 'IMPORTED'
      ? 'text-green-700'
      : row.status === 'DUPLICATE'
        ? 'text-amber-700'
        : 'text-red-700'
  }
>
  {row.status === 'IMPORTED'
  ? 'Importat'
  : row.status === 'UNVERIFIED'
    ? 'Neverificat'
    : row.status === 'VALID'
      ? 'Valid'
      : row.status === 'DUPLICATE'
        ? 'Duplicat'
        : 'Eroare'}
</span>
                            </td>
                            <td className="p-3 text-gray-600">
                              {row.status === 'IMPORTED'
  ? 'Importat cu succes'
  : row.errors.length
    ? row.errors.join(' ')
    : 'Pregatit pentru import'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!importResult && (
  <p className="text-sm text-gray-500">
    Aceasta este doar o previzualizare. Nu a fost creat niciun asset.
  </p>
)}

{importResult && (
  <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
    <p className="font-semibold">Rezultat import</p>
    <p>Asset-uri create: {importResult.created}</p>
    <p>Asset-uri nereusite: {importResult.failed}</p>
  </div>
)}

<div className="flex flex-wrap items-center gap-3">
  <button
    type="button"
    onClick={handleConfirmImport}
    disabled={
      importSaving ||
      importLoading ||
      selectedImportRows.length === 0
    }
    className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {importSaving
      ? 'Se importa asset-urile...'
      : `Importa ${selectedImportRows.length} asset-uri selectate`}
  </button>
</div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Incarcarea si importul asset-urilor sunt disponibile doar pentru administratori si manageri.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
