function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) return [];

  const rsi = Array(period).fill(null);
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi[period] = 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return rsi;
}

function calculateEMA(data, period) {
  const k = 2 / (period + 1);
  const ema = [data[0]];

  for (let i = 1; i < data.length; i++) {
    ema[i] = data[i] * k + ema[i - 1] * (1 - k);
  }

  return ema;
}

function calculateMACD(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast = calculateEMA(closes, fast);
  const emaSlow = calculateEMA(closes, slow);
  const macdLine = emaFast.map((v, i) => v - (emaSlow[i] || 0));
  const signalLine = calculateEMA(macdLine.slice(slow - 1), signal);

  const macd = closes.map((_, i) =>
    i >= slow + signal - 2
      ? {
          macd: macdLine[i],
          signal: signalLine[i - (slow + signal - 2)],
        }
      : null
  );

  return macd;
}

function calculateBollingerBands(closes, period = 20, stdDev = 2) {
  const bb = Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((sum, val) => sum + val, 0) / period;
    const variance = slice.reduce((sum, val) => sum + (val - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);

    bb[i] = {
      upper: mean + stdDev * sd,
      lower: mean - stdDev * sd,
    };
  }

  return bb;
}

module.exports = {
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
};

