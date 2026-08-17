import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { AssistantRequestError, requestContextualAssistance } from './contract';

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('contextual assistant v2 contract', () => {
  beforeEach(() => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { access_token: 'test-token' } }, error: null } as never);
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001');
  });

  it('sends only selected context and no implicit profile or chat history', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ version: 2, requestId: '00000000-0000-4000-8000-000000000001', proposal: { kind: 'explanation', text: 'A bounded explanation', sourceContextIds: ['role'] }, usage: { consumed: true, used: 1, limit: 5 } }));
    vi.stubGlobal('fetch', fetchMock);
    await requestContextualAssistance('opportunity.explain_requirement', 'Explain this', [{ id: 'role', label: 'Graduate Analyst', provenance: 'opportunity', content: 'Graduate Analyst' }]);
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body).toEqual({ version: 2, requestId: '00000000-0000-4000-8000-000000000001', task: 'opportunity.explain_requirement', instruction: 'Explain this', context: [{ id: 'role', label: 'Graduate Analyst', provenance: 'opportunity', content: 'Graduate Analyst' }] });
    expect(body.userContext).toBeUndefined();
    expect(body.messages).toBeUndefined();
  });

  it('accepts an unlimited quota (limit -1) as a valid response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ version: 2, requestId: '00000000-0000-4000-8000-000000000001', proposal: { kind: 'rewrite', text: 'Improved bullet', sourceContextIds: ['bullet'] }, usage: { consumed: true, used: 0, limit: -1 } })));
    await expect(requestContextualAssistance('cv.rewrite_bullet', 'Rewrite', [{ id: 'bullet', label: 'Selected CV bullet', provenance: 'selected_cv_text', content: 'Built a tool' }])).resolves.toMatchObject({ text: 'Improved bullet' });
  });

  it.each([[401, 'unauthorized'], [402, 'quota'], [429, 'rate-limit']])('maps HTTP %s to %s', async (status, code) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({}, status as number)));
    await expect(requestContextualAssistance('cv.rewrite_bullet', 'Rewrite', [{ id: 'bullet', label: 'Selected CV bullet', provenance: 'selected_cv_text', content: 'Built a tool' }])).rejects.toMatchObject({ code });
  });

  it('passes the abort signal to fetch and maps cancellation to a cancelled error', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      expect(init.signal).toBe(controller.signal);
      return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'));
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      requestContextualAssistance('cv.rewrite_bullet', 'Rewrite', [{ id: 'bullet', label: 'Selected CV bullet', provenance: 'selected_cv_text', content: 'Built a tool' }], controller.signal),
    ).rejects.toMatchObject({ code: 'cancelled' });
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    controller.abort();
    await expect(
      requestContextualAssistance('cv.rewrite_bullet', 'Rewrite', [{ id: 'bullet', label: 'Selected CV bullet', provenance: 'selected_cv_text', content: 'Built a tool' }], controller.signal),
    ).rejects.toMatchObject({ code: 'cancelled' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('drops a response that arrives after the caller aborted', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockImplementation(async () => {
      controller.abort();
      return response({ version: 2, requestId: '00000000-0000-4000-8000-000000000001', proposal: { kind: 'explanation', text: 'Stale', sourceContextIds: ['bullet'] }, usage: { consumed: true, used: 1, limit: 5 } });
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      requestContextualAssistance('cv.rewrite_bullet', 'Rewrite', [{ id: 'bullet', label: 'Selected CV bullet', provenance: 'selected_cv_text', content: 'Built a tool' }], controller.signal),
    ).rejects.toMatchObject({ code: 'cancelled' });
  });

  it('rejects malformed, empty and context-inventing output', async () => {
    for (const payload of [
      { version: 2, requestId: '00000000-0000-4000-8000-000000000001', proposal: null, usage: { consumed: false, used: 0, limit: 5 } },
      { version: 2, requestId: '00000000-0000-4000-8000-000000000001', proposal: { kind: 'rewrite', text: '', sourceContextIds: [] }, usage: { consumed: true, used: 1, limit: 5 } },
      { version: 2, requestId: '00000000-0000-4000-8000-000000000001', proposal: { kind: 'rewrite', text: 'Invented', sourceContextIds: ['hidden-profile'] }, usage: { consumed: true, used: 1, limit: 5 } },
    ]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(payload)));
      await expect(requestContextualAssistance('cv.rewrite_bullet', 'Rewrite', [{ id: 'bullet', label: 'Selected CV bullet', provenance: 'selected_cv_text', content: 'Built a tool' }])).rejects.toBeInstanceOf(AssistantRequestError);
    }
  });
});
