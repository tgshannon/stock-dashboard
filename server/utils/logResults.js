const fs = require('fs');
const path = require('path');

/**
 * Save evaluation results to a timestamped JSON file inside the /logs folder.
 * Adds a timestamp to each result object for later tracking or CSV merging.
 *
 * @param {Array} results - Array of evaluation result objects
 * @param {string} symbol - Stock symbol (used in filename)
 * @param {string} dir - Output directory, defaults to 'logs'
 */
function logResults(results, symbol, dir = 'logs') {
  const timestamp = new Date().toISOString();
  const safeTimestamp = timestamp.replace(/[:.]/g, '-');
  const filename = `eval-${symbol}-${safeTimestamp}.json`;
  const filepath = path.join(__dirname, '..', dir, filename);

  // Ensure each result includes a timestamp for later CSV merging
  results.forEach(r => r.timestamp = timestamp);

  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(results, null, 2));

  console.log(`✅ Evaluation results saved to ${dir}/${filename}`);
}

module.exports = { logResults };

