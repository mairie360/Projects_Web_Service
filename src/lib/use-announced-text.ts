import { useEffect, useState } from 'react';

/**
 * `text` one commit after the live region holding it was mounted: a screen reader only announces what changes in a
 * region it already knows, so a region inserted together with its message stays silent (RGAA 7.5).
 */
export function useAnnouncedText(text: string): string {
  const [announced, setAnnounced] = useState('');
  useEffect(() => { setAnnounced(text); }, [text]);
  return announced;
}
