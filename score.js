const fs = require('fs');

// calculate cheater score based on z-score and curve parameters
function calculateCheaterScore(zScore, a, b) {
  const c = Math.exp(b * 1); // Offset to make sure a z-score of 1 results in a cheater score of 0

  if (zScore <= 1) {
    return 0; // No cheater score for z-scores of 1 or less
  } else {
    const cheaterScore = a * (Math.exp(b * zScore) - c);
    return cheaterScore > 0 ? cheaterScore : 0; // Ensure we don't return negative scores
  }
}

// player data
const playerFilePath = 'C:/Players/players.json';
const players = JSON.parse(fs.readFileSync(playerFilePath, 'utf-8'));

// analytics data
const analyticsFilePath = 'C:/Players/analytics.json';
const analyticsData = JSON.parse(fs.readFileSync(analyticsFilePath, 'utf-8'));

// sum positive z-scores with adjustble emphasis on each stat
const calculateTotalCheaterScore = (stats, analytics) => {
  const scoreComponents = {
    'z_score_headshotPercentage': calculateCheaterScore(stats.z_score_headshotPercentage, 0.5, 0.4), // Less emphasis
    'z_score_kd': calculateCheaterScore(stats.z_score_kd, 0.5, 0.4),
    'z_score_winPercentage': calculateCheaterScore(stats.z_score_winPercentage, 0.85, 0.7), // More emphasis
    'z_score_firstBloods': calculateCheaterScore(stats.z_score_firstBloods, 0.5, 0.4),
    'z_score_avgPosition': calculateCheaterScore(-stats.z_score_avgPosition, 0.5, 0.4) // Negative z-score for avg_position
  };

  return Object.values(scoreComponents).reduce((sum, value) => sum + value, 0);
};

// Calculate cheater score for each player and add to competitive_stats
players.forEach(player => {
  if (player.competitive_stats) {
    player.competitive_stats.cheater_score = calculateTotalCheaterScore(player.competitive_stats, analyticsData);
  }
});

// Sort players by highest cheater score 
players.sort((a, b) => b.competitive_stats.cheater_score - a.competitive_stats.cheater_score);

// Select the top x players
const topPlayers = players.slice(0, 5); // Change the second paramater to get more or less players
const formatNumber = (value, digits = 2) => {
  return value !== null && value !== undefined ? value.toFixed(digits) : 'N/A';
};
// display :P
topPlayers.forEach((player, index) => {
  console.log(`Cheater Rank #${index + 1}:`);
  console.log(`Game Name: ${player.gameName}`);
  console.log(`Cheater Score: ${formatNumber(player.competitive_stats.cheater_score)}`);
  console.log(` - Headshot Percentage: Value - ${formatNumber(player.competitive_stats.headshot_percentage * 100, 0)}%, Z-Score - ${formatNumber(player.competitive_stats.z_score_headshotPercentage)}, Mean - ${formatNumber(analyticsData.means.mean_headshotPercentage * 100, 0)}%`);
  console.log(` - KD: Value - ${formatNumber(player.competitive_stats.kd)}, Z-Score - ${formatNumber(player.competitive_stats.z_score_kd)}, Mean - ${formatNumber(analyticsData.means.mean_kd)}`);
  console.log(` - Win Percentage: Value - ${formatNumber(player.competitive_stats.win_percentage * 100, 0)}%, Z-Score - ${formatNumber(player.competitive_stats.z_score_winPercentage)}, Mean - ${formatNumber(analyticsData.means.mean_winPercentage * 100, 0)}%`);
  console.log(` - First Blood Odds Per Round: Value - ${formatNumber(player.competitive_stats.first_bloods / player.competitive_stats.rounds_played * 100, 0 )}%, Z-Score - ${formatNumber(player.competitive_stats.z_score_firstBloods)}, Mean - ${formatNumber(analyticsData.means.mean_firstBloods)}`);
  console.log(` - Average Position: Value - ${formatNumber(player.competitive_stats.avg_position)}, Z-Score - ${formatNumber(-player.competitive_stats.z_score_avgPosition)}, Mean - ${formatNumber(analyticsData.means.mean_avgPosition)}`);
  console.log('---------------------------------------------------');
});

// Write the updated players data back to the file to save cheaterscores 
fs.writeFileSync(playerFilePath, JSON.stringify(players, null, 2), 'utf-8');