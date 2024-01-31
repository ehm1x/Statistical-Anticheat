const fs = require('fs').promises;
const path = require('path');
const math = require('mathjs');

async function main() {
  const filePath = path.join('C:/Players', 'players.json');
  const analyticsFilePath = path.join('C:/Players', 'analytics.json');

  try {
    const playersData = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    const stats = {
      headshotPercentages: [],
      kds: [],
      winPercentages: [],
      firstBloods: [],
      avgPositions: []
    };

    // Populate arrays with player stats
    playersData.forEach(player => {
      const competitive_stats = player.competitive_stats;

      // Check if competitive_stats exists and has the properties we're interested in
      if(competitive_stats && typeof competitive_stats === 'object') {
        if('headshot_percentage' in competitive_stats) stats.headshotPercentages.push(competitive_stats.headshot_percentage);
        if('kd' in competitive_stats) stats.kds.push(competitive_stats.kd);
        if('win_percentage' in competitive_stats) stats.winPercentages.push(competitive_stats.win_percentage);
        if('first_bloods' in competitive_stats && 'rounds_played' in competitive_stats) stats.firstBloods.push(competitive_stats.first_bloods / competitive_stats.rounds_played);
        if('avg_position' in competitive_stats) stats.avgPositions.push(competitive_stats.avg_position);
      }
    });

    // Calculate means and standard deviations
    const means = {};
    const standardDeviations = {};
    for (const key in stats) {
      means[key] = math.mean(stats[key]);
      standardDeviations[key] = math.std(stats[key]);
    }

    // Calculate z-scores and update player data
    playersData.forEach(player => {
      const competitive_stats = player.competitive_stats;

      // Again, check if competitive_stats exists before attempting to use its properties
      if(competitive_stats && typeof competitive_stats === 'object') {
        if('headshot_percentage' in competitive_stats) competitive_stats.z_score_headshotPercentage = (competitive_stats.headshot_percentage - means.headshotPercentages) / standardDeviations.headshotPercentages;
        if('kd' in competitive_stats) competitive_stats.z_score_kd = (competitive_stats.kd - means.kds) / standardDeviations.kds;
        if('win_percentage' in competitive_stats) competitive_stats.z_score_winPercentage = (competitive_stats.win_percentage - means.winPercentages) / standardDeviations.winPercentages;
        if('first_bloods' in competitive_stats && 'rounds_played' in competitive_stats) competitive_stats.z_score_firstBloods = ((competitive_stats.first_bloods / competitive_stats.rounds_played) - means.firstBloods) / standardDeviations.firstBloods;
        if('avg_position' in competitive_stats) competitive_stats.z_score_avgPosition = (competitive_stats.avg_position - means.avgPositions) / standardDeviations.avgPositions;
      }
    });
    
    await fs.writeFile(filePath, JSON.stringify(playersData, null, 2));
    await fs.writeFile(analyticsFilePath, JSON.stringify({ means, standardDeviations }, null, 2));
    console.log('Player statistics updated and saved.');
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
}

main();