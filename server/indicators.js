function calculateRSI(closes, period = 14) {
  const rsi = new Array(closes.length).fill(null);
  for (let i = period; i < closes.length; i++) {
    let gains = 0, losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const change = closes[j] - closes[j - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    const rs = gains / (losses || 1);
    rsi[i] = 100 - 100 / (1 + rs);
  }
  return rsi;
}

function calculateMACD(closes, shortPeriod = 12, longPeriod = 26, signalPeriod = 9) {
  const ema = (data, period) => {
    const k = 2 / (period + 1);
    const emaArr = [data[0]];
    for (let i = 1; i < data.length; i++) {
      emaArr.push(data[i] * k + emaArr[i - 1] * (1 - k));
    }
    return emaArr;
  };

  const emaShort = ema(closes, shortPeriod);
  const emaLong = ema(closes, longPeriod);
  const macd = emaShort.map((v, i) => v - emaLong[i]);
  const signal = ema(macd, signalPeriod);
  return { macd, signal };
}

function calculateBollingerBands(closes, period = 20, mult = 2) {
  const bands = new Array(closes.length).fill(null).map(() => ({ upper: null, lower: null }));
  for (let i = period - 1; i < closes.length; i++) {
    const window = closes.slice(i - period + 1, i + 1);
    const avg = window.reduce((a, b) => a + b) / period;
    const std = Math.sqrt(window.reduce((a, b) => a + (b - avg) ** 2, 0) / period);
    bands[i] = {
      upper: avg + mult * std,
      lower: avg - mult * std,
    };
  }
  return bands;
}

function addIndicators(data) {
  const closes = data.map(d => d.close);
  const rsi = calculateRSI(closes);
  const { macd, signal } = calculateMACD(closes);
  const bb = calculateBollingerBands(closes);

  return data.map((d, i) => ({
    ...d,
    rsi: rsi[i],
    macd: macd[i],
    signal: signal[i],
    bb_upper: bb[i]?.upper ?? null,
    bb_lower: bb[i]?.lower ?? null,
  }));
}

module.exports = {
  addIndicators,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands
};

