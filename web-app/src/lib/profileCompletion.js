import useSWR from 'swr';
import { ageFromDob } from './points';
import { supabase } from './supabase';

export const TEST_TABLES = {
  IELTS: 'test_ielts',
  PTE: 'test_pte',
  TOEFL: 'test_toefl',
  Cambridge: 'test_cambridge',
  OET: 'test_oet',
};

export const TEST_SCORE_FIELDS = ['listening', 'reading', 'writing', 'speaking', 'overall'];
const hasTestScore = TEST_SCORE_FIELDS.map(field => `${field}.not.is.null`).join(',');

async function fetchEntries([, userId]) {
  const forUser = table => supabase.from(table).select('id').eq('user_id', userId).limit(1);
  const [education, experience, ...tests] = await Promise.all([
    forUser('profile_education').not('level', 'is', null).neq('level', ''),
    forUser('profile_experience'),
    ...Object.values(TEST_TABLES).map(table => forUser(table).or(hasTestScore)),
  ]);

  const failed = [education, experience, ...tests].find(result => result.error);
  if (failed) throw failed.error;

  return {
    education: Boolean(education.data?.length),
    experience: Boolean(experience.data?.length),
    language: tests.some(result => result.data?.length),
  };
}

async function fetchClassification([, userId]) {
  const { data, error } = await supabase.from('profile_job_classification')
    .select('anzsco_code, anzsco_title').eq('user_id', userId)
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

function occupationCode(value) {
  const code = typeof value === 'object' && value !== null ? value.occupation_code ?? value.anzsco_code : value;
  return /^[0-9]{6}$/.test(code) ? String(code) : null;
}

export function useSavedOccupation(userId, profileRow) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? ['profile-occupation', userId] : null,
    fetchClassification
  );
  const classificationCode = occupationCode(data?.anzsco_code);
  // The current occupation also drives pathway matching. Keep it authoritative
  // if the secondary title record disagrees after a partial save.
  const code = occupationCode(profileRow?.experienceAnzsco) ?? classificationCode ?? occupationCode(profileRow?.educationAnzsco);

  return {
    occupation: code ? {
      occupation_code: code,
      job_name: (code === classificationCode && data?.anzsco_title) || `ANZSCO ${code}`,
    } : null,
    error,
    isLoading,
    refetch: mutate,
  };
}

export function useProfileCompletion(userId, basicRow, profileRow) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? ['profile-completion', userId] : null,
    fetchEntries
  );
  const saved = useSavedOccupation(userId, profileRow);
  const age = ageFromDob(basicRow?.dob);

  return {
    entries: data,
    hasDob: age !== null && age >= 0,
    hasOccupation: Boolean(saved.occupation),
    error: error || saved.error,
    loading: isLoading || saved.isLoading,
    retry: () => Promise.all([mutate(), saved.refetch()]),
    refreshEntries: mutate,
  };
}
