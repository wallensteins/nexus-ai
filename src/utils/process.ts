import { exec } from 'child_process';
import { LcuCredentials } from '../types';

/**
 * Get the League of Legends client credentials by finding the running client process
 * and extracting the authentication information.
 */
export async function getLcuCredentials(): Promise<LcuCredentials | null> {
  try {
    // Check for League client process based on platform
    const platform = process.platform;
    let command = '';

    if (platform === 'win32') {
      command = 'wmic process where name="LeagueClientUx.exe" get commandline';
    } else if (platform === 'darwin') {
      // macOS specific command
      command = 'ps -A | grep "[L]eague of Legends"';
    } else {
      // Linux and other platforms
      command = 'ps -A | grep "[L]eagueClientUx"';
    }

    console.log(`Searching for League client on ${platform}...`);

    return new Promise((resolve, reject) => {
      exec(command, (error, stdout) => {
        if (error) {
          console.log(`Error executing process search command: ${error.message}`);
          resolve(null);
          return;
        }

        if (!stdout || (platform !== 'darwin' && !stdout.includes('LeagueClientUx'))) {
          console.log('League client not found. Make sure the client is running.');
          resolve(null);
          return;
        }

        try {
          // Extract authentication arguments from command line
          const portMatch = stdout.match(/--app-port=([0-9]+)/);
          const passwordMatch = stdout.match(/--remoting-auth-token=([\w-]+)/);
          const pidMatch = stdout.match(/--app-pid=([0-9]+)/);

          if (!portMatch || !passwordMatch) {
            console.log('Could not extract League client credentials.');
            resolve(null);
            return;
          }

          const port = parseInt(portMatch[1], 10);
          const password = passwordMatch[1];
          const processId = pidMatch ? parseInt(pidMatch[1], 10) : 0;

          const credentials: LcuCredentials = {
            protocol: 'https',
            address: '127.0.0.1',
            port,
            username: 'riot',
            password,
            processId
          };

          resolve(credentials);
        } catch (parseError) {
          console.error('Error parsing League client process:', parseError);
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('Error getting League client credentials:', error);
    return null;
  }
}