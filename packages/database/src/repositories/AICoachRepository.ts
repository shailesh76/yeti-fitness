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
    const body = { userId, conversationId, message, context, messageHistory };
    const invoke = () => this.supabase.functions.invoke('ai-coach', { body });

    let { data, error } = await invoke();

    // A 401 here is an AUTH failure, not an AI-provider failure — the edge
    // function rejects the request before ever touching a model. Root cause
    // (confirmed live, 2026-08-01): a locally-cached access token can look
    // unexpired by its own `exp` claim while its underlying session has
    // already been invalidated server-side (auth.getUser() -> GoTrue
    // "session_not_found") — a stale local token doesn't know its session is
    // gone. One recoverable path: refreshSession() mints a new access token
    // tied to a live session and the SAME request can simply be retried.
    if (error?.context?.status === 401) {
      try {
        const { data: refreshed, error: refreshError } = await this.supabase.auth.refreshSession();
        if (refreshed?.session && !refreshError) {
          ({ data, error } = await invoke());
        }
      } catch {
        // Refresh itself failed — fall through with the original 401, handled below.
      }
    }

    if (error) {
      if (error?.context?.status === 401) {
        // Unrecoverable: refresh didn't help (or wasn't possible). This is
        // never an AI failure — callers must show a distinct "session
        // expired, sign in again" message, not the generic AI-unavailable one.
        const authError: any = new Error('SESSION_EXPIRED');
        authError.isAuthError = true;
        throw authError;
      }
      let serverMessage: string | undefined;
      try {
        const errorBody = await (error as any)?.context?.json?.();
        serverMessage = errorBody?.error || errorBody?.message;
      } catch {
        // Body unavailable or consumed
      }
      if (serverMessage) throw new Error(serverMessage);
      throw error;
    }
    return data;
  }

  async confirmPlanEdit(proposalId: string): Promise<any> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in AICoachRepository');
    }
    const { data, error } = await this.supabase.functions.invoke('ai-coach', {
      body: { action: 'confirm_plan_edit', proposalId },
    });
    if (error) {
      let serverMessage: string | undefined;
      try {
        const errorBody = await (error as any)?.context?.json?.();
        serverMessage = errorBody?.error || errorBody?.message;
      } catch {}
      if (serverMessage) throw new Error(serverMessage);
      throw error;
    }
    return data;
  }

  async cancelPlanEdit(proposalId: string): Promise<any> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in AICoachRepository');
    }
    const { data, error } = await this.supabase.functions.invoke('ai-coach', {
      body: { action: 'cancel_plan_edit', proposalId },
    });
    if (error) {
      let serverMessage: string | undefined;
      try {
        const errorBody = await (error as any)?.context?.json?.();
        serverMessage = errorBody?.error || errorBody?.message;
      } catch {}
      if (serverMessage) throw new Error(serverMessage);
      throw error;
    }
    return data;
  }
}
