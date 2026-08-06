import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { totalPointsFromProfileRow } from './points';

const ProfileContext = createContext();

/**
 * Single shared fetch of point_australia + profile_basic for the whole app.
 * Profile.jsx and Home.jsx both used to fetch these same two rows themselves
 * on top of this, tripling the round trips on a Home -> Profile visit; they
 * now read from here instead.
 */
export function ProfileProvider({ children, session }) {
  const [loading, setLoading] = useState(true);
  const [profileRow, setProfileRow] = useState(null);
  const [basicRow, setBasicRow] = useState(null);
  const [fswRow, setFswRow] = useState(null);
  const [crsRow, setCrsRow] = useState(null);
  const [error, setError] = useState(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function getProfile() {
      if (!session?.user?.id) {
        if (!ignore) {
          setProfileRow(null);
          setBasicRow(null);
          setFswRow(null);
          setCrsRow(null);
          setTotalPoints(0);
          setError(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        // Independent queries against different tables - run in parallel
        // rather than one-after-another so this only costs one round trip.
        const [
          { data: profileData, error: profileError },
          { data: basicData, error: basicError },
          { data: fswData, error: fswError },
          { data: crsData, error: crsError },
        ] = await Promise.all([
          supabase.from('point_australia').select('*').eq('id', session.user.id).single(),
          supabase.from('profile_basic').select('*').eq('id', session.user.id).single(),
          supabase.from('point_fsw67').select('*').eq('user_id', session.user.id).maybeSingle(),
          supabase.from('points_canada_crs').select('*').eq('user_id', session.user.id).maybeSingle(),
        ]);

        // PGRST116 = no row found, which is expected for a brand-new user.
        const realProfileError = profileError && profileError.code !== 'PGRST116' ? profileError : null;
        const realBasicError = basicError && basicError.code !== 'PGRST116' ? basicError : null;
        const realFswError = fswError && fswError.code !== 'PGRST116' ? fswError : null;
        const realCrsError = crsError && crsError.code !== 'PGRST116' ? crsError : null;
        
        if (realProfileError) console.error('Error fetching profile:', realProfileError);
        if (realBasicError) console.error('Error fetching basic profile:', realBasicError);
        if (realFswError) console.error('Error fetching FSW points:', realFswError);
        if (realCrsError) console.error('Error fetching CRS points:', realCrsError);

        if (!ignore) {
          setProfileRow(profileData ?? null);
          setBasicRow(basicData ?? null);
          setFswRow(fswData ?? null);
          setCrsRow(crsData ?? null);
          setError(realProfileError || realBasicError || realFswError || realCrsError || null);
          setTotalPoints(profileData ? totalPointsFromProfileRow(profileData, basicData) : 0);
        }
      } catch (err) {
        console.error('Error in fetching profile:', err);
        if (!ignore) setError(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    getProfile();
    return () => { ignore = true; };
  }, [session, refreshToken]);

  const refetch = useCallback(() => setRefreshToken((t) => t + 1), []);

  return (
    <ProfileContext.Provider value={{ loading, error, profileRow, basicRow, fswRow, crsRow, totalPoints, refetch }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    return {
      loading: false,
      error: null,
      profileRow: null,
      basicRow: null,
      fswRow: null,
      crsRow: null,
      totalPoints: 0,
      refetch: () => {}
    };
  }
  return context;
}
