const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../logs');
const outPath = path.join(__dirname, '../logs/eval-summary.csv');

const files = fs.readdirSync(logDir).filter(f => f.endsWith('.json')).sort();

const headers = [
  'timestamp',
  'symbol',
  'ruleSet',
  'features',
  'mape',
  'accuracy',
  'buy',
  'hold',
  'sell'
];

const allRows = [];

files.forEach(file => {
  const fullPath = path.join(logDir, file);
  const timestamp = file.slice(file.indexOf('-') + 1, file.lastIndexOf('.json')).replace(/-/g, ':');

  const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  data.forEach(row => {
    const lc = row.labelCounts || {};
    allRows.push([
      timestamp,
      row.symbol,
      row.ruleSet,
      row.features.join('|'),
      row.mape != null ? row.mape.toFixed(3) : '',
      row.accuracy != null ? row.accuracy.toFixed(3) : '',
      lc.buy || 0,
      lc.hold || 0,
      lc.sell || 0
    ]);
  });
});

// Deduplicate by timestamp + symbol + features
const seen = new Set();
const uniqueRows = allRows.filter(row => {
  const key = row.slice(0, 4).join(',');
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

const csv = [headers.join(','), ...uniqueRows.map(r => r.join(','))].join('\n');
fs.writeFileSync(outPath, csv);
console.log(`✅ Merged ${files.length} logs into ${outPath}`);

