import { getLcuCredentials } from './utils/process';
import { LcuApi } from './api/lcuApi';
import { ChampionApi } from './api/championApi';
import { ChampionRecommender } from './utils/recommender';
import { CliInterface } from './utils/cli';
import { Lane } from './types';

async function main() {
  // Initialize the CLI interface
  const cli = new CliInterface();
  cli.displayHeader();
  
  // Initialize champion data and recommender
  const championApi = new ChampionApi();
  const recommender = new ChampionRecommender(championApi);
  
  // Variables to track state
  let lcuApi: LcuApi | null = null;
  let currentLane: Lane | null = null;
  let inChampSelect = false;
  let lastSeenEnemyChampion: number | null = null;
  
  // Function to connect to the League client
  async function connectToClient() {
    cli.displayStatus('Searching for League of Legends client...');
    
    const credentials = await getLcuCredentials();
    
    if (!credentials) {
      cli.displayError('League client not found. Make sure the client is running.');
      return false;
    }
    
    cli.displayStatus('Connected to League client!');
    
    lcuApi = new LcuApi(credentials);
    
    // Set up WebSocket connection for real-time events
    lcuApi.connectToWebSocket();
    
    // Listen for champion select events
    lcuApi.onChampSelect(async (session) => {
      // First time entering champion select
      if (!inChampSelect) {
        inChampSelect = true;

        // Get assigned lane
        if (lcuApi) {
          currentLane = await lcuApi.getAssignedLane();
        }

        // Notify user
        cli.displayChampSelectDetected(currentLane);

        // Automatically show recommendations if lane is assigned
        if (currentLane) {
          await showLaneRecommendations(currentLane);
        }
      } else {
        // Already in champion select, check for updates
        const newLane = await lcuApi.getAssignedLane();

        // If lane has changed, update recommendations
        if (newLane && newLane !== currentLane) {
          currentLane = newLane;
          cli.displayStatus(`Lane assignment changed to ${currentLane}!`);
          await showLaneRecommendations(currentLane);
        }

        // Check if enemy champion was picked
        const enemyChampionId = await lcuApi.getLaneOpponent();

        // Only update if it's a new champion or first time seeing a champion
        if (enemyChampionId &&
            currentLane &&
            enemyChampionId !== lastSeenEnemyChampion) {

          lastSeenEnemyChampion = enemyChampionId;

          // Get champion name if possible
          let enemyName = "";
          try {
            // Dynamic import to avoid circular dependencies
            const { getChampionNameById } = await import('./data/matchups');
            enemyName = getChampionNameById(enemyChampionId);
            cli.displayStatus(`Enemy champion ${enemyName} picked! Updating recommendations...`);
          } catch (error) {
            cli.displayStatus(`Enemy champion picked! Updating recommendations...`);
          }

          // Show updated recommendations with enemy champion
          await showLaneRecommendations(currentLane, enemyChampionId);
        }
      }
    });
    
    return true;
  }
  
  /**
   * Helper function to show lane recommendations
   */
  async function showLaneRecommendations(lane: Lane, enemyChampionId?: number) {
    try {
      if (enemyChampionId) {
        cli.displayStatus(`Fetching recommendations for ${lane} against enemy champion ID ${enemyChampionId}...`);
      } else {
        cli.displayStatus(`Fetching recommendations for ${lane}...`);
      }

      const recommendations = await recommender.getRecommendations(lane, 5, enemyChampionId);
      cli.displayRecommendations(recommendations, lane);
    } catch (error) {
      console.error('Error showing lane recommendations:', error);
      cli.displayError('Failed to get recommendations. Please try again.');
    }
  }

  // Function to reset champion select state
  function resetChampSelectState() {
    inChampSelect = false;
    currentLane = null;
    lastSeenEnemyChampion = null;
    cli.displayStatus('Left champion select. Ready for your next game!');
  }

  // Function to periodically check if still in champion select
  async function startChampSelectMonitor() {
    // Only run if connected to client
    if (!lcuApi) return;

    // Check every 10 seconds
    setInterval(async () => {
      if (inChampSelect) {
        const stillInChampSelect = await lcuApi?.isInChampSelect();

        // If we've left champion select, reset state
        if (!stillInChampSelect) {
          resetChampSelectState();
        }
      }
    }, 10000);
  }

  // Try to connect to the League client, but don't block app startup if it fails
  try {
    await connectToClient();
    startChampSelectMonitor();
  } catch (error) {
    console.error('Failed to connect to League client:', error);
    cli.displayStatus('Running in standalone mode. Use "recommend <lane>" to get recommendations.');
  }
  
  // Main command loop
  let running = true;
  while (running) {
    try {
      const input = await cli.getCommandInput();
      const { command, args } = cli.parseCommand(input);
      
      switch (command) {
        case 'recommend': {
          let lane: Lane | null = null;
          
          // Check if lane was specified in the command
          if (args.length > 0) {
            const laneArg = args[0].toUpperCase();
            if (['TOP', 'JUNGLE', 'MID', 'MIDDLE', 'BOT', 'BOTTOM', 'ADC', 'SUPPORT', 'SUP'].includes(laneArg)) {
              // Map common lane names to our Lane type
              const laneMapping: Record<string, Lane> = {
                'TOP': 'TOP',
                'JUNGLE': 'JUNGLE',
                'MID': 'MID',
                'MIDDLE': 'MID',
                'BOT': 'BOTTOM',
                'BOTTOM': 'BOTTOM',
                'ADC': 'BOTTOM',
                'SUPPORT': 'SUPPORT',
                'SUP': 'SUPPORT'
              };
              lane = laneMapping[laneArg] as Lane;
            }
          } else if (currentLane) {
            // Use current lane from champion select
            lane = currentLane;
          } else {
            // Prompt user to select a lane
            lane = await cli.promptForLane();
          }
          
          if (lane) {
            // Check if there's an enemy champion in the same lane
            let enemyChampionId = null;
            if (lcuApi) {
              enemyChampionId = await lcuApi.getLaneOpponent();
            }

            // Use the helper function to show recommendations
            await showLaneRecommendations(lane, enemyChampionId);
          }
          break;
        }
        
        case 'help':
          cli.displayHelp();
          break;
        
        case 'connect':
          await connectToClient();
          break;
        
        case 'exit':
        case 'quit':
          running = false;
          if (lcuApi) {
            lcuApi.disconnect();
          }
          console.log('Goodbye!');
          process.exit(0);
          break;
        
        default:
          if (command) {
            cli.displayError(`Unknown command: ${command}`);
            cli.displayStatus('Type "help" for a list of available commands');
          }
          break;
      }
    } catch (error) {
      console.error('Error:', error);
      cli.displayError('An unexpected error occurred');
    }
  }
}

// Start the application
main().catch(console.error);