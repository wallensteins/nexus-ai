import fetch from 'node-fetch';
import WebSocket from 'ws';
import https from 'https';
import { LcuCredentials, ChampSelectSession, Lane } from '../types';

export class LcuApi {
  private credentials: LcuCredentials;
  private agent: https.Agent;
  private webSocket: WebSocket | null = null;
  private champSelectCallbacks: Array<(session: ChampSelectSession) => void> = [];

  constructor(credentials: LcuCredentials) {
    this.credentials = credentials;
    // Create HTTPS agent that ignores self-signed certificate errors
    this.agent = new https.Agent({
      rejectUnauthorized: false
    });
  }

  /**
   * Make an HTTP request to the LCU API
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.credentials.protocol}://${this.credentials.address}:${this.credentials.port}${endpoint}`;
    const auth = Buffer.from(`${this.credentials.username}:${this.credentials.password}`).toString('base64');

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined,
        // @ts-ignore - Node fetch types issue with agent
        agent: this.agent
      });

      if (!response.ok) {
        throw new Error(`LCU API error: ${response.status} ${response.statusText}`);
      }

      if (response.headers.get('content-length') === '0') {
        return {} as T;
      }

      return await response.json() as T;
    } catch (error) {
      console.error(`Error making request to ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get the current champion select session, if any
   */
  async getChampSelectSession(): Promise<ChampSelectSession | null> {
    try {
      return await this.request<ChampSelectSession>('GET', '/lol-champ-select/v1/session');
    } catch (error) {
      // No champion select session active
      return null;
    }
  }

  /**
   * Get the player's assigned lane in champion select
   */
  async getAssignedLane(): Promise<Lane | null> {
    try {
      const session = await this.getChampSelectSession();
      
      if (!session) {
        return null;
      }

      const playerData = session.myTeam.find(p => p.cellId === session.localPlayerCellId);
      
      if (!playerData) {
        return null;
      }

      // Convert from LCU format to our Lane type
      const laneMap: Record<string, Lane> = {
        'TOP': 'TOP',
        'JUNGLE': 'JUNGLE',
        'MIDDLE': 'MID',
        'BOTTOM': 'BOTTOM',
        'UTILITY': 'SUPPORT'
      };

      return laneMap[playerData.assignedPosition] || null;
    } catch (error) {
      console.error('Error getting assigned lane:', error);
      return null;
    }
  }

  /**
   * Connect to the LCU WebSocket for real-time events
   */
  connectToWebSocket(): void {
    try {
      const auth = Buffer.from(`${this.credentials.username}:${this.credentials.password}`).toString('base64');
      const url = `wss://${this.credentials.address}:${this.credentials.port}/`;

      console.log('Connecting to League client WebSocket...');

      // Create WebSocket with proper error handling
      this.webSocket = new WebSocket(url, {
        headers: {
          'Authorization': `Basic ${auth}`
        },
        rejectUnauthorized: false,
        handshakeTimeout: 5000 // 5 second timeout for connection
      });

      this.webSocket.on('open', () => {
        console.log('Connected to LCU WebSocket');
        // Subscribe to champion select events
        this.webSocket?.send(JSON.stringify([5, 'OnJsonApiEvent_lol-champ-select_v1_session']));
      });

      this.webSocket.on('message', (data: WebSocket.Data) => {
        try {
          // Check if data is valid before parsing
          const dataStr = data.toString().trim();
          if (!dataStr) {
            return; // Skip empty messages
          }

          // Parse the JSON message
          const message = JSON.parse(dataStr);

          // Debug log - comment out in production
          // console.log('WebSocket message type:', message[0]);

          // Champion select events come with type 8
          if (Array.isArray(message) &&
              message[0] === 8 &&
              message[2] &&
              typeof message[2] === 'object' &&
              message[2].data &&
              message[2].uri === '/lol-champ-select/v1/session') {

            const session = message[2].data as ChampSelectSession;
            this.champSelectCallbacks.forEach(callback => callback(session));
          }
        } catch (error) {
          // More detailed error logging
          console.error('Error processing WebSocket message:', error);
          console.error('Message data type:', typeof data);
          if (typeof data === 'string' || data instanceof Buffer) {
            // Log a snippet of the data for debugging (first 100 chars)
            const preview = data.toString().slice(0, 100);
            console.error('Message preview:', preview);
          }
        }
      });

      this.webSocket.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      this.webSocket.on('close', () => {
        console.log('Disconnected from LCU WebSocket');
      });
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }

  /**
   * Register a callback for champion select events
   */
  onChampSelect(callback: (session: ChampSelectSession) => void): void {
    this.champSelectCallbacks.push(callback);
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    if (this.webSocket) {
      this.webSocket.terminate();
      this.webSocket = null;
    }
  }
}