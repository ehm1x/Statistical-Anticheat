const fs = require('fs');
const path = require('path');
const math = require('mathjs');

const analyticsFilePath = 'C:/Players/analytics.json';
const analyticsData = JSON.parse(fs.readFileSync(analyticsFilePath, 'utf-8'));

//
//CONFIG
//

const displayTopPlayers = 20;     // amount of players to display 
const startingIndex = 0;          // where to start displaying players from in the list
const gamesPlayedThreshold = 20;  // minimum amount of games played to be considered for the leaderboard
const headshotThreshold = 50;     // minimum amount of headshots to be considered for the leaderboard
const killsThreshold = 75;        // minimum amount of kills to be considered for the leaderboard
const deathsThreshold = 20;       // minimum amount of deaths to be considered for the leaderboard


async function main() {
  const filePath = path.join('C:/Players', 'players.json');
  const analyticsFilePath = path.join('C:/Players', 'analytics.json');

  try {
    const playersData = JSON.parse(await fs.readFileSync(filePath, 'utf-8'));
    const stats = {
      headshotPercentages: [],
      kds: [],
      winPercentages: [],
      firstBloods: [],
      avgPositions: []
    };

    playersData.forEach(player => {
      const { competitive_stats } = player;
      if (competitive_stats) {
        if (typeof competitive_stats.headshot_percentage === 'number') 
        stats.headshotPercentages.push(competitive_stats.headshot_percentage);

        if (typeof competitive_stats.kd === 'number') 
        stats.kds.push(competitive_stats.kd);

        if (typeof competitive_stats.win_percentage === 'number')
         stats.winPercentages.push(competitive_stats.win_percentage);

        if (typeof competitive_stats.first_bloods === 'number' && typeof competitive_stats.rounds_played === 'number')
         stats.firstBloods.push(competitive_stats.first_bloods / competitive_stats.rounds_played);

        if (typeof competitive_stats.avg_position === 'number') 
        stats.avgPositions.push(competitive_stats.avg_position);
      }
    });

    const means = {};
    const standardDeviations = {};
    for (const key in stats) {
      means[key] = math.mean(stats[key]);
      standardDeviations[key] = math.std(stats[key]);
    }

    playersData.forEach(player => {
      const { competitive_stats } = player;
      if (competitive_stats) {
        if (typeof competitive_stats.headshot_percentage === 'number') {
          competitive_stats.z_score_headshotPercentage = (competitive_stats.headshot_percentage - means.headshotPercentages) / standardDeviations.headshotPercentages;
        }
        if (typeof competitive_stats.kd === 'number') {
          competitive_stats.z_score_kd = (competitive_stats.kd - means.kds) / standardDeviations.kds;
        }
        if (typeof competitive_stats.win_percentage === 'number') {
          competitive_stats.z_score_winPercentage = (competitive_stats.win_percentage - means.winPercentages) / standardDeviations.winPercentages;
        }
        if (typeof competitive_stats.first_bloods === 'number' && typeof competitive_stats.rounds_played === 'number') {
          competitive_stats.z_score_firstBloods = ((competitive_stats.first_bloods / competitive_stats.rounds_played) - means.firstBloods) / standardDeviations.firstBloods;
        }
        if (typeof competitive_stats.avg_position === 'number') {
          competitive_stats.z_score_avgPosition = (competitive_stats.avg_position - means.avgPositions) / standardDeviations.avgPositions;
        }
  
        competitive_stats.cheater_score = calculateTotalCheaterScore(competitive_stats);
      }
    });

    // Sort players by cheater_score in descending order
    playersData.sort((a, b) => {
        const scoreA = a.competitive_stats?.cheater_score ?? 0;
        const scoreB = b.competitive_stats?.cheater_score ?? 0;
        return scoreB - scoreA;
      });

      //filter players that have null values for the interesting stats;
      const validPlayers = playersData.filter(playerHasValidStats);
      let topPlayers = validPlayers.slice(startingIndex, displayTopPlayers);
   
      topPlayers.forEach((player, index) => {
        const current = player.competitive_stats;
        const killDeathRatio = current.deaths ? ` (${current.kills}/${current.deaths})` : '';
        console.log(`Cheater Rank #${index + 1}:`);
        console.log(`Game Name: ${player.gameName}#${player.tagLine}`);
        console.log(`Cheater Score: ${formatNumber(current.cheater_score)}`);
        
        console.log(` - Headshot Percentage: Value - ${formatNumber(current.headshot_percentage * 100, 0)}%, AVG - ${formatNumber(analyticsData.means.headshotPercentages * 100, 0)}%, Z-Score - ${formatNumber(current.z_score_headshotPercentage)}`);
        console.log(` - KD: Value - ${formatNumber(current.kd)}${killDeathRatio}, AVG - ${formatNumber(analyticsData.means.kds)}, Z-Score - ${formatNumber(current.z_score_kd)}`);        
        console.log(` - Win Percentage: Value - ${formatNumber(current.win_percentage * 100, 0)}%`);
        console.log(`    Games Played: ${current.games_played}, Wins: ${current.wins}`);
        console.log(`    AVG - ${formatNumber(analyticsData.means.winPercentages * 100, 0)}%, Z-Score - ${formatNumber(current.z_score_winPercentage)}`);
        console.log(` - First Blood Odds Per Round: Value - ${formatNumber(current.first_bloods / current.rounds_played * 100, 0 )}%, AVG - ${formatNumber(analyticsData.means.firstBloods * 100, 0)}%, Z-Score - ${formatNumber(current.z_score_firstBloods)}`);
        console.log(` - Average Position: Value - ${formatNumber(current.avg_position)}, AVG - ${formatNumber(analyticsData.means.avgPositions)}, Z-Score - ${formatNumber(-current.z_score_avgPosition)}`);        
        console.log('---------------------------------------------------');
      });

    await fs.writeFileSync(filePath, JSON.stringify(playersData, null, 2));
    await fs.writeFileSync(analyticsFilePath, JSON.stringify({ means, standardDeviations }, null, 2));
    console.log('Player statistics and analytics updated and saved.');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();

//
// Helper functions
//

function calculateCheaterScore(zScore, a, b) {
  const c = Math.exp(b * 1);
  if (zScore <= 1) return 0;
  const cheaterScore = a * (Math.exp(b * zScore) - c);
  return cheaterScore > 0 ? cheaterScore : 0;
}

function calculateTotalCheaterScore(stats) {
  const scoreComponents = {
    // 2nd paramater will affect the steepness of the exponential curve, large scales output up putting more emphasis 
    // 3rd parameter will affect the rate of growth, larger is a steeper curve, and lower is a more linear curve
    'z_score_headshotPercentage': calculateCheaterScore(stats['z_score_headshotPercentage'], 0.5, 0.4),
    'z_score_kd': calculateCheaterScore(stats['z_score_kd'], 0.5, 0.4),
    'z_score_winPercentage': calculateCheaterScore(stats['z_score_winPercentage'], 0.85, 0.7),
    'z_score_firstBloods': calculateCheaterScore(stats['z_score_firstBloods'], 0.5, 0.4),
    'z_score_avgPosition': calculateCheaterScore(-stats['z_score_avgPosition'], 0.5, 0.4) // Negative z-score for avg_position being higher (Lower is better)
  };


  // If a player does not have enough data, we do not score them on the given metric 
  if(stats.games_played < gamesPlayedThreshold) {
    scoreComponents.z_score_winPercentage = 0;
    scoreComponents.z_score_avgPosition = 0;
  }    
  if(stats.headshots < headshotThreshold) scoreComponents.z_score_headshotPercentage = 0; 
  if(stats.rounds_played < gamesPlayedThreshold) scoreComponents.z_score_firstBloods = 0;
  if(stats.kills < killsThreshold || stats.deaths < deathsThreshold) scoreComponents.z_score_kd = 0;

  //sum and return 
  return Object.keys(scoreComponents).reduce((sum, key) => {
    if (stats.hasOwnProperty(key)) {
      return sum + scoreComponents[key];
    }
    return sum;
  }, 0);
}

function playerHasValidStats(player) {
  const stats = player.competitive_stats;
  return stats && 
    stats.cheater_score !== null && 
    (stats.headshot_percentage !== null || stats.z_score_headshotPercentage !== null) &&
    stats.kd !== null && 
    stats.z_score_kd !== null &&
    stats.win_percentage !== null &&
    stats.z_score_winPercentage !== null &&
    stats.first_bloods !== null &&
    stats.rounds_played !== null &&
    stats.z_score_firstBloods !== null &&
    stats.avg_position !== null &&
    stats.z_score_avgPosition !== null; 
}

const formatNumber = (value, digits = 2) => {
  return typeof value === 'number' ? value.toFixed(digits) : 'N/A';
};