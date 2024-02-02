const express = require("express");
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const app = express();
const PORT = 3000;

let success = 0;
let fail = 0;

const PLAYER_DATA_PATH = "C:/Players/players.json";
const riotApiKey = "Enter your api key from riot api here";

async function getPlayerData(Index) {
  try {
    console.log("Fetching leaderboard data...");
    const leaderboardResponse = await axios.get(
      "https://na.api.riotgames.com/val/ranked/v1/leaderboards/by-act/ec876e6c-43e8-fa63-ffc1-2e8d4db25525",
      {
        params: {
          size: 200,
          startIndex: Index,
          api_key: riotApiKey,
        },
      }
    );
    console.log("Successfully fetched leaderboard data.");
    const players = leaderboardResponse.data.players;
    const playerArray = [];

    for (const player of players) {
      let valorantStatsResponse;
      try {
        valorantStatsResponse = await axios.get(
          `https://api1.valorantstats.xyz/v1/collect/${player.gameName}/${player.tagLine}`
        );
      } catch (error) {
        fail++;
        console.error(`An error occurred while fetching player data for ${player.gameName}#${player.tagLine}: ${success + fail}`);
        continue;
      }

      if (valorantStatsResponse) {
        // cleanup 90% of useless data
        if (valorantStatsResponse.data) {
          delete valorantStatsResponse.data.weapon_stats;
          delete valorantStatsResponse.data.map_stats;
          delete valorantStatsResponse.data.gameMode_stats;
          delete valorantStatsResponse.data.agent_stats;
          delete valorantStatsResponse.data.act_stats;
          delete valorantStatsResponse.data.act_percentiles;
          delete valorantStatsResponse.data.deathmatch_stats;
          delete valorantStatsResponse.data.custom_stats;
          delete valorantStatsResponse.data.spikerush_stats;
          delete valorantStatsResponse.data.unrated_stats;

        }
        playerArray.push(valorantStatsResponse.data);
        success++;
      }
      valorantStatsResponse
        ? console.log(
            `Successfully fetched player data for ${player.gameName}#${player.tagLine} ${success + fail}`)
        : console.log(
            `Failed to fetch player data for ${player.gameName}#${player.tagLine} ${success + fail}`);
    }
    
    async function appendToJsonFile(filePath, newPlayers) {
      try {
        let data;
        try {
          data = await fs.readFile(filePath, "utf-8");
        } catch (error) {
          if (error.code === "ENOENT") {
            console.log("File not found. Creating new file.");
            data = "[]"; // Create a new JSON array if the file does not exist
          } else {
            throw error; // Rethrow the error if it's not a 'file not found' error
          }
        }

        const players = JSON.parse(data); // Parse the existing data or empty array

        // Combine old and new players
        const combinedPlayers = [...players, ...newPlayers];

        // Write the combined data back to the file
        await fs.writeFile(
          filePath,
          JSON.stringify(combinedPlayers, null, 2),
          "utf-8"
        );
        console.log("Player data appended successfully.");
      } catch (error) {
        console.error("An error occurred while appending to JSON file:", error);
      }
    }
    await appendToJsonFile(PLAYER_DATA_PATH, playerArray);
    console.log("Player data saved successfully.");
    console.log(`Successfully fetched ${success} players.`);
    console.log(`Failed to fetch ${fail} players.`);
  } catch (error) {
    console.error("An error occurred while fetching player data: ", error);
  }
}

app.get("/collect-players", async (req, res) => {
  await getPlayerData();
  res.send("Player data collection initiated.");
});
//riot api maxes at 200 players, this places multiple request of size 200
async function GetPlayerGrouping() {
  for (let i = 0; i < 5; i++) {
    await getPlayerData(i * 200);
  }
}
GetPlayerGrouping();

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Server running on port ${PORT}`);
});
