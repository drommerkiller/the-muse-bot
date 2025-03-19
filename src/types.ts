export interface Idea {
  id: string;
  title: string;
  description: string;
  rating: number;
}

export interface IterationData {
  ideas: Idea[];
  feedback: string;
  score: string;
  ratings: number[];
}

export interface Conversation {
  id: string;
  timestamp: number;
  prompt: string;
  enhancedPrompt: string;
  ideas: Idea[];
  feedback: string;
  iteration: number;
  // Debug info
  firstIterationResponse: string;
  firstIterationFeedback: string;
  bestScore: string;
  improvementThresholdMet: boolean;
  iterationHistory: IterationData[];
}