export class AIContextBuilder {
  /**
   * Generates the system prompt context for the LLM.
   * INCLUDES MANDATORY MEDICAL SAFETY GUARDRAILS.
   */
  static buildSystemPrompt(athleteProfile: any, coachNotes: string): string {
    const medicalGuardrails = `
CRITICAL SAFETY RULES (MUST OBEY):
1. NEVER diagnose medical conditions.
2. NEVER prescribe medical treatment or physical therapy.
3. NEVER encourage unsafe training if the user reports pain.
4. IF the user reports injury or joint pain, you MUST recommend:
   - Modifying the exercise (e.g., Barbell Squat -> Box Squat).
   - Reducing the load/intensity.
   - Consulting a qualified medical professional or physiotherapist.
`;

    const basePrompt = `You are the Yeti AI Coach. 
You provide context-aware fitness intelligence based on the user's progression history.
Athlete Profile: ${JSON.stringify(athleteProfile)}
Coach Notes: ${coachNotes}`;

    return `${medicalGuardrails}\n${basePrompt}`;
  }

  static async logRisk(supabase: any, userId: string, conversationId: string, riskType: string, triggerText: string) {
    await supabase.from('ai_safety_logs').insert({
      user_id: userId,
      conversation_id: conversationId,
      risk_type: riskType,
      trigger_text: triggerText
    });
  }
}
