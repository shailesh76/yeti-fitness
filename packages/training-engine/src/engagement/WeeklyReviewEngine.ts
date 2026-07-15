export interface WeeklyReviewData {
  athleteName: string;
  weekNumber: number;
  workoutsCompleted: number;
  workoutsAssigned: number;
  strengthDeltas: { lift: string; improvement: string }[];
  sleepAverage: number;
  nutritionAdherence: number;
}

export interface WeeklyReviewPromptPayload {
  systemPrompt: string;
  userPrompt: string;
}

export class WeeklyReviewEngine {
  /**
   * Generates a structured string format for the Coach Review Dashboard
   * containing Training, Strength, Recovery, and Nutrition data.
   */
  static generateReviewData(data: WeeklyReviewData): string {
    const trainingStatus = data.workoutsCompleted >= data.workoutsAssigned 
      ? '🟢' 
      : (data.workoutsCompleted > 0 ? '🟡' : '🔴');

    const strengthStr = data.strengthDeltas.map(d => `↑ ${d.lift} ${d.improvement}`).join('\n');

    return `
Athlete: ${data.athleteName}
Week: ${data.weekNumber}

[Training]
Status: ${trainingStatus}
Completed: ${data.workoutsCompleted}/${data.workoutsAssigned}

[Strength]
${strengthStr || 'No notable strength changes this week.'}

[Recovery]
Sleep Average: ${data.sleepAverage}h

[Nutrition]
Adherence: ${data.nutritionAdherence}%
`.trim();
  }

  /**
   * Generates the prompt payload to send to the AI service
   * in order to get an actionable coach recommendation.
   */
  static generatePromptPayload(data: WeeklyReviewData): WeeklyReviewPromptPayload {
    const reviewDataStr = this.generateReviewData(data);
    
    const systemPrompt = `You are an expert fitness coach for the Yeti app. 
Analyze the provided weekly review data for the athlete.
Generate a short, actionable recommendation (max 2 sentences) for the athlete's training, nutrition, or recovery next week.
Do not use conversational filler, just the actionable instruction.`;

    const userPrompt = `Weekly Data:\n${reviewDataStr}\n\nProvide the actionable recommendation.`;

    return {
      systemPrompt,
      userPrompt
    };
  }
}
