// server/features.js

function buildPredictionMatrix(data) {
  const features = ['close1', 'close2', 'macd', 'rsi'];
  const X = [], Y = [];

  for (let i = 2; i < data.length - 1; i++) {
    const d = data[i], d1 = data[i - 1], d2 = data[i - 2];
    const row = [
      d1.close, d2.close,
      d1.macd ?? 0,
      (d1.rsi ?? 50) / 100
    ];
    X.push(row);
    Y.push(data[i + 1].close);
  }

  console.log(`✅ Prediction matrix: X=${X.length}, Y=${Y.length}`);
  return { X, Y };
}

function buildClassificationMatrix(data, lookahead = 5) {
  const features = ['close1', 'close2', 'macd', 'rsi', 'predicted'];
  const labelMap = { buy: [1, 0, 0], hold: [0, 1, 0], sell: [0, 0, 1] };
  const X = [], Y = [], meta = [];

  for (let i = 2; i < data.length - lookahead; i++) {
    const d = data[i], d1 = data[i - 1], d2 = data[i - 2];
    const row = [
      d1.close, d2.close,
      d1.macd ?? 0,
      (d1.rsi ?? 50) / 100,
      d.predicted ?? 0
    ];
    X.push(row);

    const future = data[i + lookahead];
    if (!future) continue;

    const change = (future.close - d.close) / d.close;
    let label = 'hold';
    if (change > 0.03) label = 'buy';
    else if (change < -0.03) label = 'sell';

    Y.push(labelMap[label]);
    meta.push({ index: i, label });
  }

  console.log(`✅ Classification matrix: X=${X.length}, Y=${Y.length}`);
  return { X, Y, meta };
}

module.exports = { buildPredictionMatrix, buildClassificationMatrix };

