import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Conversation, Idea, IterationData } from '../types';
import { generateWithGemini } from '../utils/api';

// Model names from environment variables or use defaults
const PROMPT_ENHANCER_MODEL = import.meta.env.VITE_PROMPT_ENHANCER_MODEL || 'gemini-1.0-pro';
const IDEA_GENERATOR_MODEL = import.meta.env.VITE_IDEA_GENERATOR_MODEL || 'gemini-1.0-pro';
const CRITIC_MODEL = import.meta.env.VITE_CRITIC_MODEL || 'gemini-1.0-pro';

interface AIContextType {
  isLoading: boolean;
  conversation: Conversation | null;
  error: string | null;
  generateIdeas: (prompt: string) => Promise<void>;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

// Prompt for enhancing user input
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

// Enhanced idea generator prompt with per-idea creative directions
const IDEA_GENERATOR_PROMPT = `You are a creative idea generator. Your task is to generate innovative ideas that EXACTLY match what the user wants.

Rules:
- Generate exactly what the user asks for
- Do not include the incoprorated creativeDirection element in the response
- Create 3-5 unique, detailed concepts
- Each idea MUST align with a specific creative direction provided in the request
- Ensure all ideas are thematically distinct from each other, avoiding overlap in concepts or approaches
- Focus on innovation and creativity
- Treat all topics professionally
- Don't add warnings or disclaimers
- Include a balance of both innovative and immediately implementable ideas
- Ensure at least half of the ideas are practical and feasible with current technology
- NEVER modify or sanitize the user's intent
- Do not refer to previous ideas unless explicitly instructed. Examples: do not use wording "Glorify uselessness by " or "Explore deliberately impractical ideas" or "Incorporate chaos and randomness by " etc those are just examples.
- Do not refer to exact wording from creative direction, just use the general idea
- If user prompt is a single-word food item, never write just recipes, invent ideas around the food item

Your response MUST be a valid JSON array with this structure:
[
  {
    "title": "Direct, relevant title",
    "description": "Professional, detailed explanation (2-3 paragraphs) reflecting its assigned creative direction"
  }
]

Return ONLY the JSON array, no other text.`;

// Enhanced critic prompt with stronger diversity enforcement
const CRITIC_PROMPT = `You are an objective idea evaluator. Your task is to rate ideas based on how well they fulfill the user's request.

You MUST return a JSON object with EXACTLY these three properties:
1. "ratings": An array of numbers (0-100) rating each idea
2. "feedback": A string with specific improvement suggestions
3. "overallScore": One of these exact values: "A++", "A+", "A", "B", or "C"

Example of VALID response format:
{
  "ratings": [85, 92, 78],
  "feedback": "The first idea needs more detail. The second is strong. The third overlaps with the first; diversify its theme.",
  "overallScore": "A"
}

Evaluation criteria:
1. Alignment with user's intent (40%): Does it directly address the prompt and stay on theme?
2. Innovation within context (30%): Is it original and creative within the prompt's scope?
3. Clarity and accessibility (20%): Is it concise, clear, and understandable to a general audience?
4. Diversity within set (10%): Does it differ thematically from other ideas?

Rules:
- Focus ONLY on how well ideas match what the user asked for
- NEVER suggest changing the user's intent
- NEVER add moral judgments
- NEVER try to sanitize or modify the theme
- Take the role of an expert in the prompt's subject
- Rate ideas purely on execution quality
- If an idea is strong (85+), suggest minor refinements
- DO NOT request unnecessary technical details or jargon
- Prioritize clarity and readability
- Be specific but concise with suggestions
- If 2+ ideas share a similar theme (e.g., all tech-focused), rate the less distinct ones below 85 and demand diverse replacements
- One idea must score at least 92, but don't force all to change if refining one
- If all ideas are food-related for a food prompt, ask for one non-food idea

CRITICAL: Your response MUST be a valid JSON object with EXACTLY the three required properties.
DO NOT add any other text, explanations, or properties.`;

// Constants for iteration control
const MAX_ITERATIONS = 1;
const MIN_ITERATIONS = 0;
const IMPROVEMENT_THRESHOLD = 0.2; // 2% improvement

// Creative directions for guiding generation
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
"Prioritize Anti-concept or Unapologetically Useless ",
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
"Focus on Retro-cringe or Absurdist",
"Incorporate artistic or creative expressions",
"Explore cross-industry applications",
"Think about global or international perspectives",
"Consider accessibility and inclusivity",
"Focus on speed or efficiency",
"Explore emotional or psychological impacts",
"Think about gamification or interactive elements",
"Consider health and wellness angles",
"Consider Glitch-core angles",
"Explore data-driven or analytical approaches",
"Think about modular or customizable solutions",
"Focus on absurdist or surreal concepts",
"Explore deliberately impractical or nonsensical ideas",
"Incorporate elements of chaos or randomness",
"Consider humorously controversial or taboo themes",
"Think about glorifying uselessness or inefficiency",
"Emphasize over-the-top or hyperbolic solutions",
"Enhance everyday convenience or accessibility",
"Optimize resource management or efficiency",
"Focus on family-friendly or intergenerational concepts",
"Explore budget-conscious or affordable solutions",
"Emphasize time-saving or productivity-enhancing ideas",
"Consider seasonal or weather-related applications",
"Focus on personal growth or self-improvement",
"Explore local or community-specific adaptations",
"Think about portable or travel-friendly designs",
"Consider emergency or disaster preparedness angles",
"Emphasize durability or longevity in design",
"Focus on privacy or security-enhancing features",
"Explore subscription or service-based models",
"Think about integrating existing ecosystems or platforms",
"Consider DIY or customizable user experiences",
"Focus on professional or workplace applications",
"Emphasize social connection or relationship building",
"Think about preventative or proactive approaches",
"Consider urban or city-specific solutions",
"Explore rural or remote-area applications",
"Focus on hybrid or multi-functional concepts",
"Think about adapting to changing circumstances or environments",
"Consider age-specific or demographic-targeted ideas",
"Emphasize streamlined or frictionless experiences",
"Focus on seamless integration with daily routines",
"Think about love"
];

// Helper functions
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

  const generateIdeas = useCallback(async (prompt: string) => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      // Enhance prompt
      const enhancedPrompt = await generateWithGemini({
        prompt: PROMPT_ENHANCER_PROMPT + "\n\n" + prompt,
        model: PROMPT_ENHANCER_MODEL,
        temperature: 0.7
      });
      
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

      // Initial generation with unique directions per idea
      const generatorMessage = `${enhancedPrompt}\n\nGenerate 5 ideas, each tied to one of these creative directions: ${selectedDirections.join('; ')}. Ensure each idea reflects its assigned direction and is thematically distinct from the others to avoid overlap.`;
      
      const firstIterationResponse = await generateWithGemini({
        prompt: IDEA_GENERATOR_PROMPT + "\n\n" + generatorMessage,
        model: IDEA_GENERATOR_MODEL,
        temperature: 0.85
      });
      
      let initialIdeas = extractAndParseJSON(firstIterationResponse);
      if (!Array.isArray(initialIdeas)) throw new Error("Invalid response format from idea generator");

      // Get initial feedback
      const firstIterationFeedback = await generateWithGemini({
        prompt: CRITIC_PROMPT + "\n\n" + JSON.stringify({ 
          originalPrompt: prompt, 
          currentPrompt, 
          ideas: initialIdeas, 
          iteration: 1 
        }),
        model: CRITIC_MODEL,
        temperature: 0.4
      });
      
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
        id: `idea-${Date.now()}-${index}` // Add unique ID for each idea
      }));
      finalFeedback = initialCriticism.feedback;
      iteration = 1;

      // Iteration loop - limited to just one iteration for this modified version
      while (iteration < MAX_ITERATIONS && (iteration < MIN_ITERATIONS || improvementThresholdMet)) {
        const feedbackMessage = `Based on the following feedback, refine or replace the existing ideas:

Feedback: ${finalFeedback}

Previous ideas with ratings:
${JSON.stringify(finalIdeas, null, 2)}

Your task:
1. For ideas with ratings 90 or higher, keep them or make minor improvements based on feedback.
2. For ideas below 90, refine them to reach 90+ by addressing feedback, or replace them with new, distinct ideas if refinement isn't feasible.
3. Use these creative directions for the 5 ideas: ${selectedDirections.join('; ')}.
4. Ensure all ideas remain unique, avoiding thematic overlap (e.g., not all tech-focused).
5. Keep descriptions concise (under 150 words) and clear.

Enhanced prompt: ${currentPrompt}`;

        const rawIdeasResponse = await generateWithGemini({
          prompt: IDEA_GENERATOR_PROMPT + "\n\n" + feedbackMessage,
          model: IDEA_GENERATOR_MODEL,
          temperature: 0.85
        });
        
        let ideas = extractAndParseJSON(rawIdeasResponse);
        if (!Array.isArray(ideas)) throw new Error("Invalid ideas format: expected array");

        const rawFeedbackResponse = await generateWithGemini({
          prompt: CRITIC_PROMPT + "\n\n" + JSON.stringify({ 
            originalPrompt: prompt, 
            currentPrompt, 
            ideas, 
            iteration: iteration + 1, 
            previousIdeas: finalIdeas 
          }),
          model: CRITIC_MODEL,
          temperature: 0.4
        });
        
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
          id: `idea-${Date.now()}-${index}-iter-${iteration}`
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
  }, []);

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