import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setError(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/api/analyze-document", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'analyse par l'IA.");
      }

      const data = await response.json();
      setResult(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-12 px-4">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        
        {/* En-tête */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Analyseur de Documents IA</h1>
          <p className="text-slate-400 text-sm">Propulsé par FastAPI, React et Gemini Vision</p>
        </div>

        {/* Formulaire d'upload */}
        <form onSubmit={handleUpload} className="space-y-6">
          <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors bg-slate-950/50">
            <input 
              type="file" 
              onChange={handleFileChange} 
              className="hidden" 
              id="file-upload" 
              accept=".pdf,.png,.jpg,.jpeg"
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <Upload className="w-12 h-12 text-indigo-400 mb-3" />
              <span className="text-sm font-medium text-slate-300">
                {file ? file.name : "Cliquez pour sélectionner un document (PDF ou Image)"}
              </span>
              <span className="text-xs text-slate-500 mt-1">PDF, PNG, JPG pris en charge</span>
            </label>
          </div>

          <button 
            type="submit" 
            disabled={!file || loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Analyse en cours par l'IA...</span>
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                <span>Lancer l'analyse du document</span>
              </>
            )}
          </button>
        </form>

        {/* Gestion des erreurs */}
        {error && (
          <div className="mt-6 p-4 bg-red-950/50 border border-red-800 rounded-xl flex items-center space-x-3 text-red-200">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Affichage des résultats */}
        {result && (
          <div className="mt-8 bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold border-b border-slate-800 pb-3">
              <CheckCircle className="w-5 h-5" />
              <span>Analyse réussie & enregistrée en BDD !</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Titre détecté</span>
              <h3 className="text-lg font-medium text-white">{result.title}</h3>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Montant extrait</span>
              <p className="text-xl font-bold text-indigo-400">{result.extracted_amount} €</p>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Résumé de l'IA</span>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed bg-slate-900/50 p-4 rounded-lg border border-slate-800/60">
                {result.summary}
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}