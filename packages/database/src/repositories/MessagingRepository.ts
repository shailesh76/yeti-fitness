export class MessagingRepository {
  private db: any;
  private supabase?: any;

  constructor(db: any, supabase?: any) {
    this.db = db;
    this.supabase = supabase;
  }

  /**
   * Fetches or creates a direct conversation between a coach and an athlete.
   * Utilizes database unique constraints to guarantee a single conversation exists.
   */
  async getOrCreateDirectConversation(athleteId: string, coachId: string, title?: string): Promise<any> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in MessagingRepository');
    }

    // 1. Try to fetch existing direct conversation
    const { data: existing, error: fetchErr } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('coach_id', coachId)
      .maybeSingle();

    if (existing) {
      return existing;
    }

    // 2. Create new conversation if missing
    const { data: conversation, error: createErr } = await this.supabase
      .from('conversations')
      .insert({
        athlete_id: athleteId,
        coach_id: coachId,
        title: title || 'Direct Coach Chat'
      })
      .select()
      .single();

    if (createErr) {
      // Handle race condition: if created by another user simultaneously, fetch again
      if (createErr.code === '23505') { // unique violation
        const { data: retryData } = await this.supabase
          .from('conversations')
          .select('*')
          .eq('athlete_id', athleteId)
          .eq('coach_id', coachId)
          .single();
        return retryData;
      }
      throw createErr;
    }

    // 3. Add members to conversation_members
    const membersToInsert = [
      { conversation_id: conversation.id, user_id: athleteId },
      { conversation_id: conversation.id, user_id: coachId }
    ];

    const { error: membersErr } = await this.supabase
      .from('conversation_members')
      .insert(membersToInsert);

    if (membersErr) throw membersErr;

    return conversation;
  }

  /**
   * Retrieves messages for a specific conversation ordered chronologically.
   */
  async getMessages(conversationId: string): Promise<any[]> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in MessagingRepository');
    }

    const { data, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Sends a message into a conversation.
   * Accepts a client-generated UUID to support duplicate prevention on network retries.
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string,
    clientGeneratedId?: string
  ): Promise<any> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in MessagingRepository');
    }

    const payload: any = {
      conversation_id: conversationId,
      sender_id: senderId,
      content
    };

    if (clientGeneratedId) {
      payload.id = clientGeneratedId;
    }

    // Upsert to prevent duplicate message inserts on retry
    const { data, error } = await this.supabase
      .from('messages')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
