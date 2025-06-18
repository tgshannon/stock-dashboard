function buildMatrix(data, features, includeLabel = false, lookahead = 5) {
  const X = [], Y = [], meta = [];

  for (let i = 2; i < data.length - (includeLabel ? lookahead : 1); i++) {
    const row = features.map(f => data[i][f] ?? 0);
    X.push(row);

    if (includeLabel) {
      const future = data[i + lookahead];
      if (!future) continue;
      const change = (future.close - data[i].close) / data[i].close;
      let label = 'hold';
      if (change > 0.03) label = 'buy';
      if (change < -0.03) label = 'sell';
      Y.push([label === 'buy' ? 1 : 0, label === 'hold' ? 1 : 0, label === 'sell' ? 1 : 0]);
      meta.push({ index: i, action: label });
    } else {
      Y.push(data[i + 1].close);
    }
  }

  console.log(`Built matrix X=${X.length}, Y=${Y.length}`);
  return { X, Y, meta };
}

module.exports = { buildMatrix };

