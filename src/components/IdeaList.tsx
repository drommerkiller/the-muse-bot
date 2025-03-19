import React from 'react';
import { useAI } from '../context/AIContext';
import ReactMarkdown from 'react-markdown';

export const IdeaList: React.FC = () => {
  const { conversation, isLoading } = useAI();

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!conversation?.ideas.length) return null;

  return (
    <div className="w-full max-w-3xl space-y-6">
     
 {/* Debug Section */}
 <div className="bg-gray-800 text-white rounded-lg shadow p-6 space-y-4 font-mono text-sm">
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
                      <pre className="whitespace-pre-wrap text-white mt-2">
                        {JSON.stringify(iteration.ideas, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <span className="text-gray-400">Feedback:</span>
                      <pre className="whitespace-pre-wrap text-white mt-2">{iteration.feedback}</pre>
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


      {/* Ideas Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Final Ideas</h2>
        {conversation.ideas.map((idea) => (
          <div key={idea.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold mb-3 text-gray-900">{idea.title}</h3>
            <div className="prose max-w-none space-y-4">
              {idea.description.split('\n\n').map((paragraph, index) => (
                <p key={index} className="text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
            {idea.rating > 0 && (
              <div className="mt-4 text-sm font-medium text-gray-600">
                Rating: {idea.rating}/100
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};