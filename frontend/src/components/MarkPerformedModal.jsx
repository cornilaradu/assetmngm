import React, { useState } from 'react';
import api from '../api/client';

const ACCEPTED = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp';

export default function MarkPerformedModal({ scheduleId, assetName, maintenanceType, onClose, onSuccess }) {
  const [files, setFiles] = useState([]);
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().slice(0, 10));
  const [performedBy, setPerformedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleFileChange(e) {
    setFiles(Array.from(e.target.files || []));
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (files.length === 0) {
      setError('Trebuie sa atasezi cel putin un document (certificat, raport de service etc.) pentru a putea marca mentenanta ca efectuata.');
      return;
    }

    const formData = new FormData();
    formData.append('performedAt', performedAt);
    if (performedBy) formData.append('performedBy', performedBy);
    if (notes) formData.append('notes', notes);
    files.forEach((f) => formData.append('documents', f));

    setLoading(true);
    try {
      await api.post(`/maintenance/${scheduleId}/mark-performed`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Eroare la salvare. Verifica documentele atasate si incearca din nou.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b">
          <h2 className="font-semibold text-lg">Marcheaza mentenanta ca efectuata</h2>
          <div className="text-sm text-gray-500">{assetName} — {maintenanceType}</div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm p-2 rounded">{error}</div>}

          <div>
            <label className="block text-xs text-gray-500 mb-1">Data efectuarii</label>
            <input
              type="date"
              required
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Efectuata de (optional)</label>
            <input
              placeholder="ex: firma service extern / nume tehnician"
              value={performedBy}
              onChange={(e) => setPerformedBy(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Observatii (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Document(e) de mentenanta <span className="text-red-600">*obligatoriu</span>
            </label>
            <input
              type="file"
              multiple
              required={files.length === 0}
              accept={ACCEPTED}
              onChange={handleFileChange}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50"
            />
            <div className="text-xs text-gray-400 mt-1">
              PDF, Word, Excel sau imagini (JPG/PNG/WEBP). Poti atasa mai multe fisiere.
            </div>

            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="flex justify-between items-center text-xs bg-gray-50 border rounded px-2 py-1">
                    <span className="truncate">{f.name} ({Math.round(f.size / 1024)} KB)</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-red-600 ml-2">
                      Elimina
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || files.length === 0}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? 'Se salveaza...' : 'Confirma finalizarea'}
            </button>
            <button type="button" onClick={onClose} className="text-gray-600 text-sm font-medium">
              Anuleaza
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
