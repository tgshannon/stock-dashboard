function calculateRSI(closes, period = 14) {
  let gains = 0;
  let losses = 0;
  const rsi = Array(closes.length).fill(null);

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  gains /= period;
  losses /= period;
  rsi[period] = 100 - 100 / (1 + gains / losses);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) {
      gains = (gains * (period - 1) + diff) / period;
      losses = (losses * (period - 1)) / period;
    } else {
      gains = (gains * (period - 1)) / period;
      losses = (losses * (period - 1) - diff) / period;
    }
    rsi[i] = 100 - 100 / (1 + gains / losses);
  }

  return rsi;
}

function calculateBollingerBands(closes, period = 20, numStdDev = 2) {
  const bands = Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
    bands[i] = {
      upper: mean + numStdDev * std,
      lower: mean - numStdDev * std,
    };
  }

  return bands;
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

  return { macd, signal, emaShort, emaLong };
}

function addIndicators(data) {
  const closes = data.map(d => d.close);
  const rsi = calculateRSI(closes);
  const { macd, signal, emaShort, emaLong } = calculateMACD(closes);
  const bb = calculateBollingerBands(closes);

  return data.map((d, i) => ({
    ...d,
    rsi: rsi[i],
    macd: macd[i],
    signal: signal[i],
    bb_upper: bb[i]?.upper ?? null,
    bb_lower: bb[i]?.lower ?? null,
    closeShortMA: emaShort[i],
    closeLongMA: emaLong[i],
  }));
}

module.exports = { addIndicators };

