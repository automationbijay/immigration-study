import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { totalPointsFromProfileRow } from './points';

const ProfileContext = createContext();

export function ProfileProvider({ children, session }) {
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function getProfile() {
      if (!session?.user?.id) {
        if (!ignore) setLoading(false);
        return;
      }
      try {
        const { data: profileData, error } = await supabase
          .from('point_australia')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const { data: basicData } = await supabase
          .from('profile_basic')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        }

        if (!ignore && profileData) {
          setTotalPoints(totalPointsFromProfileRow(profileData, basicData));
        }
      } catch (error) {
        console.error('Error in fetching profile:', error);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    getProfile();
    return () => { ignore = true; };
  }, [session]);

  return (
    <ProfileContext.Provider value={{ totalPoints, loading }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
