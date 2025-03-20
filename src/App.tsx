import React from 'react';
import { Sparkles } from 'lucide-react';
import { AIProvider } from './context/AIContext';
import { AIProvider as BadAIProvider } from './context/BadAIContext';
import { ModeProvider, useMode } from './context/ModeContext';
import { PromptInput } from './components/PromptInput';
import { IdeaList } from './components/IdeaList';
import { ModeSelector } from './components/ModeSelector';

// Inner component to access context
const AppContent: React.FC = () => {
  const { mode } = useMode();
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 flex-grow">
        <div className="flex flex-col items-center space-y-4 sm:space-y-8">
          <div className="text-center w-full">
            <div className="flex items-center justify-center space-x-2">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">
                {mode === 'good' ? 'The Muse Bot' : 'The Muse Bot'}
              </h1>
            </div>
            <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-400">
              {mode === 'good' 
                ? 'Transform anything into random ideas.' 
                : 'Transform anything into random ideas.'}
            </p>
          </div>
          
          <ModeSelector />
          <PromptInput />
          <IdeaList />
        </div>
      </div>
      
      <footer className="mt-6 py-4">
        <div className="container mx-auto px-4 sm:px-6">
          <p className="text-center text-xs text-gray-500 flex flex-col sm:block">
            <span>This is an art project.</span>
            <span>We take absolutely no responsibility on anything.</span>
            <span>Heba 2025</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

// Main App component with providers
function App() {
  return (
    <ModeProvider>
      <AIProvider>
        <BadAIProvider>
          <AppContent />
        </BadAIProvider>
      </AIProvider>
    </ModeProvider>
  );
}

export default App;