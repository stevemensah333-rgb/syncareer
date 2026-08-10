import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CVData } from '@/features/cv-builder/types';
import { savePrimaryCV, classifySaveError, type CvSaveResult } from '@/features/cv-builder/persistence';

/**
 * Encapsulates the CV save lifecycle: session check (identity always comes from
 * the authenticated session, never a profile field), single in-flight guard,
 * persistence, and a stable-id capture. The component's unsaved editor state is
 * left untouched by this hook — it only reports success/failure.
 */
export function useCVPersistence() {
  const [isSaving, setIsSaving] = useState(false);
  const [savedResumeId, setSavedResumeId] = useState<string | null>(null);
  const savingRef = useRef(false);

  const save = useCallback(async (cv: CVData): Promise<CvSaveResult> => {
    // Guard against concurrent duplicate mutations even if the UI is bypassed.
    if (savingRef.current) {
      return {
        ok: false,
        category: 'server',
        code: 'CONCURRENT',
        userMessage: 'A save is already in progress.',
      };
    }
    savingRef.current = true;
    setIsSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        return {
          ok: false,
          category: 'auth-expired',
          code: 'NO_SESSION',
          userMessage: 'Please sign in to save your CV.',
        };
      }
      const result = await savePrimaryCV(supabase, session.user.id, cv);
      if (result.ok) setSavedResumeId(result.resumeId);
      return result;
    } catch (err) {
      return classifySaveError(err);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, []);

  return { isSaving, savedResumeId, save };
}
