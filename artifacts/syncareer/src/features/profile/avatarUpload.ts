import { supabase } from '@/integrations/supabase/client';

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Stores a profile photo. Mentors are shown from `counsellor_details`, so their
 * photo has to be written there as well as on the profile record.
 */
export async function uploadAvatar(
  userId: string,
  file: File,
  options: { isMentor: boolean },
): Promise<string> {
  if (file.size > AVATAR_MAX_BYTES) throw new Error('Choose an image under 2 MB.');

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const upload = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (upload.error) throw new Error('Your photo could not be uploaded. Try again.');

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const publicUrl = data.publicUrl;

  const profileUpdate = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
  if (profileUpdate.error) throw new Error('Your photo could not be saved to your profile.');

  if (options.isMentor) {
    const mentorUpdate = await supabase
      .from('counsellor_details')
      .update({ avatar_url: publicUrl })
      .eq('user_id', userId);
    if (mentorUpdate.error) throw new Error('Your photo could not be saved to your mentor profile.');
  }

  return publicUrl;
}

/** Clears the stored photo so initials are shown again. */
export async function removeAvatar(userId: string, options: { isMentor: boolean }): Promise<void> {
  const profileUpdate = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
  if (profileUpdate.error) throw new Error('Your photo could not be removed.');
  if (options.isMentor) {
    const mentorUpdate = await supabase
      .from('counsellor_details')
      .update({ avatar_url: null })
      .eq('user_id', userId);
    if (mentorUpdate.error) throw new Error('Your photo could not be removed from your mentor profile.');
  }
}
