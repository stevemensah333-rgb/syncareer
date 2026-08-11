import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CVData } from '@/features/cv-builder/types';
import {
  classifySaveError,
  logCvPersistenceFailure,
  savePrimaryCV,
  type CvSaveResult,
} from '@/features/cv-builder/persistence';

/**
 * Authenticates at save time, coalesces repeated clicks into one request, and
 * remembers the stable row id so subsequent saves use the update path. Editor
 * state remains owned by the page and is never cleared on failure.
 */
export function useCVPersistence() {
  const [isSaving, setIsSaving] = useState(false);
  const [savedResumeId, setSavedResumeId] = useState<string | null>(null);
  const savedResumeIdRef = useRef<string | null>(null);
  const inFlightRef = useRef<Promise<CvSaveResult> | null>(null);

  const rememberResumeId = useCallback((resumeId: string | null) => {
    savedResumeIdRef.current = resumeId;
    setSavedResumeId(resumeId);
  }, []);

  const save = useCallback((cv: CVData): Promise<CvSaveResult> => {
    // Return the same promise: repeated clicks observe the confirmed outcome
    // without issuing another authentication check or database mutation.
    if (inFlightRef.current) return inFlightRef.current;

    setIsSaving(true);
    const request = (async (): Promise<CvSaveResult> => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) return classifySaveError(error);
        if (!data.session?.user?.id) {
          return classifySaveError({ code: 'NO_SESSION', message: 'No authenticated session' });
        }

        const result = await savePrimaryCV(supabase, data.session.user.id, cv, {
          resumeId: savedResumeIdRef.current,
        });
        if (result.ok) rememberResumeId(result.resumeId);
        return result;
      } catch (error) {
        return classifySaveError(error);
      }
    })();

    inFlightRef.current = request;
    void request.then((result) => {
      if (!result.ok && result.category !== 'validation') {
        logCvPersistenceFailure('save', result);
      }
    }).finally(() => {
      inFlightRef.current = null;
      setIsSaving(false);
    });
    return request;
  }, [rememberResumeId]);

  return { isSaving, savedResumeId, rememberResumeId, save };
}
