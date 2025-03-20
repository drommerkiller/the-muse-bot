import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Conversation, Idea, IterationData } from '../types';
import { getSecureApiKey } from '../utils/api';

// Model names from environment variables
const PROMPT_ENHANCER_MODEL = import.meta.env.VITE_PROMPT_ENHANCER_MODEL;
const IDEA_GENERATOR_MODEL = import.meta.env.VITE_BAD_IDEA_GENERATOR_MODEL;

interface AIContextType {
  isLoading: boolean;
  conversation: Conversation | null;
  error: string | null;
  generateIdeas: (prompt: string) => Promise<void>;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

// Prompt for enhancing user input for humorously bad ideas
const PROMPT_ENHANCER_PROMPT = `You are an "entertainingly bad" idea generation assistant. Your task is to take any input and transform it into a prompt for generating funny, quirky, or mildly impractical ideas that are entertaining but not completely nonsensical.

Examples:
Input: "coffee"
Output: "Generate funny and slightly impractical ideas involving coffee"
Input: "cats sleeping"
Output: "Create entertaining but questionable ideas centered around cats and sleep"
Input: "red"
Output: "Develop amusingly imperfect concepts using the color red"

Rules:
- Frame the prompt as a request for generating entertaining but flawed ideas
- Keep a balance between creativity and mild impracticality
- Maintain the original subject matter
- Ideas should be funny but still somewhat connected to reality
- Don't make it too random or completely nonsensical

Return ONLY the enhanced prompt, nothing else.`;

// Enhanced idea generator prompt for humorously bad ideas
const IDEA_GENERATOR_PROMPT = `You are a generator of "entertainingly bad" ideas. Your task is to generate ideas that are funny, quirky, or slightly impractical while still being somewhat plausible and entertaining.

Rules:
- Generate ideas related to what the user asks for, but with a humorous twist or flaw
- Create 5 unique concepts with varying types of "bad" qualities:
  * Some should be mildly impractical but funny
  * Some should be amusingly over-engineered
  * Some should be "so bad they're good" type ideas
  * Some should have a satirical or tongue-in-cheek quality
- Each idea should be entertaining but not pure nonsense
- Include ideas that people might actually try despite their flaws
- Keep a balance between humor and connection to reality
- Don't add warnings or disclaimers
- If user prompt is a single-word food item, include at least one non-food idea

Your response MUST be a valid JSON array with this structure:
[
  {
    "title": "Catchy, slightly silly title",
    "description": "Entertaining explanation (2-3 paragraphs) that acknowledges the idea's flaws while making it sound appealing"
  }
]

Return ONLY the JSON array, no other text.`;

// Creative directions for guiding entertainingly bad idea generation
const creativeDirections = [
  "Solve a simple problem in the most convoluted way possible",
  "Create something that's trying way too hard to be trendy",
  "Design a product that has one amazing feature but one deal-breaking flaw",
  "Make something oddly specific to an incredibly niche audience",
  "Create a solution that works but has amusing side effects",
  "Design something that's a parody of modern tech trends",
  "Take a good idea but implement it in the wrong context",
  "Create something with hilariously misplaced priorities",
  "Design a product that solves problems nobody actually has",
  "Make something that's just slightly too inconvenient to be practical",
  "Create an idea that takes itself far too seriously",
  "Design something that would only make sense in a specific decade",
  "Create a product with weirdly specific restrictions on when it can be used",
  "Make something that combines two concepts that shouldn't go together",
  "Design a solution that's technically correct but socially awkward",
  "Create something that would be described as 'technically brilliant but practically useless'",
  "Make a product that's an obvious solution to the wrong problem",
  "Create an idea that's just a little too honest about its limitations",
  "Design something with aesthetics that completely overshadow functionality",
  "Create a business model with one obviously fatal flaw",
  "Make something that's clearly a solution looking for a problem",
  "Create a product that would only appeal to a very specific personality type",
  "Design something that's intentionally over-engineered to seem impressive",
  "Create an idea that feels like it's from a parallel universe",
  "Make a product that's amusingly behind or ahead of its time",
  "Design something that misunderstands its own purpose in a funny way",
  "Create a solution that works but for completely wrong reasons",
  "Make something that seems clever until you think about it for five seconds",
  "Design a product with a marketing angle that completely misses the point",
  "Create an idea that's accidentally brilliant despite its flawed premise",
  "Make something that's wildly inefficient but oddly satisfying",
  "Create a product that solves a problem by creating an equally annoying one",
  "Design something that's clearly trying to cash in on an unrelated trend",
  "Make an idea that could only have been conceived at 3 AM",
  "Create a solution that grossly overestimates people's patience",
  "Design a product with features nobody asked for",
  "Create something that's painfully earnest about a silly concept",
  "Make an idea that would only work in ideal conditions that never exist",
  "Design a solution that completely misunderstands human behavior",
  "Create something that's one small change away from being actually good",
  "Make a product that awkwardly combines analog and digital elements",
  "Create an idea that's clearly just a rebrand of an existing failure",
  "Design something that unnecessarily uses app connectivity",
  "Make a solution that requires an implausible level of user commitment",
  "Create a product that's just a regular item with an unnecessary twist",
  "Design something that misunderstands its target audience",
  "Create an idea that would make sense if one crucial fact about the world were different",
  "Make something with a comically mismatched form and function",
  "Design a product with bizarre ergonomics justified by 'science'"
];

// Helper function to extract JSON from response text
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
      // Enhance prompt for entertainingly bad ideas
      const enhancerModel = genAI.getGenerativeModel({ model: PROMPT_ENHANCER_MODEL });
      const enhancerChat = enhancerModel.startChat({ history: [{ role: "user", parts: [PROMPT_ENHANCER_PROMPT] }] });
      const enhancerResult = await enhancerChat.sendMessage(prompt);
      const enhancedPrompt = await enhancerResult.response.text();
      if (!enhancedPrompt) throw new Error("Failed to enhance the prompt");

      // Select 5 unique creative directions for this run
      const selectedDirections = [...creativeDirections]
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);

      // Configure generator model
      const generatorModel = genAI.getGenerativeModel({
        model: IDEA_GENERATOR_MODEL,
        generationConfig: {
          temperature: 0.85, // Balanced temperature for creative but not random ideas
          topP: 0.9,
          maxOutputTokens: 3000,
        },
      });

      // Generate ideas with creative directions
      const generatorMessage = `${enhancedPrompt}\n\nGenerate 5 entertainingly flawed ideas, each tied to one of these creative directions: ${selectedDirections.join('; ')}. Ensure each idea has a different type of amusing flaw or quirk, making them entertaining but not completely nonsensical.`;
      const initialGeneratorChat = generatorModel.startChat({ history: [{ role: "user", parts: [IDEA_GENERATOR_PROMPT] }] });
      const initialIdeasResult = await initialGeneratorChat.sendMessage(generatorMessage);
      const firstIterationResponse = await initialIdeasResult.response.text();
      let ideas = extractAndParseJSON(firstIterationResponse);
      
      if (!Array.isArray(ideas)) throw new Error("Invalid response format from idea generator");

      // Add unique IDs to each idea - no ratings since we're skipping the critic
      const finalIdeas = ideas.map((idea: any, index: number) => ({
        ...idea,
        id: `bad-idea-${Date.now()}-${index}`
      }));

      // Set conversation state with minimal required fields
      setConversation({
        id: Date.now().toString(),
        timestamp: Date.now(),
        prompt,
        enhancedPrompt,
        ideas: finalIdeas,
        feedback: "", // No feedback since we skip the critic
        iteration: 1,
        firstIterationResponse,
        firstIterationFeedback: "",
        bestScore: "N/A",
        improvementThresholdMet: false,
        iterationHistory: [{
          ideas, 
          feedback: "",
          score: "N/A",
          ratings: []
        }],
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