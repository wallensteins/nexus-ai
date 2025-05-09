# League Champion Recommender

A desktop application that enhances your League of Legends experience by providing champion recommendations during the pick phase based on your selected lane.

## Overview

This application is a simple but powerful CLI tool that recommends champions based on your selected lane during champion select.

## Features

- CLI-based champion recommendations for your selected lane
- Integration with the League of Legends Client API
- Up-to-date champion statistics and meta analysis

## How It Works

The application connects to the League of Legends Client API (LCU API) to detect when you're in champion select and which lane you've been assigned. It then provides tailored champion recommendations based on:

- Current meta statistics
- Champion win rates
- Champion popularity
- Lane-specific performance metrics

## Technical Implementation

The application uses the League Client Update (LCU) API, which is available locally when the League client is running. This API allows us to:

- Detect when a player enters champion select
- Identify the assigned lane
- Access real-time game state information

For champion recommendations, we either:
- Use Riot's Data Dragon API for champion data
- Pull statistics from community API sources
- Cache data locally for quick access even when offline

## Installation

1. Download the latest release from the releases page
2. Extract the files to your preferred location
3. Run the executable

Note: League of Legends must be installed and the client must be running for the application to work properly.

## Usage

After installation:
1. Start League of Legends
2. Open the command line interface for our app
3. When you enter champion select, the application will automatically detect your assigned lane
4. Type `recommend` to see a list of recommended champions for your lane

Additional commands:
- `recommend [lane]` - Get recommendations for a specific lane
- `help` - List all available commands
- `exit` - Close the application

## Development Setup

### Prerequisites
- Node.js v16+
- TypeScript
- League of Legends installed (for testing)

### Getting Started
1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm start` to launch the development version

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This application isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc.