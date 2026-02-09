import { useRef, useState } from 'react';

const SERVER_URL = `http://${window.location.hostname}:3001`;

function HistoryControls({ onImportComplete }) {
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(null);

  const handleExport = () => {
    window.open(`${SERVER_URL}/api/history/export`, '_blank');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const response = await fetch(`${SERVER_URL}/api/history/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(`Successfully imported ${result.imported} messages`);
        onImportComplete?.();
      } else {
        alert('Import failed: ' + result.error);
      }
    } catch (err) {
      alert('Failed to import: ' + err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClear = () => {
    setShowConfirm('clear');
  };

  const confirmClear = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/api/history`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        onImportComplete?.();
      }
    } catch (err) {
      alert('Failed to clear history: ' + err.message);
    }
    setShowConfirm(null);
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />
      
      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          className="p-2 bg-white/10 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
          title="Export chat history"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>

        <button
          onClick={handleImportClick}
          disabled={importing}
          className="p-2 bg-white/10 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors disabled:opacity-50"
          title="Import chat history"
        >
          {importing ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          )}
        </button>

        <button
          onClick={handleClear}
          className="p-2 bg-white/10 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/20 transition-colors"
          title="Clear chat history"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-2">Clear Chat History?</h3>
            <p className="text-white/60 mb-6">This will permanently delete all messages. This action cannot be undone.</p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="flex-1 py-2 px-4 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmClear}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HistoryControls;
