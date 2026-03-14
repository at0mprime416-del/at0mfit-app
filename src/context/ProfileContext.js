import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const ProfileContext = createContext({});

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [units, setUnits] = useState('lbs');

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) {
        setProfile(data);
        setUnits(data.preferred_units || 'lbs');
      }
    };
    loadProfile();

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        loadProfile();
      } else {
        setProfile(null);
        setUnits('lbs');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const convertWeight = (lbs) => {
    if (units === 'kg') return (lbs * 0.453592).toFixed(1);
    return lbs;
  };

  const weightLabel = units === 'kg' ? 'kg' : 'lbs';

  return (
    <ProfileContext.Provider value={{ profile, units, convertWeight, weightLabel, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => useContext(ProfileContext);
