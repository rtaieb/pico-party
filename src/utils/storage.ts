import type { Player } from '../types';

const STORAGE_KEY = 'picoparty_players_v1';
const LAST_PLAYERS_KEY = 'picoparty_last_selected_ids_v1';

export const getStoredPlayers = (): Player[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const savePlayer = (player: Player): Player[] => {
  const current = getStoredPlayers();
  const updated = [player, ...current.filter((p) => p.id !== player.id)];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save player to localStorage', e);
  }
  return updated;
};

export const deletePlayer = (id: string): Player[] => {
  const current = getStoredPlayers();
  const updated = current.filter((p) => p.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete player from localStorage', e);
  }
  return updated;
};

export const getLastSelectedPlayerIds = (): string[] => {
  try {
    const raw = localStorage.getItem(LAST_PLAYERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // fallback
  }
  return [];
};

export const saveLastSelectedPlayerIds = (ids: string[]) => {
  try {
    localStorage.setItem(LAST_PLAYERS_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error('Failed to save selected players', e);
  }
};
