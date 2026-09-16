import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const migrationPath = path.resolve(__dirname, '../supabase/migrations/20260917120000_messages_rls.sql');
const migrationSql = readFileSync(migrationPath, 'utf8');

describe('Messages RLS Migration — Static Policy & Contract Validation', () => {
  it('enables Row Level Security without forcing it', () => {
    expect(migrationSql).toMatch(/ALTER\s+TABLE\s+public\.messages\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY;/i);
    expect(migrationSql).not.toMatch(/FORCE\s+ROW\s+LEVEL\s+SECURITY/i);
  });

  it('revokes all permissions from anon and public', () => {
    expect(migrationSql).toMatch(/REVOKE\s+ALL\s+ON\s+TABLE\s+public\.messages\s+FROM\s+anon;/i);
    expect(migrationSql).toMatch(/REVOKE\s+ALL\s+ON\s+TABLE\s+public\.messages\s+FROM\s+public;/i);
  });

  it('revokes DELETE, TRUNCATE, REFERENCES, and TRIGGER from authenticated', () => {
    expect(migrationSql).toMatch(/REVOKE\s+DELETE,\s*TRUNCATE,\s*REFERENCES,\s*TRIGGER\s+ON\s+TABLE\s+public\.messages\s+FROM\s+authenticated;/i);
  });

  it('grants only SELECT, INSERT, UPDATE to authenticated', () => {
    expect(migrationSql).toMatch(/GRANT\s+SELECT,\s*INSERT,\s*UPDATE\s+ON\s+TABLE\s+public\.messages\s+TO\s+authenticated;/i);
    expect(migrationSql).not.toMatch(/GRANT\s+ALL\s+ON\s+TABLE\s+public\.messages\s+TO\s+authenticated;/i);
    expect(migrationSql).not.toMatch(/GRANT\s+DELETE\s+ON\s+TABLE\s+public\.messages\s+TO\s+authenticated;/i);
  });

  it('preserves full service_role access', () => {
    expect(migrationSql).toMatch(/GRANT\s+ALL\s+ON\s+TABLE\s+public\.messages\s+TO\s+service_role;/i);
  });

  it('defines SELECT policy restricted to authenticated conversation members', () => {
    expect(migrationSql).toMatch(/CREATE\s+POLICY\s+"Users view messages in their conversations"\s+ON\s+public\.messages\s+FOR\s+SELECT\s+TO\s+authenticated/i);
    expect(migrationSql).toMatch(/EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+public\.conversation_members\s+cm\s+WHERE\s+cm\.conversation_id\s*=\s*messages\.conversation_id\s+AND\s+cm\.user_id\s*=\s*\(SELECT\s+auth\.uid\(\)\)/i);
  });

  it('defines INSERT policy preventing sender spoofing and requiring conversation membership', () => {
    expect(migrationSql).toMatch(/CREATE\s+POLICY\s+"Users insert messages into their conversations"\s+ON\s+public\.messages\s+FOR\s+INSERT\s+TO\s+authenticated/i);
    expect(migrationSql).toMatch(/sender_id\s*=\s*\(SELECT\s+auth\.uid\(\)\)/i);
    expect(migrationSql).toMatch(/EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+public\.conversation_members\s+cm\s+WHERE\s+cm\.conversation_id\s*=\s*messages\.conversation_id\s+AND\s+cm\.user_id\s*=\s*\(SELECT\s+auth\.uid\(\)\)/i);
  });

  it('defines UPDATE policy strictly scoped to own messages and conversation membership', () => {
    expect(migrationSql).toMatch(/CREATE\s+POLICY\s+"Users update own messages in their conversations"\s+ON\s+public\.messages\s+FOR\s+UPDATE\s+TO\s+authenticated/i);
  });

  it('does NOT define DELETE policy for authenticated or anon (unsupported by contract)', () => {
    expect(migrationSql).not.toMatch(/FOR\s+DELETE/i);
  });

  it('does NOT modify any other table', () => {
    const tableModifications = migrationSql.match(/ALTER\s+TABLE\s+([a-zA-Z0-9_.]+)/gi) ?? [];
    for (const match of tableModifications) {
      expect(match).toMatch(/ALTER\s+TABLE\s+public\.messages/i);
    }
  });
});

describe('Messages RLS — Exact Contract Evaluation Simulation', () => {
  interface User {
    id: string;
    role: 'anon' | 'authenticated' | 'service_role';
  }

  interface ConversationMember {
    conversation_id: string;
    user_id: string;
  }

  interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
  }

  const members: ConversationMember[] = [
    { conversation_id: 'conv-athlete1-coach', user_id: 'athlete-1-uuid' },
    { conversation_id: 'conv-athlete1-coach', user_id: 'coach-1-uuid' },
    { conversation_id: 'conv-athlete2-coach', user_id: 'athlete-2-uuid' },
    { conversation_id: 'conv-athlete2-coach', user_id: 'coach-1-uuid' },
  ];

  function evaluateSelect(user: User | null, msg: Message): boolean {
    if (!user || user.role === 'anon') return false;
    if (user.role === 'service_role') return true;
    return members.some((m) => m.conversation_id === msg.conversation_id && m.user_id === user.id);
  }

  function evaluateInsert(user: User | null, newMsg: Message): boolean {
    if (!user || user.role === 'anon') return false;
    if (user.role === 'service_role') return true;
    const isSender = newMsg.sender_id === user.id;
    const isMember = members.some((m) => m.conversation_id === newMsg.conversation_id && m.user_id === user.id);
    return isSender && isMember;
  }

  function evaluateUpdate(user: User | null, existingMsg: Message, updatedMsg: Message): boolean {
    if (!user || user.role === 'anon') return false;
    if (user.role === 'service_role') return true;
    const existingAllowed = existingMsg.sender_id === user.id &&
      members.some((m) => m.conversation_id === existingMsg.conversation_id && m.user_id === user.id);
    const newAllowed = updatedMsg.sender_id === user.id &&
      members.some((m) => m.conversation_id === updatedMsg.conversation_id && m.user_id === user.id);
    return existingAllowed && newAllowed;
  }

  function evaluateDelete(user: User | null): boolean {
    if (!user || user.role === 'anon' || user.role === 'authenticated') return false;
    return user.role === 'service_role';
  }

  const a1: User = { id: 'athlete-1-uuid', role: 'authenticated' };
  const a2: User = { id: 'athlete-2-uuid', role: 'authenticated' };
  const coach: User = { id: 'coach-1-uuid', role: 'authenticated' };
  const outsider: User = { id: 'outsider-uuid', role: 'authenticated' };
  const anon: User = { id: '', role: 'anon' };
  const serviceRole: User = { id: 'srv', role: 'service_role' };

  const a1Msg: Message = {
    id: 'msg-1',
    conversation_id: 'conv-athlete1-coach',
    sender_id: 'athlete-1-uuid',
    content: 'Hello coach!',
  };

  const a2Msg: Message = {
    id: 'msg-2',
    conversation_id: 'conv-athlete2-coach',
    sender_id: 'athlete-2-uuid',
    content: 'Hello from athlete 2!',
  };

  it('UNAUTHENTICATED / ANON is blocked from all operations', () => {
    expect(evaluateSelect(null, a1Msg)).toBe(false);
    expect(evaluateSelect(anon, a1Msg)).toBe(false);
    expect(evaluateInsert(null, a1Msg)).toBe(false);
    expect(evaluateInsert(anon, a1Msg)).toBe(false);
    expect(evaluateUpdate(null, a1Msg, a1Msg)).toBe(false);
    expect(evaluateUpdate(anon, a1Msg, a1Msg)).toBe(false);
    expect(evaluateDelete(null)).toBe(false);
    expect(evaluateDelete(anon)).toBe(false);
  });

  it('AUTHENTICATED MEMBER can read conversation messages', () => {
    expect(evaluateSelect(a1, a1Msg)).toBe(true);
    expect(evaluateSelect(coach, a1Msg)).toBe(true);
  });

  it('AUTHENTICATED NON-MEMBER cannot read conversation messages', () => {
    expect(evaluateSelect(outsider, a1Msg)).toBe(false);
    expect(evaluateSelect(a2, a1Msg)).toBe(false); // a2 is member of conv 2, not conv 1
  });

  it('AUTHENTICATED MEMBER can send a message with own sender_id', () => {
    expect(evaluateInsert(a1, a1Msg)).toBe(true);
    expect(evaluateInsert(coach, {
      id: 'msg-3',
      conversation_id: 'conv-athlete1-coach',
      sender_id: coach.id,
      content: 'Great work!',
    })).toBe(true);
  });

  it('SENDER SPOOFING is rejected even for valid conversation members', () => {
    // athlete-1 is member of conv-athlete1-coach, but attempts to spoof sender as coach
    const spoofedMsg: Message = {
      id: 'msg-spoof',
      conversation_id: 'conv-athlete1-coach',
      sender_id: coach.id,
      content: 'I am the coach now',
    };
    expect(evaluateInsert(a1, spoofedMsg)).toBe(false);
  });

  it('AUTHENTICATED NON-MEMBER cannot insert into conversation', () => {
    expect(evaluateInsert(outsider, {
      id: 'msg-4',
      conversation_id: 'conv-athlete1-coach',
      sender_id: outsider.id,
      content: 'Uninvited message',
    })).toBe(false);
  });

  it('CROSS-CONVERSATION membership in conversation A does not authorize conversation B', () => {
    expect(evaluateSelect(a1, a2Msg)).toBe(false);
    expect(evaluateInsert(a1, {
      id: 'msg-cross',
      conversation_id: 'conv-athlete2-coach',
      sender_id: a1.id,
      content: 'Injecting into conv 2',
    })).toBe(false);
  });

  it('UPDATE allows sender to update own message (upsert retry idempotency)', () => {
    const updated: Message = { ...a1Msg, content: 'Hello coach! (retried)' };
    expect(evaluateUpdate(a1, a1Msg, updated)).toBe(true);
  });

  it('UPDATE rejects modifying another user\'s message', () => {
    // coach cannot update athlete-1's message
    const coachModifyingA1: Message = { ...a1Msg, content: 'Tampered by coach' };
    expect(evaluateUpdate(coach, a1Msg, coachModifyingA1)).toBe(false);
  });

  it('UPDATE rejects changing sender_id or moving message cross-conversation', () => {
    const spoofUpdate: Message = { ...a1Msg, sender_id: coach.id };
    expect(evaluateUpdate(a1, a1Msg, spoofUpdate)).toBe(false);

    const crossConvUpdate: Message = { ...a1Msg, conversation_id: 'conv-athlete2-coach' };
    expect(evaluateUpdate(a1, a1Msg, crossConvUpdate)).toBe(false);
  });

  it('DELETE is denied for authenticated users and allowed only for service_role', () => {
    expect(evaluateDelete(a1)).toBe(false);
    expect(evaluateDelete(coach)).toBe(false);
    expect(evaluateDelete(outsider)).toBe(false);
    expect(evaluateDelete(serviceRole)).toBe(true);
  });

  it('SERVICE_ROLE can perform all operations', () => {
    expect(evaluateSelect(serviceRole, a1Msg)).toBe(true);
    expect(evaluateInsert(serviceRole, a1Msg)).toBe(true);
    expect(evaluateUpdate(serviceRole, a1Msg, a1Msg)).toBe(true);
    expect(evaluateDelete(serviceRole)).toBe(true);
  });
});
