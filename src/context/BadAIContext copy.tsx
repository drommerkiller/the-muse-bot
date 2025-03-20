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

// Prompt for enhancing user input for BAD ideas
const PROMPT_ENHANCER_PROMPT = `You are a deliberately BAD idea generation assistant. Your task is to take any input and transform it into a prompt for generating hilariously terrible, impractical, or absurd ideas.

Examples:
Input: "coffee"
Output: "Generate ridiculously impractical and over-engineered ideas involving coffee"
Input: "cats sleeping"
Output: "Create the most inconvenient and absurd ideas centered around cats and sleep"
Input: "red"
Output: "Develop needlessly complicated and impractical concepts using the color red"

Rules:
- ALWAYS frame the prompt as a request for generating BAD ideas
- Emphasize absurdity, impracticality, and over-complication
- Keep it focused on generating hilariously terrible concepts
- Maintain the original subject matter
- NEVER modify the user's intent but push it toward the absurd
- Add humor through overly formal language or bureaucratic phrasing

Return ONLY the enhanced prompt, nothing else.`;

// Enhanced idea generator prompt for BAD ideas with creative directions
const IDEA_GENERATOR_PROMPT = `You are a BAD idea generator. Your task is to generate hilariously terrible, impractical, or overcomplicated ideas that EXACTLY match what the user wants, but in the worst possible way.

Rules:
- Generate exactly what the user asks for, but make the ideas deliberately flawed, impractical, or absurd
- Do not include the incorporated creativeDirection element in the response
- Create 3-5 unique, detailed BAD concepts
- Each idea MUST align with a specific terrible creative direction provided in the request
- Ensure all ideas are distinctly bad in different ways to avoid overlap
- Focus on humor, absurdity, and impracticality
- Treat all topics with mock seriousness and excessive formality
- Don't add warnings or disclaimers
- Include a mix of ideas that are:
  * Needlessly complicated
  * Laughably impractical
  * Absurdly over-engineered
  * Hilariously inefficient
- NEVER sanitize the user's intent, just make it terribly executed
- If user prompt is a single-word food item, invent the most ridiculous non-food uses or bizarrely complex food ideas

Your response MUST be a valid JSON array with this structure:
[
  {
    "title": "Direct, relevant but terrible title",
    "description": "Detailed explanation (2-3 paragraphs) of this hilariously bad idea, reflecting its assigned creative direction"
  }
]

Return ONLY the JSON array, no other text.`;

// Enhanced critic prompt for evaluating BAD ideas
const CRITIC_PROMPT = `You are an evaluator of deliberately BAD ideas. Your task is to rate ideas based on how wonderfully terrible, impractical, or absurd they are.

You MUST return a JSON object with EXACTLY these three properties:
1. "ratings": An array of numbers (0-100) rating each idea on its "badness" (higher = more hilariously bad)
2. "feedback": A string with specific suggestions to make ideas even worse
3. "overallScore": One of these exact values: "A++", "A+", "A", "B", or "C"

Example of VALID response format:
{
  "ratings": [85, 92, 78],
  "feedback": "The first idea needs to be more needlessly complex. The second is wonderfully terrible. The third isn't absurd enough; add more unnecessary steps.",
  "overallScore": "A"
}

Evaluation criteria:
1. Impracticality (40%): How wonderfully useless, inefficient, or over-engineered is it?
2. Absurdity within context (30%): How hilariously illogical or nonsensical is it?
3. Mock seriousness (20%): How seriously is this terrible idea presented?
4. Diversity of badness (10%): Do the ideas use different kinds of terribleness?

Rules:
- Focus ONLY on how wonderfully terrible the ideas are
- NEVER suggest making ideas more practical or sensible
- NEVER add moral judgments
- NEVER try to sanitize or modify the theme
- Take the role of a serious critic of bad ideas
- Rate ideas purely on "bad idea" execution quality
- If an idea isn't bad enough (under 85), suggest ways to make it worse
- DO NOT request making ideas more logical or functional
- Prioritize humor and absurdity
- Be specific but concise with suggestions for worse ideas
- If 2+ ideas share a similar theme of badness, rate the less distinct ones below 85
- One idea must score at least 92 for magnificent terribleness
- If all ideas are similarly bad, ask for more diverse types of bad ideas

CRITICAL: Your response MUST be a valid JSON object with EXACTLY the three required properties.
DO NOT add any other text, explanations, or properties.`;

// Constants for iteration control
const MAX_ITERATIONS = 1;
const MIN_ITERATIONS = 0;
const IMPROVEMENT_THRESHOLD = 0.2; // 2% improvement

// Creative directions for guiding BAD idea generation
const creativeDirections = [
  "Make it needlessly complicated with at least 17 steps",
  "Design it to be as inconvenient as humanly possible",
  "Incorporate outdated technology in the most inappropriate way",
  "Make it solve a problem that doesn't exist",
  "Create something that works in theory but is impossible in practice",
  "Design it to be as expensive as possible for minimal benefit",
  "Make it require extremely specific conditions that rarely occur",
  "Create something that achieves the opposite of its intended purpose",
  "Design it to be laughably energy inefficient",
  "Incorporate as many unnecessary moving parts as possible",
  "Make it require constant maintenance for no good reason",
  "Create a solution that's 10x more complex than the problem",
  "Design something that becomes completely obsolete after one use",
  "Create a system with the most unnecessary bureaucracy imaginable",
  "Make it produce more problems than it solves",
  "Design a solution that works only on leap years during full moons",
  "Create something that requires users to follow an absurdly detailed manual",
  "Make it as loud and obnoxious as possible",
  "Design it to be intentionally confusing to use",
  "Create something that needs to be recalibrated every 7 minutes",
  "Make it require a team of specialists just to turn it on",
  "Design it to work only when no one is looking at it",
  "Create something that needs to be stored in absurdly specific conditions",
  "Make it require rare materials from at least 12 different countries",
  "Design it to break the moment the warranty expires",
  "Create something that's comically oversized for its function",
  "Make it require signing a 50-page terms and conditions document",
  "Design it to be operated only while standing on one foot",
  "Create something that needs to be recharged every 30 seconds",
  "Make it have the most counterintuitive controls possible",
  "Design it to only work when spoken to in Shakespearean English",
  "Create something that's extraordinarily fragile with no good reason",
  "Make it rely on completely unpredictable random factors",
  "Design it to have the most misleading instructions possible",
  "Create something that needs to be assembled by someone with three hands",
  "Make it require a subscription to seven different services",
  "Design it to be as aesthetically displeasing as possible",
  "Create something that needs to be constantly reconfigured",
  "Make it violate the basic laws of common sense",
  "Design it to break any workflow it's introduced into",
  "Create something that requires specialized knowledge to operate but is useless to experts",
  "Make it have a mysterious on/off sequence that changes weekly",
  "Design it to require a perfect balance of opposing factors",
  "Create something that only works when Mercury is in retrograde",
  "Make it require precisely timed coordination between multiple users",
  "Design it to have no obvious purpose but many complex features",
  "Create something with an interface that always does the opposite of what's expected",
  "Make it work perfectly in demo mode but fail in regular use",
  "Design it to create a problem it then half-heartedly tries to solve"
];

// Helper functions (unchanged)
const extractAndParseJSON = (text: string) => {
  const patterns = [/\[.*\]|\{.*\}/s, /```json\s*([\s\S]*?)\s*```/, /```\s*([\s\S]*?)\s*```/];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const jsonStr = match[1] || match[0];
        return JSON.parse(jsonStr.replace(/```json|```/g, '').trim());
      } catch {
        continue;
      }
    }
  }
  throw new Error('No valid JSON found');
};

const validateCriticResponse = (response: any) => {
  return (
    response &&
    'ratings' in response &&
    Array.isArray(response.ratings) &&
    response.ratings.every((r: any) => typeof r === 'number' && r >= 0 && r <= 100) &&
    'feedback' in response &&
    typeof response.feedback === 'string' &&
    'overallScore' in response &&
    ['A++', 'A+', 'A', 'B', 'C'].includes(response.overallScore)
  );
};

// AIProvider component
export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [genAI, setGenAI] = useState<GoogleGenerativeAI | null>(null);

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
      // Enhance prompt for BAD ideas
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

      // Select 5 unique creative directions for this run
      const selectedDirections = [...creativeDirections]
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);

      // Configure generator model
      const generatorModel = genAI.getGenerativeModel({
        model: IDEA_GENERATOR_MODEL,
        generationConfig: {
          temperature: 0.9, // Higher temperature for more creative/absurd ideas
          topP: 0.95,
          maxOutputTokens: 3000,
        },
      });

      // Initial generation with unique directions per idea
      const generatorMessage = `${enhancedPrompt}\n\nGenerate 5 hilariously BAD ideas, each tied to one of these terrible creative directions: ${selectedDirections.join('; ')}. Ensure each idea reflects its assigned direction of badness and is distinctly terrible in different ways.`;
      const initialGeneratorChat = generatorModel.startChat({ history: [{ role: "user", parts: [IDEA_GENERATOR_PROMPT] }] });
      const initialIdeasResult = await initialGeneratorChat.sendMessage(generatorMessage);
      const firstIterationResponse = await initialIdeasResult.response.text();
      let initialIdeas = extractAndParseJSON(firstIterationResponse);
      if (!Array.isArray(initialIdeas)) throw new Error("Invalid response format from idea generator");

      // Get initial feedback
      const criticModel = genAI.getGenerativeModel({ model: CRITIC_MODEL });
      const initialCriticChat = criticModel.startChat({ history: [{ role: "user", parts: [CRITIC_PROMPT] }] });
      const initialCriticResult = await initialCriticChat.sendMessage(
        JSON.stringify({ originalPrompt: prompt, currentPrompt, ideas: initialIdeas, iteration: 1 })
      );
      const firstIterationFeedback = await initialCriticResult.response.text();
      let initialCriticism = extractAndParseJSON(firstIterationFeedback);
      if (!validateCriticResponse(initialCriticism)) throw new Error("Invalid initial criticism format");

      iterationHistory.push({
        ideas: initialIdeas,
        feedback: initialCriticism.feedback,
        score: initialCriticism.overallScore,
        ratings: initialCriticism.ratings,
      });
      lastIterationScore = initialCriticism.ratings.reduce((a: number, b: number) => a + b, 0) / initialCriticism.ratings.length;
      bestScore = initialCriticism.overallScore;
      finalIdeas = initialIdeas.map((idea: any, index: number) => ({
        ...idea,
        rating: initialCriticism.ratings[index] || 0,
        id: `bad-idea-${Date.now()}-${index}`
      }));
      finalFeedback = initialCriticism.feedback;
      iteration = 1;

      // Iteration loop
      while (iteration < MAX_ITERATIONS && (iteration < MIN_ITERATIONS || improvementThresholdMet)) {
        const feedbackMessage = `Based on the following feedback, make these BAD ideas even worse:

Feedback: ${finalFeedback}

Previous bad ideas with ratings:
${JSON.stringify(finalIdeas, null, 2)}

Your task:
1. For ideas with ratings 90 or higher, they're already wonderfully terrible. Make minor tweaks to enhance their badness.
2. For ideas below 90, they're not bad enough! Make them more absurd, impractical, or ridiculous.
3. Use these terrible creative directions for the 5 ideas: ${selectedDirections.join('; ')}.
4. Ensure all ideas are uniquely terrible in different ways, avoiding similar types of badness.
5. Keep descriptions concise (under 150 words) and mockingly formal.

Enhanced prompt: ${currentPrompt}`;

        const generatorChat = generatorModel.startChat({ history: [{ role: "user", parts: [IDEA_GENERATOR_PROMPT] }] });
        const ideasResult = await generatorChat.sendMessage(feedbackMessage);
        const rawIdeasResponse = await ideasResult.response.text();
        let ideas = extractAndParseJSON(rawIdeasResponse);
        if (!Array.isArray(ideas)) throw new Error("Invalid ideas format: expected array");

        const criticChat = criticModel.startChat({ history: [{ role: "user", parts: [CRITIC_PROMPT] }] });
        const criticResult = await criticChat.sendMessage(
          JSON.stringify({ originalPrompt: prompt, currentPrompt, ideas, iteration: iteration + 1, previousIdeas: finalIdeas })
        );
        const rawFeedbackResponse = await criticResult.response.text();
        let criticism = extractAndParseJSON(rawFeedbackResponse);
        if (!validateCriticResponse(criticism)) throw new Error("Invalid criticism format");

        iterationHistory.push({
          ideas,
          feedback: criticism.feedback,
          score: criticism.overallScore,
          ratings: criticism.ratings,
        });

        const currentAverage = criticism.ratings.reduce((a: number, b: number) => a + b, 0) / criticism.ratings.length;
        const improvement = lastIterationScore ? (currentAverage - lastIterationScore) / lastIterationScore : 0;
        improvementThresholdMet = improvement >= IMPROVEMENT_THRESHOLD;
        lastIterationScore = currentAverage;

        finalIdeas = ideas.map((idea, index) => ({
          ...idea,
          rating: criticism.ratings[index] || 0,
          id: `bad-idea-${Date.now()}-${index}-iter-${iteration}`
        }));
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
        iterationHistory,
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