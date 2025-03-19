import React from 'react';
import { Sparkles } from 'lucide-react';
import { AIProvider } from './context/AIContext';
import { PromptInput } from './components/PromptInput';
import { IdeaList } from './components/IdeaList';

function App() {
  return (
    <AIProvider>
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center space-y-8">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <Sparkles className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">The Muse Bot</h1>
              </div>
              <p className="mt-2 text-gray-600">
                Transform your vague concepts into random ideas. 
              </p>
            </div>

            <PromptInput />
            <IdeaList />
          </div>
        </div>
      </div>
    </AIProvider>
  );
}

export default App;