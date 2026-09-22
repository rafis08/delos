import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { supportTicketSchema } from '@/domain/validation';

const migration = readFileSync(resolve('supabase/migrations/202609220019_support_safety_privacy.sql'),'utf8');
const exportFunction = readFileSync(resolve('supabase/functions/export-account-data/index.ts'),'utf8');

describe('support and safety beta controls', () => {
  it('validates useful, bounded support requests', () => {
    expect(supportTicketSchema.safeParse({ category: 'Technical', subject: 'Audio upload failed', description: 'The upload stops after I select a valid audio file.', includeDiagnostics: true }).success).toBe(true);
    expect(supportTicketSchema.safeParse({ category: 'Technical', subject: 'Help', description: 'Too short', includeDiagnostics: true }).success).toBe(false);
  });

  it('keeps tickets private and rate limited', () => {
    expect(migration).toContain('members read own support tickets');
    expect(migration).toContain("created_at > now()-interval '1 hour'");
    expect(migration).toContain('jsonb_object_keys');
  });

  it('records moderation actions and restricts sanctions to staff', () => {
    expect(migration).toContain('create table if not exists public.moderation_actions');
    expect(migration).toContain("role in ('moderator','admin')");
    expect(migration).toContain("account_status='suspended'");
  });

  it('requires authentication for exports and omits reports made about the user', () => {
    expect(exportFunction).toContain("request.headers.get('Authorization')");
    expect(exportFunction).toContain("reportsSubmitted: await one('reports','reporter_id')");
    expect(exportFunction).not.toContain("one('reports','reported_id')");
  });
});
