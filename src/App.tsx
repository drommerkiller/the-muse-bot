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
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2">
              <Sparkles className="w-8 h-8 text-indigo-400" />
              <h1 className="text-3xl font-bold text-gray-100">
                {mode === 'good' ? 'The Muse Bot' : 'The Muse Bot'}
              </h1>
            </div>
            <p className="mt-2 text-gray-400">
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