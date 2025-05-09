import { Champion, ChampionRecommendation, Lane } from '../types';
import { ChampionApi } from '../api/championApi';
import { AIRecommender } from '../api/external/aiRecommender';
import { getChampionCounters, getChampionsCounteredBy, getChampionNameById } from '../data/matchups';

export class ChampionRecommender {
  private championApi: ChampionApi;
  private aiRecommender: AIRecommender;
  
  constructor(championApi: ChampionApi) {
    this.championApi = championApi;
    this.aiRecommender = new AIRecommender();
  }
  
  /**
   * Get champion recommendations for a specific lane using AI
   * Optionally consider an enemy champion for counter picks
   */
  async getRecommendations(
    lane: Lane, 
    count: number = 5, 
    enemyChampionId?: number | null
  ): Promise<ChampionRecommendation[]> {
    // Get all champions with their stats
    const champions = await this.championApi.getChampions();
    
    // Use AI recommender to get intelligent recommendations
    try {
      const aiRecommendations = await this.aiRecommender.getRecommendations(
        champions, 
        lane, 
        count, 
        enemyChampionId
      );
      
      if (aiRecommendations && aiRecommendations.length > 0) {
        console.log(`Using AI recommendations for ${lane}`);
        if (enemyChampionId) {
          console.log(`Considering matchup against champion ID ${enemyChampionId}`);
        }
        return aiRecommendations;
      }
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      console.log('Falling back to traditional recommendation algorithm');
    }
    
    // Fall back to traditional algorithm if AI fails
    return this.getTraditionalRecommendations(champions, lane, count, enemyChampionId);
  }
  
  /**
   * Get recommendations using the traditional algorithm as a fallback
   */
  private async getTraditionalRecommendations(
    champions: Champion[],
    lane: Lane,
    count: number,
    enemyChampionId?: number | null
  ): Promise<ChampionRecommendation[]> {
    // Get top champions for the lane
    const topChampions = champions
      .sort((a, b) => b.lanes[lane].score - a.lanes[lane].score)
      .slice(0, count * 2);
    
    // Create detailed recommendations with reasons
    const recommendations = topChampions.map(champion => {
      return this.createRecommendation(champion, lane, enemyChampionId);
    });
    
    // Sort by final score and return the top ones
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
  }
  
  /**
   * Create a detailed recommendation for a champion in a specific lane
   * Optionally consider an enemy champion for counter picks
   */
  private createRecommendation(
    champion: Champion, 
    lane: Lane, 
    enemyChampionId?: number | null
  ): ChampionRecommendation {
    const laneStats = champion.lanes[lane];
    const reasons: string[] = [];
    
    // We use the base lane score from the API but enhance it with additional factors
    let score = laneStats.score;
    
    // Win rate analysis
    if (laneStats.winRate > 0.53) {
      reasons.push(`High win rate (${(laneStats.winRate * 100).toFixed(1)}%)`);
      score += 1;
    } else if (laneStats.winRate > 0.51) {
      reasons.push(`Above average win rate (${(laneStats.winRate * 100).toFixed(1)}%)`);
      score += 0.5;
    } else if (laneStats.winRate < 0.47) {
      reasons.push(`Challenging to master (${(laneStats.winRate * 100).toFixed(1)}% win rate)`);
      // We don't penalize the score here as it may be a high-skill champion
    }
    
    // Pick rate analysis
    if (laneStats.pickRate > 0.15) {
      reasons.push(`Very popular pick (${(laneStats.pickRate * 100).toFixed(1)}%)`);
      score += 0.7;
    } else if (laneStats.pickRate > 0.1) {
      reasons.push(`Popular pick (${(laneStats.pickRate * 100).toFixed(1)}%)`);
      score += 0.5;
    } else if (laneStats.pickRate < 0.03) {
      reasons.push(`Uncommon pick - may surprise opponents`);
      score += 0.3;
    } else if (laneStats.pickRate < 0.01) {
      reasons.push(`Rare pick - opponents likely unfamiliar with matchup`);
      score += 0.4;
    }
    
    // Tier-based analysis
    if (champion.tier) {
      if (champion.tier === 'S') {
        reasons.push(`S-tier powerhouse in the current meta`);
        score += 1.2;
      } else if (champion.tier === 'A') {
        reasons.push(`A-tier strong pick in the current meta`);
        score += 0.8;
      } else if (champion.tier === 'B') {
        reasons.push(`Solid B-tier choice`);
        score += 0.4;
      } else if (champion.tier === 'D') {
        reasons.push(`Currently underperforming in the meta`);
        score -= 0.3; // Small penalty for D-tier
      }
    }
    
    // Ban rate consideration - champions with high ban rates are likely strong
    if (champion.banRate > 0.2) {
      reasons.push(`Frequently banned (${(champion.banRate * 100).toFixed(1)}%) - very strong currently`);
      score += 0.5;
    } else if (champion.banRate > 0.1) {
      reasons.push(`Often banned (${(champion.banRate * 100).toFixed(1)}%) - strong pick`);
      score += 0.3;
    }
    
    // Champion complexity/difficulty
    if (this.isHighSkillChampion(champion.name)) {
      if (laneStats.winRate > 0.5) {
        reasons.push(`High skill ceiling but rewarding when mastered`);
        score += 0.4;
      } else {
        reasons.push(`High skill ceiling - requires practice`);
      }
    }
    
    // Lane synergy
    if (this.hasLaneSynergy(champion.name, lane)) {
      reasons.push(`Particularly strong in ${lane.toLowerCase()} role`);
      score += 0.6;
    }
    
    // Ensure we have at least one reason
    if (reasons.length === 0) {
      reasons.push(`Decent overall performance in ${lane.toLowerCase()}`);
    }
    
    // Handle matchup data if we have an enemy champion
    let counters: string[] = [];
    let counteredBy: string[] = [];
    
    if (enemyChampionId) {
      const champId = Number(champion.key);
      
      // Check if this champion counters the enemy
      if (getChampionsCounteredBy(champId).includes(enemyChampionId)) {
        const enemyName = getChampionNameById(enemyChampionId);
        counters.push(enemyName);
        score += 15; // Significant bonus for countering the opponent
        reasons.push(`Strong counter against ${enemyName}`);
      }
      
      // Check if this champion is countered by the enemy
      if (getChampionCounters(champId).includes(enemyChampionId)) {
        const enemyName = getChampionNameById(enemyChampionId);
        counteredBy.push(enemyName);
        score -= 10; // Penalty for being countered
        reasons.push(`Be careful - countered by ${enemyName}`);
      }
    }
    
    return {
      champion,
      score,
      reasons,
      counters: counters.length > 0 ? counters : undefined,
      counteredBy: counteredBy.length > 0 ? counteredBy : undefined
    };
  }
  
  /**
   * Check if a champion is considered high skill cap
   */
  private isHighSkillChampion(championName: string): boolean {
    const highSkillChampions = [
      'Akali', 'Azir', 'Camille', 'Gangplank', 'Irelia',
      'Lee Sin', 'Riven', 'Yasuo', 'Zed', 'Fiora',
      'Kalista', 'Thresh', 'Nidalee', 'Cassiopeia',
      'Draven', 'Katarina', 'LeBlanc', 'Qiyana', 'Syndra',
      'Aphelios', 'Aurelion Sol', 'Pyke', 'Elise', 'Kayn',
      'Jayce', 'Rengar', 'Twisted Fate', 'Zilean'
    ];
    
    return highSkillChampions.includes(championName);
  }
  
  /**
   * Check if a champion has special synergy with a lane
   */
  private hasLaneSynergy(championName: string, lane: Lane): boolean {
    const laneSynergies: Record<string, Lane[]> = {
      'Aatrox': ['TOP'],
      'Ahri': ['MID'],
      'Alistar': ['SUPPORT'],
      'Amumu': ['JUNGLE'],
      'Ashe': ['BOTTOM'],
      'Blitzcrank': ['SUPPORT'],
      'Darius': ['TOP'],
      'Lee Sin': ['JUNGLE'],
      'Orianna': ['MID'],
      'Thresh': ['SUPPORT'],
      'Vayne': ['BOTTOM'],
      'Zed': ['MID'],
      'Jarvan IV': ['JUNGLE'],
      'Leona': ['SUPPORT'],
      'Renekton': ['TOP'],
      // Additional lane synergies for more champions
      'Caitlyn': ['BOTTOM'],
      'Janna': ['SUPPORT'],
      'Malphite': ['TOP', 'SUPPORT'],
      'Syndra': ['MID'],
      'Twisted Fate': ['MID'],
      'Vi': ['JUNGLE'],
      'Kennen': ['TOP', 'MID'],
      'Yuumi': ['SUPPORT'],
      'Zac': ['JUNGLE'],
      'Xerath': ['MID', 'SUPPORT'],
      'Garen': ['TOP'],
      'Katarina': ['MID'],
      'Miss Fortune': ['BOTTOM'],
      'Nami': ['SUPPORT'],
      'Sett': ['TOP', 'SUPPORT']
    };
    
    if (championName in laneSynergies) {
      return laneSynergies[championName].includes(lane);
    }
    
    return false;
  }
}