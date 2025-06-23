function buildMatrix(data, features, isClassification = false, lookahead = 1) {
  const knownFeatures = new Set(['close1', 'close2', 'macd', 'rsi', 'predicted']);

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
        xRow.push(0); // fallback for unknowns
      }
    }

    const futureIndex = i + lookahead;
    if (isClassification) {
      const current = data[i].close;
      const future = data[futureIndex]?.close;
      if (future !== undefined) {
        const delta = (future - current) / current;
        let label = 1;
        if (delta > 0.03) label = 0;
        else if (delta < -0.03) label = 2;

        X.push(xRow);
        Y.push(label);
        meta.push({ index: i, label });
      }
    } else {
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

