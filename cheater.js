const fs = require('fs');
const path = require('path');
const math = require('mathjs');

const analyticsFilePath = 'C:/Players/analytics.json';
const analyticsData = JSON.parse(fs.readFileSync(analyticsFilePath, 'utf-8'));

// Function to calculate cheater score
function calculateCheaterScore(zScore, a, b) {
  const c = Math.exp(b * 1);
  if (zScore <= 1) return 0;
  const cheaterScore = a * (Math.exp(b * zScore) - c);
  return cheaterScore > 0 ? cheaterScore : 0;
}

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
        if (typeof competitive_stats.headshot_percentage === 'number') stats.headshotPercentages.push(competitive_stats.headshot_percentage);
        if (typeof competitive_stats.kd === 'number') stats.kds.push(competitive_stats.kd);
        if (typeof competitive_stats.win_percentage === 'number') stats.winPercentages.push(competitive_stats.win_percentage);
        if (typeof competitive_stats.first_bloods === 'number' && typeof competitive_stats.rounds_played === 'number') stats.firstBloods.push(competitive_stats.first_bloods / competitive_stats.rounds_played);
        if (typeof competitive_stats.avg_position === 'number') stats.avgPositions.push(competitive_stats.avg_position);
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
  
        // Update or set the cheater_score
        competitive_stats.cheater_score = calculateTotalCheaterScore(competitive_stats);
      }
    });

    // Sort players by cheater_score in descending order
    playersData.sort((a, b) => {
        const scoreA = a.competitive_stats?.cheater_score ?? 0;
        const scoreB = b.competitive_stats?.cheater_score ?? 0;
        return scoreB - scoreA;
      });

    const formatNumber = (value, digits = 2) => {
        return value !== null && value !== undefined ? value.toFixed(digits) : 'N/A';
      };

    // Output the top players
    let topPlayers = playersData.slice(0, 20);
    topPlayers = topPlayers.filter(player => {
        const stats = player.competitive_stats;
        // Check if stats exist and none of the specific stats are null
        return stats && stats.cheater_score !== null && 
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
      });
      
      // Now topPlayers only contains players with non-null values for the stats you're interested in
    topPlayers.forEach((player, index) => {
        console.log(`Cheater Rank #${index + 1}:`);
        console.log(`Game Name: ${player.gameName}`);
        console.log(`Cheater Score: ${formatNumber(player.competitive_stats.cheater_score)}`);
        if(player.competitive_stats?.headshotPercentage) console.log(` - Headshot Percentage: Value - ${formatNumber(player.competitive_stats.headshot_percentage * 100, 0)}%, Z-Score - ${formatNumber(player.competitive_stats.z_score_headshotPercentage)}, AVG - ${formatNumber(analyticsData.means.headshotPercentages * 100, 0)}%`);
        console.log(` - KD: Value - ${formatNumber(player.competitive_stats.kd)}, Z-Score - ${formatNumber(player.competitive_stats.z_score_kd)}, AVG - ${formatNumber(analyticsData.means.kds)}`);
        console.log(` - Win Percentage: Value - ${formatNumber(player.competitive_stats.win_percentage * 100, 0)}%, Z-Score - ${formatNumber(player.competitive_stats.z_score_winPercentage)}, AVG - ${formatNumber(analyticsData.means.winPercentages * 100, 0)}%`);
        console.log(` - First Blood Odds Per Round: Value - ${formatNumber(player.competitive_stats.first_bloods / player.competitive_stats.rounds_played * 100, 0 )}%, Z-Score - ${formatNumber(player.competitive_stats.z_score_firstBloods)}, AVG - ${formatNumber(analyticsData.means.firstBloods * 100, 0)}%`);
        console.log(` - Average Position: Value - ${formatNumber(player.competitive_stats.avg_position)}, Z-Score - ${formatNumber(-player.competitive_stats.z_score_avgPosition)}, AVG - ${formatNumber(analyticsData.means.avgPositions)}`);
        console.log('---------------------------------------------------');
      });
      

    await fs.writeFileSync(filePath, JSON.stringify(playersData, null, 2));
    await fs.writeFileSync(analyticsFilePath, JSON.stringify({ means, standardDeviations }, null, 2));
    console.log('Player statistics and analytics updated and saved.');
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

function calculateTotalCheaterScore(stats) {
  return Object.keys(stats).filter(key => key.startsWith('z_score_')).reduce((sum, key) => {
    const zScore = stats[key];
    const a = key === 'z_score_winPercentage' ? 0.85 : 0.5;
    const b = key === 'z_score_winPercentage' ? 0.7 : 0.4;
    return sum + calculateCheaterScore(zScore, a, b);
  }, 0);
}

main();

