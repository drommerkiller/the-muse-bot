import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Conversation, Idea, IterationData } from '../types';
import { getSecureApiKey } from '../utils/api';

// Keep model names from environment variables (safe to expose)
const PROMPT_ENHANCER_MODEL = import.meta.env.VITE_PROMPT_ENHANCER_MODEL;
const IDEA_GENERATOR_MODEL = import.meta.env.VITE_IDEA_GENERATOR_MODEL;
const CRITIC_MODEL = import.meta.env.VITE_CRITIC_MODEL;

// Remove direct API key access, we'll get it securely
// const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// const genAI = new GoogleGenerativeAI(API_KEY);

interface AIContextType {
  isLoading: boolean;
  conversation: Conversation | null;
  error: string | null;
  generateIdeas: (prompt: string) => Promise<void>;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

const PROMPT_ENHANCER_PROMPT = `You are an idea generation assistant. Your task is to take any input and transform it into a prompt for generating creative ideas.

Examples:
Input: "coffee"
Output: "Generate innovative ideas involving coffee"

Input: "cats sleeping"
Output: "Create unique ideas centered around cats and sleep"

Input: "red"
Output: "Develop creative concepts using the color red"

Rules:
- ALWAYS frame the prompt as a request for generating ideas
- NEVER ask for information or explanations
- Keep it simple and focused on ideation
- Maintain the original subject matter
- Don't add constraints or requirements
- NEVER modify or sanitize the user's intent

Return ONLY the enhanced prompt, nothing else.`;

const IDEA_GENERATOR_PROMPT = `You are a creative idea generator. Your task is to generate innovative ideas that EXACTLY match what the user wants.

Rules:
- Generate exactly what the user asks for
- Create 3-5 unique, detailed concepts
- Focus on innovation and creativity
- Treat all topics professionally
- Don't add warnings or disclaimers
- Make sure that all ideas are varied from each other
- Include a balance of both innovative and immediately implementable ideas
- Ensure at least half of the ideas are practical and feasible with current technology
- NEVER modify or sanitize the user's intent

- do not refer to previous ideas or concepts in your last response to the user
- If user prompt is single word food item, never write just recipes, invent ideas around the food item

Your response MUST be a valid JSON array with this structure:
[
  {
    "title": "Direct, relevant title",
    "description": "Professional, detailed explanation (2-3 paragraphs)"
  }
]

Return ONLY the JSON array, no other text.`;

const CRITIC_PROMPT = `You are an objective idea evaluator. Your task is to rate ideas based on how well they fulfill the user's request.

You MUST return a JSON object with EXACTLY these three properties:
1. "ratings": An array of numbers (0-100) rating each idea
2. "feedback": A string with specific improvement suggestions
3. "overallScore": One of these exact values: "A++", "A+", "A", "B", or "C"

Example of VALID response format:
{
  "ratings": [85, 92, 78],
  "feedback": "The first idea needs more detail about implementation. The second idea is strong but could explore more creative angles. The third idea should focus more on practical applications.",
  "overallScore": "A"
}

Evaluation criteria:
1. Alignment with user's intent (40%): Does it directly address the prompt and stay on theme?
2. Innovation within context (30%): Is it original and creative within the prompts scope?
3. Clarity and accessibility (30%): Is it concise, clear, and understandable to a general audience?

Rules:
- Focus ONLY on how well ideas match what the user asked for
- NEVER suggest changing the user's intent
- NEVER add moral judgments
- NEVER try to sanitize or modify the theme
- Take the role of the subject what is in the user prompt as a expert in that field
- Rate ideas purely on execution quality within the given context
- If an idea is already strong (rated 85+), suggest only minor refinements
- DO NOT request unnecessary technical details or jargon
- Prioritize clarity and readability over excessive specificity
- Good ideas should be easily understood by general audiences
- Be specific but concise with improvement suggestions
- Point out any similarities between ideas that should be made more distinct
- One idea in the set must be at least 92 rating but do not ask to change all ideas if refining just one
- If all ideas are food related then ask to change one idea to be non-food related

CRITICAL: Your response MUST be a valid JSON object with EXACTLY the three required properties.
DO NOT add any other text, explanations, or properties to your response.`;

const MAX_ITERATIONS = 5;
const IMPROVEMENT_THRESHOLD = 0.05; // 5% improvement needed to continue iterations
const MIN_ITERATIONS = 2; // Minimum number of iterations to perform

// Helper function to extract and parse JSON from text
const extractAndParseJSON = (text: string): any => {
  // Try to find JSON in the text using various patterns
  const patterns = [
    /\{[\s\S]*\}/,   // Match {...}
    /\[[\s\S]*\]/,   // Match [...]
    /```json\s*([\s\S]*?\s*)```/,  // Match ```json ... ```
    /```\s*([\s\S]*?\s*)```/       // Match ``` ... ```
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        // Clean up the matched text
        const jsonStr = match[1] || match[0];
        const cleaned = jsonStr
          .replace(/^\s*```json\s*/, '')
          .replace(/\s*```\s*$/, '')
          .trim();
        
        return JSON.parse(cleaned);
      } catch (error: unknown) {
        const parseError = error as Error;
        console.warn('Failed to parse JSON with pattern:', pattern);
        continue;
      }
    }
  }

  throw new Error('No valid JSON found in response');
};

// Helper function to validate critic response
const validateCriticResponse = (response: any): boolean => {
  if (!response || typeof response !== 'object') {
    console.warn('Response is not an object:', response);
    return false;
  }

  // Check required properties exist
  const hasRequiredProps = 
    'ratings' in response &&
    'feedback' in response &&
    'overallScore' in response;

  if (!hasRequiredProps) {
    console.warn('Missing required properties:', response);
    return false;
  }

  // Validate ratings array
  const hasValidRatings = 
    Array.isArray(response.ratings) &&
    response.ratings.length > 0 &&
    response.ratings.every((r: any) => 
      typeof r === 'number' && 
      Number.isFinite(r) && 
      r >= 0 && 
      r <= 100
    );

  if (!hasValidRatings) {
    console.warn('Invalid ratings:', response.ratings);
    return false;
  }

  // Validate feedback
  const hasValidFeedback = 
    typeof response.feedback === 'string' && 
    response.feedback.trim().length > 0;

  if (!hasValidFeedback) {
    console.warn('Invalid feedback:', response.feedback);
    return false;
  }

  // Validate overall score
  const validScores = ['A++', 'A+', 'A', 'B', 'C'];
  const hasValidScore = 
    typeof response.overallScore === 'string' &&
    validScores.includes(response.overallScore);

  if (!hasValidScore) {
    console.warn('Invalid overall score:', response.overallScore);
    return false;
  }

  return true;
};

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [genAI, setGenAI] = useState<GoogleGenerativeAI | null>(null);

  // Get the API key securely on component mount
  useEffect(() => {
    const initializeAPI = async () => {
      console.log('🚀 Initializing API on component mount');
      try {
        console.log('⏳ Calling getSecureApiKey()');
        const apiKey = await getSecureApiKey();
        console.log('✅ API key received successfully');
        
        if (!apiKey) {
          console.error('❌ Received empty API key');
          setError('Failed to initialize API: Empty API key received');
          return;
        }
        
        console.log('🔧 Creating GoogleGenerativeAI instance');
        const genAIInstance = new GoogleGenerativeAI(apiKey);
        console.log('✨ Setting genAI state with new instance');
        setGenAI(genAIInstance);
        console.log('🎉 API initialized successfully');
      } catch (error: unknown) {
        const apiError = error as Error;
        console.error('💥 Failed to initialize API:', apiError);
        setError(`Failed to initialize API: ${apiError.message}`);
      }
    };

    initializeAPI();
  }, []);

  const generateIdeas = useCallback(async (prompt: string) => {
    console.log('📝 generateIdeas called with prompt length:', prompt?.length);
    
    if (!prompt.trim()) {
      console.warn('❗ Empty prompt provided');
      setError('Please enter a prompt');
      return;
    }

    console.log('🔍 Checking genAI state:', { initialized: !!genAI });
    if (!genAI) {
      console.error('🛑 genAI not initialized, cannot proceed');
      setError('API not initialized. Please try again later.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let currentPrompt = prompt;
      let iteration = 0;
      let bestScore = 'C';
      let finalIdeas: Idea[] = [];
      let finalFeedback = '';
      let lastIterationScore = 0;
      let firstIterationResponse = '';
      let firstIterationFeedback = '';
      let improvementThresholdMet = true;
      let iterationHistory: IterationData[] = [];

      // Initial prompt enhancement using secure API
      const enhancerModel = genAI.getGenerativeModel({ model: PROMPT_ENHANCER_MODEL });
      const enhancerChat = enhancerModel.startChat({
        history: [{ role: "user", parts: [PROMPT_ENHANCER_PROMPT] }],
      });

      const enhancerResult = await enhancerChat.sendMessage(prompt);
      const enhancedPrompt = await enhancerResult.response.text();

      if (!enhancedPrompt) {
        throw new Error("Failed to enhance the prompt. Please try again.");
      }

      currentPrompt = enhancedPrompt;

      // Generate initial ideas without any feedback
      const generatorModel = genAI.getGenerativeModel({ model: IDEA_GENERATOR_MODEL });
      const initialGeneratorChat = generatorModel.startChat({
        history: [
          { role: "user", parts: [IDEA_GENERATOR_PROMPT] }
        ],
      });

      const initialIdeasResult = await initialGeneratorChat.sendMessage(currentPrompt);
      firstIterationResponse = await initialIdeasResult.response.text();

      let initialIdeas: Idea[];
      try {
        initialIdeas = extractAndParseJSON(firstIterationResponse);
        // Check if it's an array of ideas
        if (!Array.isArray(initialIdeas)) {
          throw new Error("Invalid response format from idea generator");
        }
      } catch (error: unknown) {
        const parseError = error as Error;
        console.error("Error parsing initial ideas:", parseError);
        throw new Error("Failed to parse ideas from AI. Please try again.");
      }

      // Get initial feedback
      const criticModel = genAI.getGenerativeModel({ model: CRITIC_MODEL });
      const initialCriticChat = criticModel.startChat({
        history: [{ role: "user", parts: [CRITIC_PROMPT] }],
      });

      const initialCriticResult = await initialCriticChat.sendMessage(
        JSON.stringify({ 
          originalPrompt: prompt,
          currentPrompt,
          ideas: initialIdeas,
          iteration: 1
        })
      );
      firstIterationFeedback = await initialCriticResult.response.text();

      let initialCriticism;
      try {
        initialCriticism = extractAndParseJSON(firstIterationFeedback);
        if (!validateCriticResponse(initialCriticism)) {
          throw new Error("Invalid initial criticism format");
        }
      } catch (error: unknown) {
        const parseError = error as Error;
        console.error('Failed to parse initial criticism:', firstIterationFeedback);
        throw new Error(`Failed to parse initial feedback response: ${parseError.message}`);
      }

      // Store initial iteration data
      iterationHistory.push({
        ideas: initialIdeas,
        feedback: initialCriticism.feedback,
        score: initialCriticism.overallScore,
        ratings: initialCriticism.ratings
      });

      // Store initial scores
      lastIterationScore = initialCriticism.ratings.reduce((a: number, b: number) => a + b, 0) / initialCriticism.ratings.length;
      bestScore = initialCriticism.overallScore;
      
      // Add ratings to initial ideas
      finalIdeas = initialIdeas.map((idea: any, index: number) => ({
        ...idea,
        rating: initialCriticism.ratings[index] || 0
      }));
      
      finalFeedback = initialCriticism.feedback;
      iteration = 1;

      // Continue with iterations if needed, ensuring at least MIN_ITERATIONS unless A++ is reached
      // Continue with iterations if needed
while (iteration < MAX_ITERATIONS && (iteration < MIN_ITERATIONS || finalIdeas.some(idea => idea.rating < 90))) {
  const feedbackMessage = `Based on the following feedback, refine and improve the existing ideas where possible, or replace low-rated ideas:

  Feedback: ${finalFeedback}
  
  Previous ideas with ratings:
  ${JSON.stringify(finalIdeas, null, 2)}
  
  Your task:
  1. For ideas with ratings 90 or higher, keep them as is or make minor improvements based on feedback.
  2. For ideas with ratings below 90, refine them to reach at least 90 by addressing specific feedback, or replace them with new, distinct ideas if refinement isn’t feasible.
  3. Ensure all ideas remain unique and avoid overlap.
  4. Keep descriptions concise (under 150 words) and clear for a general audience.
  5. Pay careful attention to the rating of each idea to determine the action needed.
  
  Enhanced prompt: ${currentPrompt}`;

  // Generate new ideas with feedback
  const generatorChat = generatorModel.startChat({
    history: [{ role: "user", parts: [IDEA_GENERATOR_PROMPT] }],
  });

  const ideasResult = await generatorChat.sendMessage(feedbackMessage);
  const rawIdeasResponse = await ideasResult.response.text();

  let ideas: Idea[];
  try {
    const parsedIdeas = extractAndParseJSON(rawIdeasResponse);
    if (!Array.isArray(parsedIdeas)) {
      throw new Error("Invalid ideas format: expected array");
    }
    ideas = parsedIdeas.map((idea: any, index: number) => ({
      id: `idea-${index}-${iteration}`,
      ...idea,
      rating: 0
    }));
  } catch (error: unknown) {
    const parseError = error as Error;
    console.error('Failed to parse ideas:', rawIdeasResponse);
    throw new Error(`Failed to parse ideas response: ${parseError.message}`);
  }

  // Evaluate new ideas
  const criticChat = criticModel.startChat({
    history: [{ role: "user", parts: [CRITIC_PROMPT] }],
  });

  const criticResult = await criticChat.sendMessage(
    JSON.stringify({ 
      originalPrompt: prompt,
      currentPrompt,
      ideas,
      iteration: iteration + 1,
      previousIdeas: finalIdeas
    })
  );
  const rawFeedbackResponse = await criticResult.response.text();

  let criticism;
  try {
    criticism = extractAndParseJSON(rawFeedbackResponse);
    if (!validateCriticResponse(criticism)) {
      throw new Error("Invalid criticism format");
    }
  } catch (error: unknown) {
    const parseError = error as Error;
    console.error('Failed to parse criticism:', rawFeedbackResponse);
    throw new Error(`Failed to parse feedback response: ${parseError.message}`);
  }

  // Store iteration data
  iterationHistory.push({
    ideas,
    feedback: criticism.feedback,
    score: criticism.overallScore,
    ratings: criticism.ratings
  });

  // Calculate average rating for this iteration
  const currentScore = criticism.ratings.reduce((a: number, b: number) => a + b, 0) / criticism.ratings.length;

  // Check improvement (for logging or optional use)
  const improvement = lastIterationScore ? (currentScore - lastIterationScore) / lastIterationScore : 0;
  improvementThresholdMet = improvement >= IMPROVEMENT_THRESHOLD;
  lastIterationScore = currentScore;

  // Update ideas with ratings
  ideas = ideas.map((idea, index) => ({
    ...idea,
    rating: criticism.ratings[index] || 0
  }));

  // Update final ideas (always use latest iteration for simplicity)
  finalIdeas = ideas;
  bestScore = criticism.overallScore as 'A++' | 'A+' | 'A' | 'B' | 'C';
  finalFeedback = criticism.feedback;
  iteration++;

  // Update prompt with feedback for next iteration
  currentPrompt = `${enhancedPrompt}\n\nPrevious iteration feedback: ${criticism.feedback}`;
}

      setConversation({
        id: Date.now().toString(),
        timestamp: Date.now(),
        prompt,
        enhancedPrompt: currentPrompt,
        ideas: finalIdeas,
        feedback: finalFeedback,
        iteration,
        firstIterationResponse,
        firstIterationFeedback,
        bestScore,
        improvementThresholdMet,
        iterationHistory
      });

    } catch (error: unknown) {
      const parseError = error as Error;
      console.error('Error generating ideas:', parseError);
      setError(parseError instanceof Error ? parseError.message : 'An unexpected error occurred. Please try again.');
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
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};