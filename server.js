// server.js
const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000; 

const PLAYER_DATA_PATH = 'C:/Players/players.json'; 

// get player data and save to file
async function getPlayerData() {
  try {
    console.log('Fetching leaderboard data...')
    const leaderboardResponse = await axios.get('https://na.api.riotgames.com/val/ranked/v1/leaderboards/by-act/ec876e6c-43e8-fa63-ffc1-2e8d4db25525', {
      params: {
        size: 50,
        startIndex: 0,
        api_key: 'RGAPI-626bcaf0-3200-497d-886c-f4534ae0d5e5'
      }
    });
    console.log('Successfully fetched leaderboard data.');
    const players = leaderboardResponse.data.players;
    const playerArray = [];

    for (const player of players) {
      //avoid rate limiting with delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      let valorantStatsResponse; 
       try{
        valorantStatsResponse = await axios.get(`https://api1.valorantstats.xyz/v1/collect/${player.gameName}/${player.tagLine}`);
      }
      catch (error) {
        console.error(`An error occurred while fetching player data for ${player.gameName}#${player.tagLine}: `);
        continue;
      }
      valorantStatsResponse ? console.log(`Successfully fetched player data for ${player.gameName}/${player.tagLine}`) : console.log(`Failed to fetch player data for ${player.gameName}/${player.tagLine}`);
      if(valorantStatsResponse) playerArray.push(valorantStatsResponse.data);
    }
    // save to file
    await fs.writeFile(PLAYER_DATA_PATH, JSON.stringify(playerArray, null, 2), 'utf-8');
    console.log('Player data saved successfully.');

  } catch (error) {
    console.error('An error occurred while fetching player data: ');
  }
}

app.get('/collect-players', async (req, res) => {
  await getPlayerData();
  res.send('Player data collection initiated.');
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running on port ${PORT}`);
});