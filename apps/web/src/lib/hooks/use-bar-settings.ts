'use client';

import { useState, useEffect } from 'react';
import { getBarName, setBarName, BAR_NAME_CHANGE_EVENT } from '@/lib/settings';

export function useBarName() {
  const [barName, setBarNameState] = useState('Diamond Luxea');

  useEffect(() => {
    const sync = () => setBarNameState(getBarName());
    sync();
    window.addEventListener(BAR_NAME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(BAR_NAME_CHANGE_EVENT, sync);
  }, []);

  const updateBarName = (name: string) => {
    const value = name.trim() || 'Diamond Luxea';
    setBarName(value);
    setBarNameState(value);
  };

  return { barName, updateBarName };
}
