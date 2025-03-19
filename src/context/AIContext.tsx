import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Conversation, Idea, IterationData } from '../types';
import { getSecureApiKey } from '../utils/api';

// Model names from environment variables
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

// Prompt for enhancing user input (unchanged, keeps prompt broad)
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

// Updated idea generator prompt with emphasis on variety
const IDEA_GENERATOR_PROMPT = `You are a creative idea generator. Your task is to generate innovative ideas that EXACTLY match what the user wants.

Rules:
- Generate exactly what the user asks for
- Create 3-5 unique, detailed concepts
- Focus on innovation and creativity
- Treat all topics professionally
- Don't add warnings or disclaimers
- Make sure that all ideas are varied from each other and explore different aspects, angles, or applications related to the prompt
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

// Updated critic prompt with stronger emphasis on variety
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
- If the ideas are too similar in concept or approach, assign lower ratings to the ideas that are not sufficiently distinct and provide feedback to explore more diverse angles
- One idea in the set must be at least 92 rating but do not ask to change all ideas if refining just one
- If all ideas are food related then ask to change one idea to be non-food related

CRITICAL: Your response MUST be a valid JSON object with EXACTLY the three required properties.
DO NOT add any other text, explanations, or properties to your response.`;

// Constants for iteration control
const MAX_ITERATIONS = 5;
const MIN_ITERATIONS = 2;
const IMPROVEMENT_THRESHOLD = 0.02; // 2% improvement

// Creative directions for guiding generation (unchanged)
const creativeDirections = [
  "Focus on practical and straightforward ideas",
  "Explore unusual or unexpected perspectives",
  "Consider playful and light-hearted approaches",
  "Think about elegant and refined concepts",
  "Look for simple, minimalist solutions",
  "Emphasize futuristic or sci-fi-inspired themes",
  "Draw inspiration from nature or organic forms",
  "Incorporate elements of surprise or paradox",
  "Blend traditional and modern concepts",
  "Prioritize sustainability or eco-friendly angles",
  "Highlight cultural or historical references",
  "Focus on community or collaborative aspects",
  "Explore luxury or high-end market potential",
  "Consider educational or informative angles",
  "Incorporate technology or digital innovation",
  "Emphasize sensory experiences (visual, tactile, etc.)",
  "Think about scalable or mass-market applications",
  "Explore niche or specialized use cases",
  "Consider humorous or whimsical interpretations",
  "Focus on problem-solving or utility",
  "Incorporate artistic or creative expressions",
  "Explore cross-industry applications",
  "Think about global or international perspectives",
  "Consider accessibility and inclusivity",
  "Focus on speed or efficiency",
  "Explore emotional or psychological impacts",
  "Think about gamification or interactive elements",
  "Consider health and wellness angles",
  "Explore data-driven or analytical approaches",
  "Think about modular or customizable solutions"
];

// Helper functions (unchanged, assumed to exist)
const extractAndParseJSON = (text: string) => {
  // Implementation assumed
  return JSON.parse(text.match(/\[.*\]|\{.*\}/s)?.[0] || '[]');
};

const validateCriticResponse = (response: any) => {
  // Implementation assumed
  return response && 'ratings' in response && 'feedback' in response && 'overallScore' in response;
};

// AIProvider component
export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [genAI, setGenAI] = useState<GoogleGenerativeAI | null>(null);

  // Initialize API key
  useEffect(() => {
    const initializeAPI = async () => {
      try {
        const apiKey = await getSecureApiKey();
        if (!apiKey) throw new Error('Empty API key');
        setGenAI(new GoogleGenerativeAI(apiKey));
      } catch (error) {
        setError(`Failed to initialize API: ${(error as Error).message}`);
      }
    };
    initializeAPI();
  }, []);

  const generateIdeas = useCallback(async (prompt: string) => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }
    if (!genAI) {
      setError('API not initialized. Please try again later.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      // Select random creative direction
      const randomDirection = creativeDirections[Math.floor(Math.random() * creativeDirections.length)];

      // Enhance prompt without including the creative direction
      const enhancerModel = genAI.getGenerativeModel({ model: PROMPT_ENHANCER_MODEL });
      const enhancerChat = enhancerModel.startChat({ history: [{ role: "user", parts: [PROMPT_ENHANCER_PROMPT] }] });
      const enhancerResult = await enhancerChat.sendMessage(prompt);
      const enhancedPrompt = await enhancerResult.response.text();
      if (!enhancedPrompt) throw new Error("Failed to enhance the prompt");

      let currentPrompt = enhancedPrompt;
      let iteration = 0;
      let bestScore = 'C';
      let finalIdeas: Idea[] = [];
      let finalFeedback = '';
      let lastIterationScore = 0;
      let improvementThresholdMet = true;
      let iterationHistory: IterationData[] = [];

      // Configure generator model
      const generatorModel = genAI.getGenerativeModel({
        model: IDEA_GENERATOR_MODEL,
        generationConfig: {
          temperature: 0.85,
          topP: 0.9,
          maxOutputTokens: 3000,
        },
      });

      // Initial generation with creative direction as a separate instruction
      const generatorMessage = `${enhancedPrompt}\n\nFor this specific request, consider the following creative direction: ${randomDirection}. However, ensure that the ideas are varied and explore different aspects or angles related to the prompt.`;
      const initialGeneratorChat = generatorModel.startChat({ history: [{ role: "user", parts: [IDEA_GENERATOR_PROMPT] }] });
      const initialIdeasResult = await initialGeneratorChat.sendMessage(generatorMessage);
      const firstIterationResponse = await initialIdeasResult.response.text();
      let initialIdeas = extractAndParseJSON(firstIterationResponse);
      if (!Array.isArray(initialIdeas)) throw new Error("Invalid response format from idea generator");

      // Get initial feedback
      const criticModel = genAI.getGenerativeModel({ model: CRITIC_MODEL });
      const initialCriticChat = criticModel.startChat({ history: [{ role: "user", parts: [CRITIC_PROMPT] }] });
      const initialCriticResult = await initialCriticChat.sendMessage(JSON.stringify({ originalPrompt: prompt, currentPrompt, ideas: initialIdeas, iteration: 1 }));
      const firstIterationFeedback = await initialCriticResult.response.text();
      let initialCriticism = extractAndParseJSON(firstIterationFeedback);
      if (!validateCriticResponse(initialCriticism)) throw new Error("Invalid initial criticism format");

      iterationHistory.push({ ideas: initialIdeas, feedback: initialCriticism.feedback, score: initialCriticism.overallScore, ratings: initialCriticism.ratings });
      lastIterationScore = initialCriticism.ratings.reduce((a: number, b: number) => a + b, 0) / initialCriticism.ratings.length;
      bestScore = initialCriticism.overallScore;
      finalIdeas = initialIdeas.map((idea: any, index: number) => ({ ...idea, rating: initialCriticism.ratings[index] || 0 }));
      finalFeedback = initialCriticism.feedback;
      iteration = 1;

      // Iteration loop
      while (iteration < MAX_ITERATIONS && (iteration < MIN_ITERATIONS || improvementThresholdMet)) {
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
6. Remember to consider the creative direction: ${randomDirection}, but ensure variety in the ideas.

Enhanced prompt: ${currentPrompt}`;

        const generatorChat = generatorModel.startChat({ history: [{ role: "user", parts: [IDEA_GENERATOR_PROMPT] }] });
        const ideasResult = await generatorChat.sendMessage(feedbackMessage);
        const rawIdeasResponse = await ideasResult.response.text();
        let ideas = extractAndParseJSON(rawIdeasResponse);
        if (!Array.isArray(ideas)) throw new Error("Invalid ideas format: expected array");

        const criticChat = criticModel.startChat({ history: [{ role: "user", parts: [CRITIC_PROMPT] }] });
        const criticResult = await criticChat.sendMessage(JSON.stringify({ originalPrompt: prompt, currentPrompt, ideas, iteration: iteration + 1, previousIdeas: finalIdeas }));
        const rawFeedbackResponse = await criticResult.response.text();
        let criticism = extractAndParseJSON(rawFeedbackResponse);
        if (!validateCriticResponse(criticism)) throw new Error("Invalid criticism format");

        iterationHistory.push({ ideas, feedback: criticism.feedback, score: criticism.overallScore, ratings: criticism.ratings });

        const currentAverage = criticism.ratings.reduce((a: number, b: number) => a + b, 0) / criticism.ratings.length;
        const improvement = lastIterationScore ? (currentAverage - lastIterationScore) / lastIterationScore : 0;
        improvementThresholdMet = improvement >= IMPROVEMENT_THRESHOLD;
        lastIterationScore = currentAverage;

        finalIdeas = ideas.map((idea, index) => ({ ...idea, rating: criticism.ratings[index] || 0 }));
        bestScore = criticism.overallScore;
        finalFeedback = criticism.feedback;
        iteration++;

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
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
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
  if (context === undefined) throw new Error('useAI must be used within an AIProvider');
  return context;
};