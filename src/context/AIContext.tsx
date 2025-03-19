import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Conversation, Idea, IterationData } from '../types';
import { getSecureApiKey } from '../utils/api';

const PROMPT_ENHANCER_MODEL = import.meta.env.VITE_PROMPT_ENHANCER_MODEL;
const IDEA_GENERATOR_MODEL = import.meta.env.VITE_IDEA_GENERATOR_MODEL;
const CRITIC_MODEL = import.meta.env.VITE_CRITIC_MODEL;

interface AIContextType {
  isLoading: boolean;
  conversation: Conversation | null;
  error: string | null;
  generateIdeas: (prompt: string) => Promise<void>;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

const PROMPT_ENHANCER_PROMPT = `
You are an idea generation assistant. Your task is to take any input and transform it into a prompt for generating creative ideas.

Rules:
- Always frame the prompt as generating ideas
- Never ask for more information
- Keep it simple and focused
- Maintain the original subject matter
- Don't add constraints or requirements
- Don't modify user's intent
- Return ONLY the enhanced prompt
`;

const IDEA_GENERATOR_PROMPT = `
You are a creative idea generator. Your task is to generate innovative ideas EXACTLY matching the user's enhanced request.

Rules:
- Generate exactly what the user asks for
- Create 3-5 unique, detailed ideas
- Ensure each idea explores a different angle or application
- Mix practicality with innovation
- Don't add warnings or disclaimers
- Don't reference previous ideas explicitly
- If input is a single food item, create ideas beyond just recipes
- Return ONLY a JSON array with this structure:
[
{
"title": "...",
"description": "..."
}
]
`;

const CRITIC_PROMPT = `
You are an objective idea evaluator.

Return a JSON object:
{
  "ratings": [0-100],
  "feedback": "...",
  "overallScore": "A++"|"A+"|"A"|"B"|"C"
}

Rate each idea by:
- Alignment (40%)
- Innovation (30%)
- Clarity (30%)

Rules:
- Don't suggest changing user's intent
- Don't add moral judgments
- Don't modify user's theme
- Rate purely on execution quality
- Encourage distinct angles between ideas
`;

const MAX_ITERATIONS = 5;
const MIN_ITERATIONS = 2;
const IMPROVEMENT_THRESHOLD = 0.02;

const creativeDirections = [
  "Practical",
  "Unusual",
  "Playful",
  "Elegant",
  "Minimalist",
  "Futuristic",
  "Nature-inspired",
  "Surprising",
  "Traditional meets Modern",
  "Sustainable",
  "Cultural",
  "Collaborative",
  "Luxurious",
  "Educational",
  "Tech-driven",
  "Sensory",
  "Scalable",
  "Niche",
  "Whimsical",
  "Problem-solving",
  "Artistic",
  "Cross-industry",
  "Global",
  "Inclusive",
  "Efficient",
  "Psychological",
  "Interactive",
  "Health-focused",
  "Data-driven",
  "Modular"
];

const randomDirections = (num = 3) => 
  creativeDirections.sort(() => 0.5 - Math.random()).slice(0, num);

const extractAndParseJSON = (text: string) => JSON.parse(text.match(/\[.*\]|{.*}/s)?.[0] || '[]');

const validateCriticResponse = (response: any) =>
  response && 'ratings' in response && 'feedback' in response && 'overallScore' in response;

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [genAI, setGenAI] = useState<GoogleGenerativeAI | null>(null);

  useEffect(() => {
    getSecureApiKey().then(apiKey => {
      if (apiKey) setGenAI(new GoogleGenerativeAI(apiKey));
      else setError('Failed to load API key.');
    })
    .catch(e => setError(`Initialization error: ${e.message}`));
  }, []);

  const generateIdeas = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return setError('Please enter a prompt');
    if (!genAI) return setError('API not initialized yet');

    setIsLoading(true);
    setError(null);

    try {
      const enhancerModel = genAI.getGenerativeModel({ model: PROMPT_ENHANCER_MODEL });
      const enhancedResp = await enhancerModel.generateContent(`${PROMPT_ENHANCER_PROMPT}\n\n${prompt}`);
      const enhancedPrompt = enhancedResp.response.text();

      if (!enhancedPrompt) throw new Error("Prompt enhancement failed");

      const chosenDirections = randomDirections(3);
      const directionText = `For variety, use these creative angles: ${chosenDirections.join(', ')}.`;

      const fullGeneratorPrompt = `${enhancedPrompt}\n\n${directionText}`;

      const generatorModel = genAI.getGenerativeModel({
        model: IDEA_GENERATOR_MODEL,
        generationConfig: { temperature: 0.9, topP: 0.95, maxOutputTokens: 2500 },
      });

      const generatorResp = await generatorModel.generateContent(`${IDEA_GENERATOR_PROMPT}\n\n${fullGeneratorPrompt}`);
      let ideas = extractAndParseJSON(generatorResp.response.text());

      const criticModel = genAI.getGenerativeModel({ model: CRITIC_MODEL });
      const criticResp = await criticModel.generateContent(`${CRITIC_PROMPT}\n\n${JSON.stringify({ ideas, originalPrompt: prompt })}`);
      let feedback = extractAndParseJSON(criticResp.response.text());

      if (!validateCriticResponse(feedback)) throw new Error("Critic response invalid");

      const ideaRatings = ideas.map((idea: Idea, idx: number) => ({
        ...idea, rating: feedback.ratings[idx] || 0
      }));

      setConversation({
        id: `${Date.now()}`,
        timestamp: Date.now(),
        prompt,
        enhancedPrompt: fullGeneratorPrompt,
        ideas: ideaRatings,
        feedback: feedback.feedback,
        iteration: 1,
        firstIterationResponse: JSON.stringify(ideas),
        firstIterationFeedback: feedback.feedback,
        bestScore: feedback.overallScore,
        improvementThresholdMet: false,
        iterationHistory: [{ ideas, ratings: feedback.ratings, feedback: feedback.feedback, score: feedback.overallScore }]
      });

    } catch (e: any) {
      setError(e.message || 'Unexpected error');
    } finally {
      setIsLoading(false);
    }
  }, [genAI]);

  return (
    <AIContext.Provider value={{ isLoading, conversation, error, generateIdeas }}>
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) throw new Error('useAI must be used within AIProvider');
  return context;
};