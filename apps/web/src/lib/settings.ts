const BAR_NAME_KEY = 'bar-depot-bar-name';

/** Fired on `window` when the bar name is saved so sidebars etc. can update. */
export const BAR_NAME_CHANGE_EVENT = 'bar-depot-bar-name-change';

export function getBarName(): string {
  if (typeof window === 'undefined') return 'Diamond Luxea';
  return localStorage.getItem(BAR_NAME_KEY) || 'Diamond Luxea';
}

export function setBarName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BAR_NAME_KEY, name.trim() || 'Diamond Luxea');
  window.dispatchEvent(new Event(BAR_NAME_CHANGE_EVENT));
}
