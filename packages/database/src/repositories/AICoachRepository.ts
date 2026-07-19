import { Database, Q } from '@nozbe/watermelondb';
import { AIMessage } from '../models/AIMessage';
import { AIConversation } from '../models/AIConversation';

export class AICoachRepository {
  private db: Database;
  private supabase?: any;

  constructor(db: Database, supabase?: any) {
    this.db = db;
    this.supabase = supabase;
  }

  /**
   * Guards local WatermelonDB access. The native SQLite adapter is unavailable on
   * web, where `db` is null — fail with a clear, catchable error instead of a
   * cryptic "Cannot read properties of null" crash.
   */
  private requireDb(): Database {
    if (!this.db) {
      throw new Error('LOCAL_DB_UNAVAILABLE: local database is not available on this platform');
    }
    return this.db;
  }

  // --- Local Operations ---

  async saveMessageLocal(conversationId: string, role: string, content: string): Promise<AIMessage> {
    this.requireDb();
    return this.db.write(async () => {
      return this.db.get<AIMessage>('ai_messages').create(msg => {
        msg.conversation_id = conversationId;
        msg.role = role;
        msg.content = content;
        msg.is_synced = false;
      });
    });
  }

  async getMessagesLocal(conversationId: string): Promise<AIMessage[]> {
    this.requireDb();
    return this.db.get<AIMessage>('ai_messages')
      .query(Q.where('conversation_id', conversationId), Q.sortBy('created_at', Q.asc))
      .fetch();
  }

  async getOrCreateConversation(userId: string, title: string = 'New Conversation'): Promise<AIConversation> {
    this.requireDb();
    const existing = await this.db.get<AIConversation>('ai_conversations')
      .query(Q.where('athlete_id', userId))
      .fetch();
    
    if (existing.length > 0) {
      return existing[0];
    }

    return this.db.write(async () => {
      return this.db.get<AIConversation>('ai_conversations').create(conv => {
        conv.athlete_id = userId;
        conv.title = title;
      });
    });
  }

  // --- Remote Operations ---

  async sendMessageRemote(
    userId: string,
    conversationId: string,
    message: string,
    context: any,
    messageHistory: Array<{ role: string; content: string }>
  ): Promise<any> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in AICoachRepository');
    }
    const { data, error } = await this.supabase.functions.invoke('ai-coach', {
      body: {
        userId,
        conversationId,
        message,
        context,
        messageHistory
      }
    });
    if (error) throw error;
    return data;
  }
}
