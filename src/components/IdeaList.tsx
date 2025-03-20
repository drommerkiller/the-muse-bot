import React from 'react';
import { useAI } from '../context/AIContext';
import { useAI as useBadAI } from '../context/BadAIContext';
import { useMode } from '../context/ModeContext';
import ReactMarkdown from 'react-markdown';

export const IdeaList: React.FC = () => {
  const { mode } = useMode();
  const goodContext = useAI();
  const badContext = useBadAI();
  
  // Use the appropriate context based on mode
  const { conversation, isLoading } = mode === 'good' 
    ? goodContext 
    : badContext;
    
  // Check if we're in development environment
  const isDevelopment = import.meta.env.DEV;

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl">
        <div className="bg-gray-800 rounded-lg shadow-lg shadow-gray-900/30 p-6 space-y-4 border border-gray-700">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!conversation?.ideas.length) return null;

  return (
    <div className="w-full max-w-3xl space-y-6">
     
      {/* Debug Section - Only shown in development */}
      {isDevelopment && (
        <div className="bg-gray-900 text-gray-200 rounded-lg shadow-lg shadow-black/30 p-6 space-y-4 font-mono text-sm border border-gray-800">
          <div>
            <h2 className="text-xl font-bold mb-2 text-green-400">🔍 Debug Output</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-yellow-400">Original Prompt:</h3>
                <pre className="whitespace-pre-wrap">{conversation.prompt}</pre>
              </div>
              
              <div>
                <h3 className="text-yellow-400">Enhanced Prompt:</h3>
                <pre className="whitespace-pre-wrap">{conversation.enhancedPrompt}</pre>
              </div>

              <div>
                <h3 className="text-yellow-400">Initial Ideas:</h3>
                <pre className="whitespace-pre-wrap">{conversation.firstIterationResponse}</pre>
              </div>

              <div>
                <h3 className="text-yellow-400">Initial Feedback:</h3>
                <pre className="whitespace-pre-wrap">{conversation.firstIterationFeedback}</pre>
              </div>

              <div>
                <h3 className="text-yellow-400">Iteration History:</h3>
                {conversation.iterationHistory.map((iteration, index) => (
                  <div key={index} className="mt-4 border-t border-gray-700 pt-4">
                    <h4 className="text-blue-400">Iteration {index + 1}</h4>
                    <div className="pl-4 space-y-2">
                      <div>
                        <span className="text-gray-400">Score: </span>
                        <span className="text-green-400">{iteration.score}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Ratings: </span>
                        <span className="text-green-400">[{iteration.ratings.join(', ')}]</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Ideas:</span>
                        <pre className="whitespace-pre-wrap text-gray-200 mt-2">
                          {JSON.stringify(iteration.ideas, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <span className="text-gray-400">Feedback:</span>
                        <pre className="whitespace-pre-wrap text-gray-200 mt-2">{iteration.feedback}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-yellow-400">Final Stats:</h3>
                <pre className="whitespace-pre-wrap">
                  Total Iterations: {conversation.iteration}
                  Best Score: {conversation.bestScore}
                  Improvement Threshold Met: {conversation.improvementThresholdMet ? 'Yes' : 'No'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ideas Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-100">
          {mode === 'good' ? 'Final Ideas' : 'Ideas?'}
        </h2>
        {conversation.ideas.map((idea) => (
          <div key={idea.id} className="bg-gray-800 rounded-lg shadow-lg shadow-gray-900/30 p-6 border border-gray-700 transition-all hover:border-indigo-500">
            <h3 className="text-xl font-bold mb-3 text-gray-100">{idea.title}</h3>
            <div className="prose prose-invert max-w-none space-y-4">
              {idea.description.split('\n\n').map((paragraph, index) => (
                <p key={index} className="text-gray-300 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
            {idea.rating > 0 && (
              <div className="mt-4 text-sm font-medium text-gray-400">
                Rating: <span className="text-indigo-400">{idea.rating}/100</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};