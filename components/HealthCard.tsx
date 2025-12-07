import React from 'react';
import { SummaryCardData } from '../types';

interface HealthCardProps {
  data: SummaryCardData;
}

const HealthCard: React.FC<HealthCardProps> = ({ data }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="bg-emerald-600 p-4 text-white">
        <h3 className="font-bold text-xl flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Medication Summary
        </h3>
      </div>
      
      <div className="p-5 space-y-4">
        {/* Medicines List */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Medicines to Take</h4>
          <ul className="list-disc pl-5 space-y-1">
            {data.medicines && data.medicines.length > 0 ? (
              data.medicines.map((med, idx) => (
                <li key={idx} className="text-slate-800 font-medium text-lg">{med}</li>
              ))
            ) : (
              <li className="text-slate-500 italic">None detected</li>
            )}
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 p-3 rounded-lg">
             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">How to Take</h4>
             <p className="text-slate-700 leading-relaxed">{data.howToTake}</p>
          </div>
          
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
             <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Important Warnings</h4>
             <p className="text-slate-800 leading-relaxed">{data.warnings}</p>
          </div>

          {/* New Interactions Block */}
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 md:col-span-2">
             <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">Potential Interactions</h4>
             <p className="text-slate-800 leading-relaxed">{data.interactions}</p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">What to Avoid</h4>
              <p className="text-slate-600 text-sm">{data.avoid}</p>
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Return if...</h4>
              <p className="text-slate-600 text-sm">{data.whenToReturn}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-3">
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600 mt-0.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
          <div>
            <h4 className="font-bold text-blue-900 text-sm">Next Steps</h4>
            <p className="text-blue-800 text-sm">{data.nextSteps}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthCard;