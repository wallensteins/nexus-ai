import chalk from 'chalk';
import figlet from 'figlet';
import inquirer from 'inquirer';
import { ChampionRecommendation, Lane } from '../types';

/**
 * CLI interface for the champion recommender
 */
export class CliInterface {
  /**
   * Display the application header
   */
  displayHeader(): void {
    console.clear();
    console.log(
      chalk.blue(
        figlet.textSync('NexusCrusher', {
          font: 'Standard',
          horizontalLayout: 'default',
          verticalLayout: 'default'
        })
      )
    );
    console.log(chalk.yellow('League Champion Recommender - v1.0.0'));
    console.log(chalk.dim('Type "help" for a list of commands\n'));
  }
  
  /**
   * Display help information
   */
  displayHelp(): void {
    console.log(chalk.bold('\nAvailable Commands:'));
    console.log(`${chalk.green('recommend')} - Get recommendations for your current lane (if in champion select)`);
    console.log(`${chalk.green('recommend <lane>')} - Get recommendations for a specific lane (top, jungle, mid, bottom, support)`);
    console.log(`${chalk.green('help')} - Show this help menu`);
    console.log(`${chalk.green('exit')} - Exit the application\n`);
  }
  
  /**
   * Display recommendations for a lane
   */
  displayRecommendations(recommendations: ChampionRecommendation[], lane: Lane): void {
    console.log(chalk.bold(`\nTop Champion Recommendations for ${lane}:`));
    console.log(chalk.dim('-------------------------------------------'));

    recommendations.forEach((rec, index) => {
      // Champion name and basic stats
      console.log(chalk.blue.bold(`${index + 1}. ${rec.champion.name}`),
        chalk.dim(`(${rec.champion.title})`));

      // Win/pick rates
      const laneStats = rec.champion.lanes[lane];
      console.log(
        `   Win Rate: ${chalk.green((laneStats.winRate * 100).toFixed(1) + '%')}, ` +
        `Pick Rate: ${chalk.yellow((laneStats.pickRate * 100).toFixed(1) + '%')}, ` +
        `Score: ${chalk.cyan(laneStats.score.toFixed(1))}`
      );

      // Why this champion is recommended
      console.log(chalk.magenta('   Why: ') + rec.reasons.join(', '));

      // Display matchup information if available
      if (rec.counters && rec.counters.length > 0) {
        console.log(chalk.green('   Counters: ') + rec.counters.join(', '));
      }

      if (rec.counteredBy && rec.counteredBy.length > 0) {
        console.log(chalk.red('   Countered by: ') + rec.counteredBy.join(', '));
      }

      console.log(chalk.dim('-------------------------------------------'));
    });
    console.log('');
  }
  
  /**
   * Get lane input from the user
   */
  async promptForLane(): Promise<Lane> {
    const { lane } = await inquirer.prompt([
      {
        type: 'list',
        name: 'lane',
        message: 'Select a lane:',
        choices: [
          { name: 'Top', value: 'TOP' },
          { name: 'Jungle', value: 'JUNGLE' },
          { name: 'Mid', value: 'MID' },
          { name: 'Bottom (ADC)', value: 'BOTTOM' },
          { name: 'Support', value: 'SUPPORT' }
        ]
      }
    ]);
    
    return lane;
  }
  
  /**
   * Display error message
   */
  displayError(message: string): void {
    console.log(chalk.red(`\nError: ${message}\n`));
  }
  
  /**
   * Display status message
   */
  displayStatus(message: string): void {
    console.log(chalk.yellow(`\n${message}\n`));
  }
  
  /**
   * Display champion select detected message
   */
  displayChampSelectDetected(lane: Lane | null): void {
    console.log(chalk.green('\nChampion select detected!'));

    if (lane) {
      console.log(chalk.yellow(`You've been assigned to ${lane}`));
      console.log(chalk.dim('Showing automatic recommendations for your lane...'));
    } else {
      console.log(chalk.yellow('No lane assignment detected yet'));
      console.log(chalk.dim('Recommendations will appear automatically when your lane is assigned'));
    }

    console.log(chalk.dim('Recommendations will update if an enemy champion is picked'));
    console.log(chalk.dim('Type "recommend [lane]" for custom recommendations\n'));
  }
  
  /**
   * Parse user command input
   */
  parseCommand(input: string): { command: string; args: string[] } {
    const parts = input.trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    return { command, args };
  }
  
  /**
   * Get user command input
   */
  async getCommandInput(): Promise<string> {
    const { command } = await inquirer.prompt([
      {
        type: 'input',
        name: 'command',
        message: '>',
        prefix: ''
      }
    ]);
    
    return command;
  }
}