import { supabase } from '@/integrations/supabase/client';

/**
 * Get a signed URL for a private storage file.
 * If the media_url is already a full URL (legacy public), returns it as-is.
 * Otherwise treats it as a storage path and creates a 1-hour signed URL.
 */
export const getSignedUrl = async (
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string | null> => {
  // If it's already a full URL (legacy data), return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) {
    console.error('Signed URL error:', error);
    return null;
  }
  return data.signedUrl;
};
