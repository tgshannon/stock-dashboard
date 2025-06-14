const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');

dotenv.config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;
const THRESHOLD = 0.03;
const LOOKAHEAD = 5;

function calculateMACD(data, short = 12, long = 26, signal = 9) {
  const ema = (arr, period) => {
    const k = 2 / (period + 1);
    const emaArray = [arr[0]];
    for (let i = 1; i < arr.length; i++) {
      emaArray.push(arr[i] * k + emaArray[i - 1] * (1 - k));
    }
    return emaArray;
  };

  const macdLine = ema(data, short).map((val, i) => val - ema(data, long)[i]);
  const signalLine = ema(macdLine, signal);
  return macdLine.map((val, i) => ({ macd: val, signal: signalLine[i] }));
}

function calculateRSI(closes, period = 14) {
  const rsi = [];
  for (let i = period; i < closes.length; i++) {
    let gains = 0, losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const change = closes[j] - closes[j - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period || 0.001;
    const rs = avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
  }
  return Array(closes.length - rsi.length).fill(null).concat(rsi);
}

app.get('/api/indicators/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const interval = req.query.interval || 'monthly';
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?serietype=line&apikey=${process.env.FMP_API_KEY}`;
    const { data } = await axios.get(url);

    if (!data.historical) return res.status(404).json({ error: 'No data found' });

    let raw = [...data.historical].reverse();
    if (interval === 'monthly') {
      const seen = new Set();
      raw = raw.filter(d => {
        const key = d.date.slice(0, 7);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    const closes = raw.map(d => d.close);
    const macdArr = calculateMACD(closes);
    const rsiArr = calculateRSI(closes);

    const enriched = raw.map((d, i) => ({
      date: d.date,
      close: d.close,
      volume: d.volume,
      macd: macdArr[i]?.macd ?? 0,
      rsi: rsiArr[i] ?? 50
    }));

    // === PRICE PREDICTION MODEL ===
    const x = [], y = [];
    for (let i = 2; i < enriched.length; i++) {
      const d1 = enriched[i - 1];
      const d2 = enriched[i - 2];
      const target = enriched[i].close;
      x.push([d1.close, d2.close, d1.macd, d1.rsi / 100]);
      y.push(target);
    }

    const xs = tf.tensor2d(x);
    const ys = tf.tensor2d(y, [y.length, 1]);

    const model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [4], units: 8, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1 }));
    model.compile({ loss: 'meanSquaredError', optimizer: 'adam' });

    const epochs = interval === 'monthly' ? 60 : 20;
    await model.fit(xs, ys, { epochs });

    const preds = model.predict(xs).arraySync().map(p => p[0]);

    for (let i = 2; i < enriched.length; i++) {
      enriched[i].prediction = preds[i - 2];
    }

    const mape = preds.reduce((acc, p, i) => {
      const actual = y[i];
      return acc + Math.abs((actual - p) / actual);
    }, 0) / preds.length;

    tf.dispose([xs, ys]);

    // === CLASSIFICATION MODEL ===
    const xClass = [], yClass = [];
    const labelMap = { buy: [1, 0, 0], hold: [0, 1, 0], sell: [0, 0, 1] };
    const classList = ['buy', 'hold', 'sell'];

    for (let i = 2; i < enriched.length - LOOKAHEAD; i++) {
      const d = enriched[i];
      const d1 = enriched[i - 1];
      const d2 = enriched[i - 2];
      const future = enriched[i + LOOKAHEAD];

      if ([d, d1, d2, future].every(p => p.close != null)) {
        const change = (future.close - d.close) / d.close;
        let label = 'hold';
        if (change > THRESHOLD) label = 'buy';
        else if (change < -THRESHOLD) label = 'sell';

        d.actionLabel = label;
        xClass.push([d1.close, d2.close, d1.macd, d1.rsi / 100]);
        yClass.push(labelMap[label]);
      }
    }

    const xT = tf.tensor2d(xClass);
    const yT = tf.tensor2d(yClass);

    const clf = tf.sequential();
    clf.add(tf.layers.dense({ inputShape: [4], units: 8, activation: 'relu' }));
    clf.add(tf.layers.dense({ units: 3, activation: 'softmax' }));
    clf.compile({ loss: 'categoricalCrossentropy', optimizer: 'adam' });

    await clf.fit(xT, yT, { epochs });

    const clfPreds = await clf.predict(xT).array();
    const labelCounts = { buy: 0, hold: 0, sell: 0 };

    yClass.forEach(label => {
      const idx = label.indexOf(1);
      const key = classList[idx];
      labelCounts[key]++;
    });

    for (let i = 2; i < enriched.length - LOOKAHEAD; i++) {
      const p = clfPreds[i - 2];
      const maxIdx = p.indexOf(Math.max(...p));
      enriched[i].action = classList[maxIdx];
      enriched[i].confidence = p[maxIdx];
      enriched[i].predictedLabel = classList[maxIdx];
      enriched[i].actualLabel = enriched[i].actionLabel;
    }

    tf.dispose([xT, yT]);

    let correct = 0, total = 0;
    for (const d of enriched) {
      if (d.actualLabel && d.predictedLabel) {
        total++;
        if (d.actualLabel === d.predictedLabel) correct++;
      }
    }

    const accuracy = total > 0 ? correct / total : 0;

    // === Save Summary CSV ===
    const csvFile = 'model_summary.csv';
    if (!fs.existsSync(csvFile)) {
      const header = 'timestamp,symbol,interval,threshold,lookahead,features,label_buy,label_hold,label_sell,classification_accuracy,mape\n';
      fs.writeFileSync(csvFile, header);
    }
    const csvRow = [
      new Date().toISOString(),
      symbol,
      interval,
      THRESHOLD,
      LOOKAHEAD,
      'close1|close2|macd|rsi',
      labelCounts.buy,
      labelCounts.hold,
      labelCounts.sell,
      accuracy.toFixed(4),
      mape.toFixed(4)
    ].join(',') + '\n';
    fs.appendFileSync(csvFile, csvRow);
    console.log('📝 model_summary.csv updated');

    res.json({
      data: enriched,
      mape,
      accuracy,
      labelCounts
    });
  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});

