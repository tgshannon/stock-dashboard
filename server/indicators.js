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
  // First and second MACD derivatives
  for (let i = 1; i < data.length; i++) {
    if (data[i].macd != null && data[i - 1].macd != null) {
      data[i].macd_1 = data[i].macd - data[i - 1].macd;
    }
  } 
  for (let i = 2; i < data.length; i++) {
    if (data[i].macd_1 != null && data[i - 1].macd_1 != null) {
      data[i].macd_2 = data[i].macd_1 - data[i - 1].macd_1;
    }
  }

  return { macd, signal, emaShort, emaLong };
}

function addIndicators(data) {
  const period = 14;
  const macdShort = 12;
  const macdLong = 26;
  const signalPeriod = 9;

  // Moving Averages (used in custom rules)
  for (let i = 0; i < data.length; i++) {
    if (i >= macdShort - 1) {
      const avg = average(data.slice(i - macdShort + 1, i + 1).map(d => d.close));
      data[i].closeShortMA = avg;
    }
    if (i >= macdLong - 1) {
      const avg = average(data.slice(i - macdLong + 1, i + 1).map(d => d.close));
      data[i].closeLongMA = avg;
    }
  }

  // Bollinger Bands
  for (let i = period - 1; i < data.length; i++) {
    const window = data.slice(i - period + 1, i + 1).map(d => d.close);
    const mean = average(window);
    const std = stddev(window);
    data[i].bb_upper = mean + 2 * std;
    data[i].bb_lower = mean - 2 * std;
  }

  // RSI
  for (let i = period; i < data.length; i++) {
    let gains = 0;
    let losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const change = data[j].close - data[j - 1].close;
      if (change > 0) gains += change;
      else losses -= change;
    }
    const rs = gains / (losses || 1); // avoid div by zero
    data[i].rsi = 100 - 100 / (1 + rs);
  }

  // MACD (basic)
  const ema = (arr, period) => {
    const k = 2 / (period + 1);
    let emaArray = [];
    let prev = arr[0];
    for (let i = 0; i < arr.length; i++) {
      const val = arr[i];
      const emaVal = i === 0 ? val : (val - prev) * k + prev;
      emaArray.push(emaVal);
      prev = emaVal;
    }
    return emaArray;
  };

  const closes = data.map(d => d.close);
  const shortEma = ema(closes, macdShort);
  const longEma = ema(closes, macdLong);
  const macdLine = shortEma.map((val, i) => val - longEma[i]);
  const signalLine = ema(macdLine, signalPeriod);

  for (let i = 0; i < data.length; i++) {
    data[i].macd = macdLine[i];
    data[i].signal = signalLine[i];
  }

  // MACD derivatives
  for (let i = 1; i < data.length; i++) {
    data[i].macd_1 = data[i].macd - data[i - 1].macd;
  }
  for (let i = 2; i < data.length; i++) {
    data[i].macd_2 = data[i].macd_1 - data[i - 1].macd_1;
  }


  return data;
}

// Utility functions
function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr) {
  const avg = average(arr);
  return Math.sqrt(arr.reduce((sum, x) => sum + (x - avg) ** 2, 0) / arr.length);
}

module.exports = { addIndicators };

