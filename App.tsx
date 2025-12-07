import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import HealthCard from './components/HealthCard';
import AudioPlayer from './components/AudioPlayer';
import { analyzeMedicalDocument, generateAudioExplanation, ServiceError } from './services/geminiService';
import { AnalysisResult, AppState } from './types';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setAppState(AppState.IDLE);
    setResult(null);
    setError(null);
  };

  const handleProcess = async () => {
    if (!file) return;

    setAppState(AppState.ANALYZING);
    setError(null);

    try {
      // Step 1: Analyze Image (OCR, Simplify, Summary)
      const analysisData = await analyzeMedicalDocument(file);
      setResult(analysisData);

      // Step 2: Generate Audio
      setAppState(AppState.GENERATING_AUDIO);
      const audioData = await generateAudioExplanation(analysisData.simplifiedExplanation);
      
      setResult(prev => prev ? { ...prev, audioBase64: audioData } : null);
      setAppState(AppState.SUCCESS);

    } catch (err: any) {
      console.error("Process error:", err);
      
      let message = "We couldn't process this image. Please ensure it's a clear photo of a medical document and try again.";
      
      if (err instanceof ServiceError) {
        message = err.message;
      } else if (err.message && typeof err.message === 'string') {
        // Fallback for unexpected errors that might have a useful message
        // but avoid exposing raw code errors unless they seem user-friendly
        if (!err.message.includes('Unexpected token') && !err.message.includes('fetch')) {
           message = err.message;
        }
      }
      
      setError(message);
      setAppState(AppState.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">SmartHealth</h1>
          </div>
          <div className="text-xs font-medium px-2 py-1 bg-blue-50 text-blue-700 rounded-md">MVP Preview</div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* Intro */}
        {appState === AppState.IDLE && !result && (
          <div className="text-center space-y-2 mb-4">
            <h2 className="text-2xl font-bold text-slate-800">Understand Your Health</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Upload a photo of your prescription, pill pack, or doctor's note. We'll explain it simply and read it out to you.
            </p>
          </div>
        )}

        {/* Input Section */}
        <section>
          <h3 className="font-bold text-slate-900 text-lg mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Upload Document
          </h3>
          <FileUpload 
            onFileSelect={handleFileSelect} 
            disabled={appState === AppState.ANALYZING || appState === AppState.GENERATING_AUDIO} 
          />
        </section>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
             <div className="bg-red-100 p-1.5 rounded-full shrink-0 text-red-600">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div className="mt-0.5 font-medium">{error}</div>
          </div>
        )}

        {/* Loading State */}
        {(appState === AppState.ANALYZING || appState === AppState.GENERATING_AUDIO) && (
          <div className="text-center py-8 space-y-4 animate-pulse">
            <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="text-slate-600 font-medium">
              {appState === AppState.ANALYZING ? 'Reading your document...' : 'Creating audio explanation...'}
            </p>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 1. Raw Extraction */}
            <div>
              <h3 className="font-bold text-slate-900 text-lg mb-3 flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                </svg>
                Scanned Text
              </h3>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 font-mono whitespace-pre-wrap bg-slate-50 p-3 rounded-lg max-h-32 overflow-y-auto border border-slate-100">
                  {result.rawText}
                </p>
              </div>
            </div>

            {/* 2. Simplified Explanation */}
            <div>
              <h3 className="font-bold text-slate-900 text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
                Simple Explanation
              </h3>
              <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm leading-relaxed text-slate-800 text-lg">
                {result.simplifiedExplanation}
              </div>
            </div>

            {/* 3. Audio Player */}
            {result.audioBase64 && (
              <div>
                <h3 className="font-bold text-slate-900 text-lg mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                  Audio Guide
                </h3>
                <AudioPlayer audioBase64={result.audioBase64} />
              </div>
            )}

            {/* 4. Health Summary Card */}
            <div>
              <h3 className="font-bold text-slate-900 text-lg mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-slate-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
                Summary Card
              </h3>
              <HealthCard data={result.summaryCard} />
            </div>

            {/* Disclaimer */}
            <p className="text-center text-xs text-slate-400 mt-8 px-8">
              AI-generated summary. Not a substitute for professional medical advice. Always consult your doctor.
            </p>
          </div>
        )}
      </main>

      {/* Persistent Action Button */}
      {file && appState !== AppState.ANALYZING && appState !== AppState.GENERATING_AUDIO && !result && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-lg md:relative md:bg-transparent md:border-0 md:shadow-none md:p-0">
          <div className="max-w-md mx-auto">
            <button 
              onClick={handleProcess}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              Explain My Health Info
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;