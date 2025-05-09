import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { Champion, Lane } from '../types';

export class ChampionApi {
  private championsCache: Champion[] = [];
  private readonly cacheFile = path.join(__dirname, '../../src/data/champions.json');
  private readonly cacheLifetime = 24 * 60 * 60 * 1000; // 24 hours
  
  /**
   * Get champion data, either from local cache or by fetching from external sources
   */
  async getChampions(): Promise<Champion[]> {
    try {
      // Check if we have cached data
      if (this.championsCache.length > 0) {
        return this.championsCache;
      }
      
      // Try to load from file cache
      if (await this.loadFromCache()) {
        return this.championsCache;
      }
      
      // Fetch from external sources if no cache available
      return await this.fetchAndUpdateChampions();
    } catch (error) {
      console.error('Error getting champion data:', error);
      return [];
    }
  }
  
  /**
   * Load champion data from local cache file
   */
  private async loadFromCache(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.cacheFile)) {
        return false;
      }
      
      const stats = fs.statSync(this.cacheFile);
      const isExpired = Date.now() - stats.mtimeMs > this.cacheLifetime;
      
      if (isExpired) {
        return false;
      }
      
      const data = fs.readFileSync(this.cacheFile, 'utf-8');
      this.championsCache = JSON.parse(data);
      return true;
    } catch (error) {
      console.error('Error loading from cache:', error);
      return false;
    }
  }
  
  /**
   * Fetch champion data from external sources and update local cache
   */
  private async fetchAndUpdateChampions(): Promise<Champion[]> {
    try {
      // Fetch basic champion data from Data Dragon
      const version = await this.getLatestVersion();
      const championData = await this.fetchFromDataDragon(version);
      
      // Fetch champion stats data - this would typically come from a stats API
      // Here we'll use dummy data, but in a real implementation this would be
      // fetched from a source like U.GG, OP.GG, etc.
      const championStats = await this.fetchChampionStats();
      
      // Combine the data
      this.championsCache = this.mergeChampionData(championData, championStats);
      
      // Save to cache
      this.saveToCache();
      
      return this.championsCache;
    } catch (error) {
      console.error('Error fetching champion data:', error);
      return [];
    }
  }
  
  /**
   * Get the latest League of Legends version from Data Dragon
   */
  private async getLatestVersion(): Promise<string> {
    try {
      const response = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
      return response.data[0]; // Latest version is the first in the array
    } catch (error) {
      console.error('Error getting latest LoL version:', error);
      return '13.21.1'; // Fallback to a known version
    }
  }
  
  /**
   * Fetch basic champion data from Riot's Data Dragon API
   */
  private async fetchFromDataDragon(version: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`
      );
      
      return Object.values(response.data.data);
    } catch (error) {
      console.error('Error fetching from Data Dragon:', error);
      return [];
    }
  }
  
  /**
   * Fetch champion statistics from a theoretical stats API
   * In a real implementation, this would connect to a service like U.GG, OP.GG, etc.
   * For this example, we'll use simulated data
   */
  private async fetchChampionStats(): Promise<any> {
    // Simulate API call - in a real implementation, this would be an actual API call
    // to a service providing champion statistics
    
    // For the example, we'll return some simulated data
    return {
      stats: {
        // Champion ID -> stats mapping
        '266': { // Aatrox
          winRate: 0.512,
          pickRate: 0.086,
          banRate: 0.045,
          tier: 'A',
          lanes: {
            TOP: { winRate: 0.515, pickRate: 0.134, score: 8.2 },
            JUNGLE: { winRate: 0.495, pickRate: 0.024, score: 5.1 },
            MID: { winRate: 0.503, pickRate: 0.018, score: 6.7 },
            BOTTOM: { winRate: 0.480, pickRate: 0.002, score: 3.1 },
            SUPPORT: { winRate: 0.465, pickRate: 0.001, score: 2.3 }
          }
        },
        '103': { // Ahri
          winRate: 0.508,
          pickRate: 0.092,
          banRate: 0.021,
          tier: 'A',
          lanes: {
            TOP: { winRate: 0.485, pickRate: 0.01, score: 4.8 },
            JUNGLE: { winRate: 0.42, pickRate: 0.005, score: 2.1 },
            MID: { winRate: 0.51, pickRate: 0.145, score: 8.7 },
            BOTTOM: { winRate: 0.47, pickRate: 0.002, score: 3.0 },
            SUPPORT: { winRate: 0.46, pickRate: 0.01, score: 4.5 }
          }
        },
        // Add more champions with simulated stats...
      }
    };
  }
  
  /**
   * Merge champion data from Data Dragon with statistics data
   */
  private mergeChampionData(championData: any[], statsData: any): Champion[] {
    return championData.map(champion => {
      const stats = statsData.stats[champion.key] || {
        winRate: 0.5,
        pickRate: 0.05,
        banRate: 0.01,
        tier: 'C',
        lanes: {
          TOP: { winRate: 0.5, pickRate: 0.05, score: 5.0 },
          JUNGLE: { winRate: 0.5, pickRate: 0.05, score: 5.0 },
          MID: { winRate: 0.5, pickRate: 0.05, score: 5.0 },
          BOTTOM: { winRate: 0.5, pickRate: 0.05, score: 5.0 },
          SUPPORT: { winRate: 0.5, pickRate: 0.05, score: 5.0 }
        }
      };
      
      return {
        id: parseInt(champion.key, 10),
        name: champion.name,
        key: champion.key,
        title: champion.title,
        winRate: stats.winRate,
        pickRate: stats.pickRate,
        banRate: stats.banRate,
        tier: stats.tier,
        lanes: stats.lanes
      };
    });
  }
  
  /**
   * Save champion data to local cache file
   */
  private saveToCache(): void {
    try {
      const dir = path.dirname(this.cacheFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(
        this.cacheFile,
        JSON.stringify(this.championsCache, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }
  
  /**
   * Get champion recommendations for a specific lane
   */
  async getRecommendationsForLane(lane: Lane, count: number = 5): Promise<Champion[]> {
    const champions = await this.getChampions();
    
    return champions
      .sort((a, b) => {
        // Sort by lane score
        return b.lanes[lane].score - a.lanes[lane].score;
      })
      .slice(0, count);
  }
}