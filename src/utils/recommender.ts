import { Champion, ChampionRecommendation, Lane } from '../types';
import { ChampionApi } from '../api/championApi';

export class ChampionRecommender {
  private championApi: ChampionApi;
  
  constructor(championApi: ChampionApi) {
    this.championApi = championApi;
  }
  
  /**
   * Get champion recommendations for a specific lane
   */
  async getRecommendations(lane: Lane, count: number = 5): Promise<ChampionRecommendation[]> {
    // Get top champions for the lane
    const champions = await this.championApi.getRecommendationsForLane(lane, count * 2);
    
    // Create detailed recommendations with reasons
    const recommendations = champions.map(champion => {
      return this.createRecommendation(champion, lane);
    });
    
    // Sort by final score and return the top ones
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
  }
  
  /**
   * Create a detailed recommendation for a champion in a specific lane
   */
  private createRecommendation(champion: Champion, lane: Lane): ChampionRecommendation {
    const laneStats = champion.lanes[lane];
    const reasons: string[] = [];
    
    // Calculate a score based on various factors
    let score = laneStats.score;
    
    // Add reasons based on statistics
    if (laneStats.winRate > 0.53) {
      reasons.push(`High win rate (${(laneStats.winRate * 100).toFixed(1)}%)`);
      score += 1;
    }
    
    if (laneStats.pickRate > 0.1) {
      reasons.push(`Popular pick (${(laneStats.pickRate * 100).toFixed(1)}%)`);
      score += 0.5;
    } else if (laneStats.pickRate < 0.03) {
      reasons.push(`Uncommon pick - may surprise opponents`);
      score += 0.3;
    }
    
    if (champion.tier) {
      if (champion.tier === 'S' || champion.tier === 'A') {
        reasons.push(`${champion.tier}-tier champion in the current meta`);
        score += 1;
      } else if (champion.tier === 'B') {
        reasons.push(`Solid B-tier choice`);
        score += 0.5;
      }
    }
    
    // Ensure we have at least one reason
    if (reasons.length === 0) {
      reasons.push(`Decent overall performance in ${lane.toLowerCase()}`);
    }
    
    return {
      champion,
      score,
      reasons
    };
  }
}