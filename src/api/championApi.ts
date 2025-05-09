import fs from 'fs';
import path from 'path';
import { Champion, Lane } from '../types';
import { StatsApi } from './external/statsApi';

export class ChampionApi {
  private championsCache: Champion[] = [];
  private readonly cacheFile = path.join(__dirname, '../../src/data/champions.json');
  private readonly cacheLifetime = 24 * 60 * 60 * 1000; // 24 hours
  private statsApi: StatsApi;

  constructor() {
    this.statsApi = new StatsApi();
  }

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
      // Initialize the stats API
      await this.statsApi.initialize();

      // Get all champion data with real statistics from our API service
      this.championsCache = await this.statsApi.getAllChampionData();

      // Fallback to local data if the API failed
      if (this.championsCache.length === 0) {
        console.log('Using fallback champion data from local file...');
        await this.loadFallbackData();
      }

      // Save to cache
      this.saveToCache();

      return this.championsCache;
    } catch (error) {
      console.error('Error fetching champion data:', error);
      // Try to load fallback data if fetch fails
      await this.loadFallbackData();
      return this.championsCache;
    }
  }

  /**
   * Load fallback data from local file if API calls fail
   */
  private async loadFallbackData(): Promise<boolean> {
    try {
      const fallbackPath = path.join(__dirname, '../../src/data/champions.json');
      if (fs.existsSync(fallbackPath)) {
        const data = fs.readFileSync(fallbackPath, 'utf-8');
        this.championsCache = JSON.parse(data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading fallback data:', error);
      return false;
    }
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