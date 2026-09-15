import { describe, expect, it } from 'vitest';
import { DemoRepository } from '@/data/demoRepository';

describe('isolated demo mode', () => {
  it('loads a populated discovery deck without Supabase', async () => {
    const repository = new DemoRepository();
    expect(await repository.listProfiles()).toHaveLength(20);
  });

  it('supports matching and local messaging', async () => {
    const repository = new DemoRepository();
    expect((await repository.like('demo-1')).matched).toBe(true);
    const match = (await repository.listConversations()).find(
      (item) => item.profileId === 'demo-1',
    );
    expect(match).toBeDefined();
    const message = await repository.sendMessage(match!.id, 'Ready to rehearse?');
    expect(message.senderId).toBe('me');
    expect(await repository.listMessages(match!.id)).toContainEqual(message);
  });
  it('supports the shortlist and populated band calls', async () => {
    const repository = new DemoRepository();
    await repository.saveProfileForLater('demo-1');
    expect((await repository.listSavedProfiles()).some((item) => item.id === 'demo-1')).toBe(true);
    expect(await repository.listBandCalls()).toHaveLength(3);
  });

  it('keeps shared rehearsal prep in the Band Room', async () => {
    const repository = new DemoRepository();
    const item = await repository.addCollaborationItem(
      'demo-chat-1',
      'task',
      'Bring spare instrument cables',
    );
    expect(await repository.listCollaborationItems('demo-chat-1')).toContainEqual(item);
    await repository.toggleCollaborationItem(item.id, true);
    expect(
      (await repository.listCollaborationItems('demo-chat-1')).find((entry) => entry.id === item.id)
        ?.completed,
    ).toBe(true);
    await repository.deleteCollaborationItem(item.id);
    expect(
      (await repository.listCollaborationItems('demo-chat-1')).some(
        (entry) => entry.id === item.id,
      ),
    ).toBe(false);
  });
});
