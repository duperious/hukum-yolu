import { useCallback, useState } from 'react';
import {
  defaultProfile,
  loadProfile,
  normalizeName,
  saveProfile,
  type Profile,
} from '../lib/profile';

export function useProfile() {
  const [profile, setProfileState] = useState<Profile>(() => {
    return loadProfile() ?? defaultProfile();
  });

  const setProfile = useCallback((next: Profile) => {
    const normalized: Profile = {
      name: normalizeName(next.name),
      avatarId: next.avatarId,
    };
    setProfileState(normalized);
    saveProfile(normalized);
  }, []);

  return { profile, setProfile };
}
