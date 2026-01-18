import { useState, useEffect } from 'react';
import { listenCharacterProfile } from '@/services/firestore';

export function useCharacterPrompt(uid: string): string {
  const [characterPrompt, setCharacterPrompt] = useState<string>('');

  useEffect(() => {
    if (!uid) return;
    const unsub = listenCharacterProfile(uid, (profile) => {
      if (profile?.generatedPrompt) {
        setCharacterPrompt(profile.generatedPrompt);
      }
    });
    return unsub;
  }, [uid]);

  return characterPrompt;
}
