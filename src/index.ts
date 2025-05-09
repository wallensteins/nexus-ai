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
      if (!inChampSelect) {
        inChampSelect = true;
        
        // Get assigned lane
        if (lcuApi) {
          currentLane = await lcuApi.getAssignedLane();
        }
        
        // Notify user
        cli.displayChampSelectDetected(currentLane);
      }
    });
    
    return true;
  }
  
  // Try to connect to the League client, but don't block app startup if it fails
  try {
    await connectToClient();
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
            cli.displayStatus(`Fetching recommendations for ${lane}...`);
            const recommendations = await recommender.getRecommendations(lane);
            cli.displayRecommendations(recommendations, lane);
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