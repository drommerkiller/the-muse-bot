import React from 'react';
import { useMode } from '../context/ModeContext';

export const ModeSelector: React.FC = () => {
  const { mode, setMode } = useMode();

  return (
    <div className="flex items-center justify-center space-x-2 w-full mb-2 sm:mb-6">
      <button
        onClick={() => setMode('good')}
        className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${
          mode === 'good'
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
        }`}
      >
        Ideas
      </button>
      <button
        onClick={() => setMode('bad')}
        className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${
          mode === 'bad'
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
        }`}
      >
        Bad Ideas
      </button>
    </div>
  );
};