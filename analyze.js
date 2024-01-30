const fs = require('fs');
const path = require('path')
// Function to calculate mean


function calculateMean(data) {
  return data.reduce((sum, value) => sum + value, 0) / data.length;
}

// Function to calculate variance
function calculateVariance(data, mean) {
  return data.reduce((sum, value) => sum + (value - mean) ** 2, 0) / data.length;
}

// Function to calculate standard deviation
function calculateStandardDeviation(variance) {
  return Math.sqrt(variance);
}

// Load player data
const filePath = 'C:/Players/players.json';
const analyticsFilePath = path.join('C:/Players', 'analytics.json');
const playersData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));


// Initialize arrays to hold stats data
const headshotPercentages = [];
const kds = [];
const winPercentages = [];
const firstBloods = [];
const avgPositions = [];

// Populate arrays with player stats
playersData.forEach(player => {
  headshotPercentages.push(player.competitive_stats.headshot_percentage);
  kds.push(player.competitive_stats.kd);
  winPercentages.push(player.competitive_stats.win_percentage);
  firstBloods.push(player.competitive_stats.first_bloods / player.competitive_stats.rounds_played);
  avgPositions.push(player.competitive_stats.avg_position);
});

// Calculate means
const means = {
  mean_headshotPercentage: calculateMean(headshotPercentages),
  mean_kd: calculateMean(kds),
  mean_winPercentage: calculateMean(winPercentages),
  mean_firstBloods: calculateMean(firstBloods),
  mean_avgPosition: calculateMean(avgPositions),
};

// Calculate variances and standard deviations
const variances = {
  variance_headshotPercentage: calculateVariance(headshotPercentages, means.mean_headshotPercentage),
  variance_kd: calculateVariance(kds, means.mean_kd),
  variance_winPercentage: calculateVariance(winPercentages, means.mean_winPercentage),
  variance_firstBloods: calculateVariance(firstBloods, means.mean_firstBloods),
  variance_avgPosition: calculateVariance(avgPositions, means.mean_avgPosition),
};

const standardDeviations = {
  sd_headshotPercentage: calculateStandardDeviation(variances.variance_headshotPercentage),
  sd_kd: calculateStandardDeviation(variances.variance_kd),
  sd_winPercentage: calculateStandardDeviation(variances.variance_winPercentage),
  sd_firstBloods: calculateStandardDeviation(variances.variance_firstBloods),
  sd_avgPosition: calculateStandardDeviation(variances.variance_avgPosition),
};

// Calculate z-scores and update player data
playersData.forEach(player => {
  player.competitive_stats.z_score_headshotPercentage = (player.competitive_stats.headshot_percentage - means.mean_headshotPercentage) / standardDeviations.sd_headshotPercentage;
  player.competitive_stats.z_score_kd = (player.competitive_stats.kd - means.mean_kd) / standardDeviations.sd_kd;
  player.competitive_stats.z_score_winPercentage = (player.competitive_stats.win_percentage - means.mean_winPercentage) / standardDeviations.sd_winPercentage;
  player.competitive_stats.z_score_firstBloods = ((player.competitive_stats.first_bloods /player.competitive_stats.rounds_played) - means.mean_firstBloods) / standardDeviations.sd_firstBloods; // Assuming this field exists
  player.competitive_stats.z_score_avgPosition = (player.competitive_stats.avg_position - means.mean_avgPosition) / standardDeviations.sd_avgPosition;
});

// Add analytics to the data
const analyticsData = {
  means,
  variances,
  standardDeviations
};

// Save updated data back to file
fs.writeFileSync(filePath, JSON.stringify(playersData, null, 2), 'utf-8');
fs.writeFileSync(analyticsFilePath, JSON.stringify(analyticsData, null, 2), 'utf-8');
console.log('Player statistics updated and saved.');