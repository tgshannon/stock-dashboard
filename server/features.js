const { getLabel } = require('./rules');

function buildMatrix(data, features, isClassification = false, lookahead = 1, ruleSet = 'pct') {
  const knownFeatures = new Set([
    'close1', 'close2', 'macd', 'macd_1', 'macd_2', 'signal',
    'bb_upper', 'bb_lower', 'rsi',
    'predicted', 'closeShortMA', 'closeLongMA'
  ]);

  if (!Array.isArray(features) || features.length === 0) {
    throw new Error(`❌ buildMatrix: invalid features list: ${features}`);
  }

  const unknowns = features.filter(f => !knownFeatures.has(f));
  if (unknowns.length) {
    console.warn(`⚠️ buildMatrix: unknown features detected: ${unknowns.join(', ')}`);
  }

  const X = [];
  const Y = [];
  const meta = [];
  const offset = isClassification ? lookahead : 1;

  for (let i = 0; i < data.length - offset; i++) {
    const xRow = [];

    for (const feature of features) {
      if (feature === 'close1') {
        xRow.push(data[i].close);
      } else if (feature === 'close2') {
        xRow.push(data[i + 1]?.close ?? data[i].close);
      } else if (feature === 'macd') {
        xRow.push(data[i].macd ?? 0);
      } else if (feature === 'rsi') {
        xRow.push(data[i].rsi ?? 50);
      } else if (feature === 'predicted') {
        xRow.push(data[i].predicted ?? data[i].close);
      } else {
        xRow.push(0);
      }
    }

    const future = data[i + lookahead];
    if (isClassification && future) {
      const history = data.slice(0, i + 1);
      const labelStr = getLabel(data[i], future, ruleSet, history); // 'buy', 'hold', 'sell'
      const label = labelStr === 'buy' ? 0 : labelStr === 'sell' ? 2 : 1;

      X.push(xRow);
      Y.push(label);
      meta.push({ index: i, label });
    } else if (!isClassification) {
      const yVal = data[i + 1]?.close;
      if (yVal !== undefined) {
        X.push(xRow);
        Y.push(yVal);
      }
    }
  }

  return { X, Y, meta };
}

module.exports = { buildMatrix };

