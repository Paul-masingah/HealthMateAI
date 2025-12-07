export interface SummaryCardData {
  medicines: string[];
  howToTake: string;
  warnings: string;
  interactions: string;
  avoid: string;
  whenToReturn: string;
  nextSteps: string;
}

export interface AnalysisResult {
  rawText: string;
  simplifiedExplanation: string;
  summaryCard: SummaryCardData;
  audioBase64?: string; // Base64 encoded audio string
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  GENERATING_AUDIO = 'GENERATING_AUDIO',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}