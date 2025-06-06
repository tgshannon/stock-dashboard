export function calculateRSI(closes, period = 14) {
  const rsi = Array(closes.length).fill(null);
  for (let i = period; i < closes.length; i++) {
    let gains = 0;
    let losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const change = closes[j] - closes[j - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi[i] = 100 - 100 / (1 + rs);
  }
  return rsi;
}

export function calculateMACD(closes, shortPeriod = 12, longPeriod = 26, signalPeriod = 9) {
  const ema = (data, period) => {
    const k = 2 / (period + 1);
    let emaArray = [data[0]];
    for (let i = 1; i < data.length; i++) {
      emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
    }
    return emaArray;
  };

  const shortEMA = ema(closes, shortPeriod);
  const longEMA = ema(closes, longPeriod);
  const macdLine = shortEMA.map((v, i) => v - longEMA[i]);
  const signalLine = ema(macdLine, signalPeriod);

  return macdLine.map((macd, i) => ({
    macd,
    signal: signalLine[i]
  }));
}

export function calculateBollingerBands(closes, period = 20, numStdDev = 2) {
  const bands = Array(closes.length).fill(null);
  for (let i = period - 1; i < closes.length; i++) {
    const window = closes.slice(i - period + 1, i + 1);
    const mean = window.reduce((a, b) => a + b, 0) / period;
    const variance = window.reduce((sum, val) => sum + (val - mean) ** 2, 0) / period;
    const stddev = Math.sqrt(variance);
    bands[i] = {
      upper: mean + numStdDev * stddev,
      lower: mean - numStdDev * stddev
    };
  }
  return bands;
}

