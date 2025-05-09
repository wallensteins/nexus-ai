/**
 * Champion matchup data: which champions counter or are countered by others
 * This data could be fetched from an API but for demonstration, we'll use a static version
 * Keys are champion IDs, values are arrays of champion IDs that counter them
 */

// This is a simplified version of matchup data - in a real app this would be more extensive
// Format: { [championId]: { counters: [championsThisOneCounters], counteredBy: [championsThisIsCounteredBy] } }
export const championMatchups: Record<number, { counters: number[], counteredBy: number[] }> = {
  // Aatrox (266)
  266: {
    counters: [122, 114, 8, 86],  // Darius, Fiora, Vladimir, Garen
    counteredBy: [23, 24, 36, 420] // Tryndamere, Jax, Dr. Mundo, Illaoi
  },
  
  // Ahri (103)
  103: {
    counters: [55, 99, 7, 26], // Katarina, Lux, LeBlanc, Zilean
    counteredBy: [238, 38, 134, 90] // Zed, Kassadin, Syndra, Malzahar
  },
  
  // Akali (84)
  84: {
    counters: [91, 127, 74, 43], // Talon, Lissandra, Heimerdinger, Karma
    counteredBy: [75, 7, 90, 34] // Nasus, LeBlanc, Malzahar, Anivia
  },
  
  // Alistar (12)
  12: {
    counters: [412, 40, 37, 497], // Thresh, Janna, Sona, Rakan
    counteredBy: [25, 111, 201, 223] // Morgana, Nautilus, Braum, Tahm Kench
  },
  
  // Amumu (32)
  32: {
    counters: [19, 31, 28, 254], // Warwick, Cho'Gath, Evelynn, Vi
    counteredBy: [77, 2, 56, 11] // Udyr, Olaf, Nocturne, Master Yi
  },
  
  // Annie (1)
  1: {
    counters: [74, 112, 7, 61], // Heimerdinger, Viktor, LeBlanc, Orianna
    counteredBy: [238, 38, 161, 91] // Zed, Kassadin, Vel'Koz, Talon
  },
  
  // Ashe (22)
  22: {
    counters: [119, 67, 81, 42], // Draven, Vayne, Ezreal, Corki
    counteredBy: [202, 236, 429, 51] // Jhin, Lucian, Kalista, Caitlyn
  },
  
  // Aurelion Sol (136)
  136: {
    counters: [112, 99, 268, 61], // Viktor, Lux, Azir, Orianna
    counteredBy: [238, 91, 55, 105] // Zed, Talon, Katarina, Fizz
  },
  
  // Azir (268)
  268: {
    counters: [99, 61, 101, 134], // Lux, Orianna, Xerath, Syndra
    counteredBy: [238, 91, 105, 7] // Zed, Talon, Fizz, LeBlanc
  },
  
  // Bard (432)
  432: {
    counters: [40, 37, 16, 412], // Janna, Sona, Soraka, Thresh
    counteredBy: [111, 201, 412, 53] // Nautilus, Braum, Thresh, Blitzcrank
  },
  
  // Blitzcrank (53)
  53: {
    counters: [40, 37, 16, 350], // Janna, Sona, Soraka, Yuumi
    counteredBy: [25, 111, 412, 223] // Morgana, Nautilus, Thresh, Tahm Kench
  },
  
  // Add more champions and their matchups...
};

/**
 * Get champions countered by a specific champion
 */
export function getChampionsCounteredBy(championId: number): number[] {
  return championMatchups[championId]?.counters || [];
}

/**
 * Get champions that counter a specific champion
 */
export function getChampionCounters(championId: number): number[] {
  return championMatchups[championId]?.counteredBy || [];
}

/**
 * Convert champion ID to name (helper function)
 */
export function getChampionNameById(championId: number): string {
  // This would typically come from your champion data
  // This is just a placeholder for a few champion IDs
  const championNames: Record<number, string> = {
    266: 'Aatrox',
    103: 'Ahri',
    84: 'Akali',
    12: 'Alistar',
    32: 'Amumu',
    1: 'Annie',
    22: 'Ashe',
    136: 'Aurelion Sol',
    268: 'Azir',
    432: 'Bard',
    53: 'Blitzcrank',
    // Add more champions as needed
  };
  
  return championNames[championId] || `Champion ${championId}`;
}

/**
 * Convert champion name to ID (helper function)
 */
export function getChampionIdByName(championName: string): number | null {
  // This would typically come from your champion data
  // This is just a placeholder for a few champion names
  const championIds: Record<string, number> = {
    'Aatrox': 266,
    'Ahri': 103,
    'Akali': 84,
    'Alistar': 12,
    'Amumu': 32,
    'Annie': 1,
    'Ashe': 22,
    'Aurelion Sol': 136,
    'Azir': 268,
    'Bard': 432,
    'Blitzcrank': 53,
    // Add more champions as needed
  };
  
  return championIds[championName] || null;
}