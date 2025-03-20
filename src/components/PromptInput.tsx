import React, { useState, useEffect } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import { useAI } from '../context/AIContext';
import { useAI as useBadAI } from '../context/BadAIContext';
import { useMode } from '../context/ModeContext';

const MAX_CHARS = 500;
const MIN_CHARS = 3;

export const PromptInput: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { mode } = useMode();
  
  // Get the relevant context based on mode
  const goodContext = useAI();
  const badContext = useBadAI();
  
  // Use the appropriate context based on mode
  const { generateIdeas, isLoading, error } = mode === 'good' 
    ? goodContext 
    : badContext;

  useEffect(() => {
    setCharCount(prompt.length);
    
    // Validation checks
    if (prompt.length > MAX_CHARS) {
      setValidationError(`Prompt is too long. Maximum ${MAX_CHARS} characters allowed.`);
    } else if (prompt.length > 0 && prompt.length < MIN_CHARS) {
      setValidationError(`Prompt is too short. Minimum ${MIN_CHARS} characters required.`);
    } else if (prompt.trim().length === 0 && prompt.length > 0) {
      setValidationError('Prompt cannot be only whitespace.');
    } else {
      setValidationError(null);
    }
  }, [prompt]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    // Prevent adding more characters if max length is reached
    if (newValue.length <= MAX_CHARS) {
      setPrompt(newValue);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading || validationError) return;
    
    const sanitizedPrompt = prompt.trim();
    await generateIdeas(sanitizedPrompt);
  };

  const isSubmitDisabled = !prompt.trim() || 
    isLoading || 
    !!validationError || 
    prompt.length < MIN_CHARS || 
    prompt.length > MAX_CHARS;

  const placeholderText = mode === 'good' 
    ? "Enter your idea prompt..." 
    : "Enter your bad idea prompt...";

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl space-y-2">
      <div className="relative">
        <textarea
          value={prompt}
          onChange={handlePromptChange}
          placeholder={placeholderText}
          className={`w-full p-4 pr-24 text-sm text-gray-200 border rounded-lg bg-gray-800 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-900 disabled:cursor-not-allowed ${
            validationError ? 'border-red-500' : 'border-gray-700'
          }`}
          rows={4}
          disabled={isLoading}
        />
        <div className="absolute right-2.5 bottom-2.5 flex items-center space-x-2">
          <span className={`text-sm ${
            charCount > MAX_CHARS - 50 
              ? 'text-red-400' 
              : charCount > MAX_CHARS - 100 
                ? 'text-yellow-400' 
                : 'text-gray-400'
          }`}>
            {charCount}/{MAX_CHARS}
          </span>
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:outline-none focus:ring-indigo-800 font-medium rounded-lg text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
      
      {(validationError || error) && (
        <div className="flex items-start space-x-2 text-red-400 text-sm p-2 bg-red-900/30 rounded-lg border border-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{validationError || error}</span>
        </div>
      )}
    </form>
  );
};