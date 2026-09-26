import React, { createContext, useContext, useMemo } from 'react';
import useSWR from 'swr';
import { supabase } from './supabase';
import { totalPointsFromProfileRow } from './points';

const ProfileContext = createContext();

const fetchProfile = async (userId) => {
  const [
    { data: profileData, error: profileError },
    { data: basicData, error: basicError },
    { data: fswData, error: fswError },
    { data: crsData, error: crsError },
    { data: cvData, error: cvError },
  ] = await Promise.all([
    supabase.from('point_australia').select('*').eq('id', userId).single(),
    supabase.from('profile_basic').select('*').eq('id', userId).single(),
    supabase.from('point_fsw67').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('points_canada_crs').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('cv_metadata').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const realProfileError = profileError && profileError.code !== 'PGRST116' ? profileError : null;
  const realBasicError = basicError && basicError.code !== 'PGRST116' ? basicError : null;
  const realFswError = fswError && fswError.code !== 'PGRST116' ? fswError : null;
  const realCrsError = crsError && crsError.code !== 'PGRST116' ? crsError : null;
  const realCvError = cvError && cvError.code !== 'PGRST116' ? cvError : null;
  
  if (realProfileError) console.error('Error fetching profile:', realProfileError);
  if (realBasicError) console.error('Error fetching basic profile:', realBasicError);
  if (realFswError) console.error('Error fetching FSW points:', realFswError);
  if (realCrsError) console.error('Error fetching CRS points:', realCrsError);
  if (realCvError) console.error('Error fetching CV metadata:', realCvError);

  const error = realProfileError || realBasicError || realFswError || realCrsError || realCvError || null;
  if (error) throw error;

  return {
    profileRow: profileData ?? null,
    basicRow: basicData ?? null,
    fswRow: fswData ?? null,
    crsRow: crsData ?? null,
    cvRow: cvData ?? null,
    totalPoints: profileData ? totalPointsFromProfileRow(profileData, basicData) : 0,
  };
};

/**
 * Single shared fetch of point_australia + profile_basic for the whole app.
 * Profile.jsx and Home.jsx both used to fetch these same two rows themselves
 * on top of this, tripling the round trips on a Home -> Profile visit; they
 * now read from here instead.
 */
export function ProfileProvider({ children, session }) {
  const userId = session?.user?.id;

  const { data, error, isLoading, mutate } = useSWR(
    userId ? ['profile', userId] : null,
    ([_, id]) => fetchProfile(id)
  );

  const contextValue = useMemo(() => ({
    loading: isLoading,
    error,
    profileRow: data?.profileRow ?? null,
    basicRow: data?.basicRow ?? null,
    fswRow: data?.fswRow ?? null,
    crsRow: data?.crsRow ?? null,
    cvRow: data?.cvRow ?? null,
    totalPoints: data?.totalPoints ?? 0,
    refetch: mutate
  }), [data, error, isLoading, mutate]);

  return (
    <ProfileContext.Provider value={contextValue}>
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
      cvRow: null,
      totalPoints: 0,
      refetch: () => {}
    };
  }
  return context;
}
