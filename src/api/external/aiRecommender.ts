import { Champion, ChampionRecommendation, Lane } from '../../types';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getChampionCounters, getChampionsCounteredBy, getChampionNameById } from '../../data/matchups';

/**
 * Service that uses AI to generate champion recommendations
 */
export class AIRecommender {
  private aiModel: string;
  private aiApiKey: string;
  private championsData: Champion[] = [];
  private readonly cacheFile = path.join(__dirname, '../../../src/data/ai_recommendations_cache.json');
  private readonly cacheLifetime = 1 * 60 * 60 * 1000; // 1 hour cache
  
  constructor() {
    // In a production app, you'd load these from environment variables
    this.aiModel = process.env.AI_MODEL || 'gpt-4';
    this.aiApiKey = process.env.AI_API_KEY || '';
  }
  
  /**
   * Get champion recommendations for a specific lane using AI
   */
  async getRecommendations(
    champions: Champion[],
    lane: Lane,
    count: number = 5,
    enemyChampionId?: number | null
  ): Promise<ChampionRecommendation[]> {
    this.championsData = champions;
    
    try {
      // Check if we have cached recommendations for this lane
      const cachedRecommendations = await this.loadFromCache(lane);
      if (cachedRecommendations && cachedRecommendations.length >= count) {
        return cachedRecommendations.slice(0, count);
      }
      
      // Select top champions for the lane based on lane score as a starting point
      const topChampions = champions
        .sort((a, b) => b.lanes[lane].score - a.lanes[lane].score)
        .slice(0, count * 3); // Get a wider selection for the AI to choose from
      
      // Get recommendations from AI (or simulate it if no API key)
      let recommendations: ChampionRecommendation[];

      if (this.aiApiKey) {
        recommendations = await this.getAIRecommendations(topChampions, lane, count, enemyChampionId);
      } else {
        recommendations = await this.simulateAIRecommendations(topChampions, lane, count, enemyChampionId);
      }
      
      // Save to cache
      await this.saveToCache(lane, recommendations);
      
      return recommendations;
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      // Fallback to simple ranking if AI fails
      return this.getFallbackRecommendations(champions, lane, count);
    }
  }
  
  /**
   * Get champion recommendations from AI service
   * This would call an actual AI API in a production app
   */
  private async getAIRecommendations(
    champions: Champion[],
    lane: Lane,
    count: number,
    enemyChampionId?: number | null
  ): Promise<ChampionRecommendation[]> {
    try {
      // This would be an actual AI API call in a production app
      // For now, we'll simulate this since we don't have an API key set up
      
      if (!this.aiApiKey) {
        throw new Error('No AI API key provided');
      }
      
      // In a real implementation, this would be the API call:
      /*
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: this.aiModel,
        messages: [
          { role: 'system', content: 'You are a League of Legends expert who provides champion recommendations.' },
          { role: 'user', content: `Recommend ${count} champions for ${lane} lane with explanations. Here are current champion stats: ${JSON.stringify(champions)}` }
        ],
        max_tokens: 1000
      }, {
        headers: {
          'Authorization': `Bearer ${this.aiApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const aiResponse = response.data.choices[0].message.content;
      
      // Process AI response to extract recommendations
      // This would require parsing the AI's text response into structured data
      */
      
      // For now, fall back to simulated recommendations
      return this.simulateAIRecommendations(champions, lane, count);
    } catch (error) {
      console.error('Error calling AI API:', error);
      return this.simulateAIRecommendations(champions, lane, count);
    }
  }
  
  /**
   * Simulate AI-generated recommendations with sophisticated logic
   * This creates recommendations that feel like they came from an AI
   */
  private simulateAIRecommendations(
    champions: Champion[],
    lane: Lane,
    count: number,
    enemyChampionId?: number | null
  ): Promise<ChampionRecommendation[]> {
    return new Promise<ChampionRecommendation[]>((resolve) => {
      // Complex set of factors that an AI would consider
      const recommendations: ChampionRecommendation[] = [];
      
      // Meta analysis - weight different stats differently based on the current meta
      const metaFactors = {
        winRateWeight: 0.35,
        pickRateWeight: 0.15,
        banRateWeight: 0.2,
        laneScoreWeight: 0.3
      };
      
      // Lane-specific considerations
      const laneFactors: Record<Lane, any> = {
        TOP: {
          durabilityBonus: 0.2,
          splitPushBonus: 0.15,
          teamfightBonus: 0.1
        },
        JUNGLE: {
          mapMobilityBonus: 0.2,
          ganksBonus: 0.25,
          objectiveControlBonus: 0.15
        },
        MID: {
          roamingBonus: 0.15,
          waveClearBonus: 0.1,
          burstDamageBonus: 0.2
        },
        BOTTOM: {
          sustainedDamageBonus: 0.25,
          rangeBonus: 0.15,
          teamfightBonus: 0.1
        },
        SUPPORT: {
          utilityBonus: 0.2,
          engageBonus: 0.15,
          visionControlBonus: 0.1
        }
      };
      
      // Champion archetypes
      const archetypes: Record<string, string[]> = {
        tank: ['Ornn', 'Sion', 'Malphite', 'Maokai', 'Sejuani', 'Alistar', 'Leona', 'Nautilus'],
        bruiser: ['Darius', 'Garen', 'Aatrox', 'Mordekaiser', 'Sett', 'Illaoi', 'Renekton', 'Volibear'],
        assassin: ['Zed', 'Talon', 'Akali', 'Katarina', 'Fizz', 'Qiyana', 'Kha\'Zix', 'Rengar', 'Pyke'],
        mage: ['Ahri', 'Syndra', 'Orianna', 'Lux', 'Xerath', 'Vel\'Koz', 'Viktor', 'Cassiopeia', 'Annie'],
        marksman: ['Ashe', 'Caitlyn', 'Jinx', 'Jhin', 'Ezreal', 'Vayne', 'Miss Fortune', 'Kai\'Sa'],
        enchanter: ['Janna', 'Lulu', 'Nami', 'Soraka', 'Yuumi', 'Sona', 'Karma'],
        engage: ['Leona', 'Nautilus', 'Thresh', 'Blitzcrank', 'Alistar', 'Rakan'],
        splitpusher: ['Fiora', 'Jax', 'Tryndamere', 'Yorick', 'Nasus'],
        utility: ['Thresh', 'Bard', 'Janna', 'Morgana', 'Lulu']
      };
      
      // Get the archetype of a champion
      const getArchetype = (champion: Champion): string[] => {
        const types: string[] = [];
        
        for (const [type, champions] of Object.entries(archetypes)) {
          if (champions.includes(champion.name)) {
            types.push(type);
          }
        }
        
        return types.length > 0 ? types : ['versatile'];
      };
      
      // Get lane-specific explanations for recommendations
      const getLaneSpecificReason = (champion: Champion, lane: Lane): string => {
        const archetype = getArchetype(champion);
        
        switch (lane) {
          case 'TOP':
            if (archetype.includes('tank')) return 'Provides strong frontline presence for your team';
            if (archetype.includes('bruiser')) return 'Can dominate lane and scale into mid-game';
            if (archetype.includes('splitpusher')) return 'Excellent split-push pressure forcing enemy responses';
            return 'Good lane sustain and trading potential';
            
          case 'JUNGLE':
            if (archetype.includes('tank')) return 'Strong engage potential for ganks and teamfights';
            if (archetype.includes('assassin')) return 'High burst damage for successful ganks';
            if (archetype.includes('bruiser')) return 'Good balance of damage and durability for skirmishes';
            return 'Efficient clear speed and objective control';
            
          case 'MID':
            if (archetype.includes('mage')) return 'Strong waveclear and scaling for team fights';
            if (archetype.includes('assassin')) return 'Roaming potential to snowball other lanes';
            if (archetype.includes('utility')) return 'Map presence and utility for team coordination';
            return 'Good lane priority for supporting jungler';
            
          case 'BOTTOM':
            if (archetype.includes('marksman')) return 'Consistent damage output in teamfights';
            if (archetype.includes('mage')) return 'Strong lane poke and mid-game power spike';
            return 'Scales well with items and support synergy';
            
          case 'SUPPORT':
            if (archetype.includes('enchanter')) return 'Protective abilities to keep carries alive';
            if (archetype.includes('engage')) return 'Strong initiation to create pick opportunities';
            if (archetype.includes('utility')) return 'Versatile utility throughout all game phases';
            if (archetype.includes('mage')) return 'Lane dominance and additional damage source';
            return 'Vision control and team coordination';
        }
      };
      
      // Calculate game phase strengths
      const getGamePhaseStrengths = (champion: Champion): { early: number, mid: number, late: number } => {
        const archetype = getArchetype(champion);
        
        // Base values
        let early = 5;
        let mid = 5;
        let late = 5;
        
        // Adjust based on archetype
        if (archetype.includes('tank')) {
          early += 1;
          mid += 2;
          late += 3;
        }
        
        if (archetype.includes('bruiser')) {
          early += 2;
          mid += 3;
          late += 1;
        }
        
        if (archetype.includes('assassin')) {
          early += 1;
          mid += 4;
          late += 0;
        }
        
        if (archetype.includes('mage')) {
          early += 0;
          mid += 2;
          late += 3;
        }
        
        if (archetype.includes('marksman')) {
          early -= 1;
          mid += 1;
          late += 4;
        }
        
        if (archetype.includes('enchanter')) {
          early += 0;
          mid += 1;
          late += 3;
        }
        
        if (archetype.includes('splitpusher')) {
          early -= 1;
          mid += 2;
          late += 3;
        }
        
        // Normalize to 1-10 scale
        return {
          early: Math.max(1, Math.min(10, early)),
          mid: Math.max(1, Math.min(10, mid)),
          late: Math.max(1, Math.min(10, late))
        };
      };
      
      // Calculate score for each champion
      const scoredChampions = champions.map(champion => {
        const laneStats = champion.lanes[lane];
        const archetype = getArchetype(champion);
        const gamePhase = getGamePhaseStrengths(champion);

        // Basic score from champion stats
        let score = (
          laneStats.winRate * metaFactors.winRateWeight * 100 +
          laneStats.pickRate * metaFactors.pickRateWeight * 100 +
          champion.banRate * metaFactors.banRateWeight * 100 +
          laneStats.score * metaFactors.laneScoreWeight
        );

        // Handle matchup data if we have an enemy champion
        let counters: string[] = [];
        let counteredBy: string[] = [];

        if (enemyChampionId) {
          // Check if this champion counters the enemy
          const champId = Number(champion.key);

          // Calculate matchup advantage
          if (getChampionsCounteredBy(champId).includes(enemyChampionId)) {
            // This champion counters the enemy
            counters.push(getChampionNameById(enemyChampionId));
            score += 15; // Significant bonus for countering the opponent
          }

          if (getChampionCounters(champId).includes(enemyChampionId)) {
            // This champion is countered by the enemy
            counteredBy.push(getChampionNameById(enemyChampionId));
            score -= 10; // Penalty for being countered
          }
        }
        
        // Apply lane-specific bonuses
        const laneFactor = laneFactors[lane];
        
        // Apply archetype bonuses
        if (lane === 'TOP' && (archetype.includes('tank') || archetype.includes('bruiser') || archetype.includes('splitpusher'))) {
          score *= (1 + laneFactor.durabilityBonus);
        }
        
        if (lane === 'JUNGLE' && (archetype.includes('tank') || archetype.includes('assassin'))) {
          score *= (1 + laneFactor.ganksBonus);
        }
        
        if (lane === 'MID' && (archetype.includes('mage') || archetype.includes('assassin'))) {
          score *= (1 + laneFactor.burstDamageBonus);
        }
        
        if (lane === 'BOTTOM' && archetype.includes('marksman')) {
          score *= (1 + laneFactor.sustainedDamageBonus);
        }
        
        if (lane === 'SUPPORT' && (archetype.includes('enchanter') || archetype.includes('engage') || archetype.includes('utility'))) {
          score *= (1 + laneFactor.utilityBonus);
        }
        
        // Game phase adjustments based on current meta
        // Assume early game meta - adjust as needed
        const metaPhase = { early: 0.5, mid: 0.3, late: 0.2 };
        score += (gamePhase.early * metaPhase.early + gamePhase.mid * metaPhase.mid + gamePhase.late * metaPhase.late);
        
        // Calculate reasons for recommendation
        const reasons = [];
        
        // Win rate reason
        if (laneStats.winRate > 0.53) {
          reasons.push(`High win rate (${(laneStats.winRate * 100).toFixed(1)}%)`);
        } else if (laneStats.winRate > 0.50) {
          reasons.push(`Solid win rate (${(laneStats.winRate * 100).toFixed(1)}%)`);
        }
        
        // Lane-specific reason
        reasons.push(getLaneSpecificReason(champion, lane));
        
        // Game phase reason
        if (gamePhase.early > 7) {
          reasons.push('Strong early game presence');
        } else if (gamePhase.mid > 7) {
          reasons.push('Powerful mid-game spike');
        } else if (gamePhase.late > 7) {
          reasons.push('Excellent late-game scaling');
        }
        
        // Meta reason
        if (champion.tier === 'S') {
          reasons.push('Currently S-tier in the meta');
        } else if (champion.tier === 'A') {
          reasons.push('Strong A-tier pick in the current meta');
        }
        
        // Team composition reason
        const teamCompReason = this.getTeamCompReason(champion, archetype);
        if (teamCompReason) {
          reasons.push(teamCompReason);
        }
        
        // Add matchup reasons if applicable
        if (enemyChampionId) {
          if (counters.length > 0) {
            reasons.push(`Strong counter against ${counters.join(', ')}`);
          }

          if (counteredBy.length > 0) {
            reasons.push(`Be careful - countered by ${counteredBy.join(', ')}`);
          }
        }

        return {
          champion,
          score,
          reasons,
          counters: counters.length > 0 ? counters : undefined,
          counteredBy: counteredBy.length > 0 ? counteredBy : undefined
        };
      });
      
      // Sort by score and pick top champions
      const result = scoredChampions
        .sort((a, b) => b.score - a.score)
        .slice(0, count);
      
      // Add a contextual intro for each champion to make it feel more like AI output
      const finalResults = result.map(recommendation => {
        const champion = recommendation.champion;
        const intro = this.getChampionIntro(champion, lane);
        
        return {
          ...recommendation,
          reasons: [intro, ...recommendation.reasons]
        };
      });
      
      resolve(finalResults);
    });
  }
  
  /**
   * Generate an introductory statement about a champion
   */
  private getChampionIntro(champion: Champion, lane: Lane): string {
    const intros = [
      `${champion.name} excels in the ${lane.toLowerCase()} role`,
      `${champion.name} is particularly effective as a ${lane.toLowerCase()} champion`,
      `As ${champion.name}, you can dominate the ${lane.toLowerCase()} position`,
      `${champion.name} brings unique strengths to the ${lane.toLowerCase()} role`,
      `${champion.name}'s kit is well-suited for ${lane.toLowerCase()}`
    ];
    
    return intros[Math.floor(Math.random() * intros.length)];
  }
  
  /**
   * Generate a reason related to team composition
   */
  private getTeamCompReason(champion: Champion, archetypes: string[]): string | null {
    if (archetypes.includes('tank')) {
      return 'Provides much-needed tankiness for balanced team compositions';
    }
    
    if (archetypes.includes('assassin')) {
      return 'Offers backline access to eliminate priority targets';
    }
    
    if (archetypes.includes('mage')) {
      return 'Brings valuable magical damage to balance team damage profile';
    }
    
    if (archetypes.includes('marksman')) {
      return 'Provides consistent damage output needed in extended fights';
    }
    
    if (archetypes.includes('enchanter')) {
      return 'Offers team-wide protection and sustain';
    }
    
    if (archetypes.includes('engage')) {
      return 'Provides reliable fight initiation to secure objectives';
    }
    
    if (archetypes.includes('utility')) {
      return 'Brings versatile utility to enable teammates';
    }
    
    return null;
  }
  
  /**
   * Fallback method if AI recommendations fail
   */
  private getFallbackRecommendations(
    champions: Champion[],
    lane: Lane,
    count: number
  ): ChampionRecommendation[] {
    return champions
      .sort((a, b) => b.lanes[lane].score - a.lanes[lane].score)
      .slice(0, count)
      .map(champion => {
        const laneStats = champion.lanes[lane];
        
        // Basic reasons
        const reasons = [
          `${(laneStats.winRate * 100).toFixed(1)}% win rate in ${lane.toLowerCase()}`,
          `Good pick for ${lane.toLowerCase()} in the current meta`
        ];
        
        // Add tier if available
        if (champion.tier) {
          reasons.push(`${champion.tier}-tier champion overall`);
        }
        
        return {
          champion,
          score: laneStats.score,
          reasons
        };
      });
  }
  
  /**
   * Load recommendations from cache
   */
  private async loadFromCache(lane: Lane): Promise<ChampionRecommendation[] | null> {
    try {
      if (!fs.existsSync(this.cacheFile)) {
        return null;
      }

      const stats = fs.statSync(this.cacheFile);
      const isExpired = Date.now() - stats.mtimeMs > this.cacheLifetime;

      if (isExpired) {
        return null;
      }

      const data = JSON.parse(fs.readFileSync(this.cacheFile, 'utf-8'));

      if (!data[lane]) {
        return null;
      }

      // Validate the data to ensure it's an array of ChampionRecommendation objects
      if (Array.isArray(data[lane]) && data[lane].length > 0) {
        return data[lane] as ChampionRecommendation[];
      }

      return null;
    } catch (error) {
      console.error('Error loading recommendations from cache:', error);
      return null;
    }
  }
  
  /**
   * Save recommendations to cache
   */
  private async saveToCache(lane: Lane, recommendations: ChampionRecommendation[]): Promise<void> {
    try {
      // Create cache object
      let cacheData: Record<Lane, ChampionRecommendation[]> = {
        TOP: [],
        JUNGLE: [],
        MID: [],
        BOTTOM: [],
        SUPPORT: []
      };
      
      // Load existing cache if available
      if (fs.existsSync(this.cacheFile)) {
        cacheData = JSON.parse(fs.readFileSync(this.cacheFile, 'utf-8'));
      }
      
      // Update with new recommendations
      cacheData[lane] = recommendations;
      
      // Ensure directory exists
      const dir = path.dirname(this.cacheFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write to cache
      fs.writeFileSync(this.cacheFile, JSON.stringify(cacheData, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving recommendations to cache:', error);
    }
  }
}