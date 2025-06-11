// server.js
const express = require('express');
const app = express();
const axios = require('axios');
const technicalindicators = require('technicalindicators');
const cors = require('cors');

app.use(cors());

const API_KEY = process.env.FMP_API_KEY;

const calculateIndicators = (prices) => {
  const close = prices.map(p => parseFloat(p.close));
  const volume = prices.map(p => parseInt(p.volume));

  const macd = technicalindicators.MACD.calculate({
    values: close,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });

  const rsi = technicalindicators.RSI.calculate({
    values: close,
    period: 14
  });

  const bbands = technicalindicators.BollingerBands.calculate({
    period: 20,
    stdDev: 2,
    values: close
  });

  const roc = technicalindicators.ROC.calculate({
    values: close,
    period: 12
  });

  return { macd, rsi, bbands, close, volume, roc };
};

app.get('/api/indicators/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const interval = req.query.interval || 'monthly';
  const epochs = interval === 'monthly' ? 60 : 10;
  console.log(`Training ${symbol} (${interval}) with ${epochs} epochs`);

  try {
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${process.env.FMP_API_KEY}`;
    const response = await axios.get(url);
    console.log('Sample FMP response', response.data.historical?.[0]);
    const historical = response.data?.historical || [];

    let filtered = historical;

    if (interval === 'monthly') {
      const seen = new Set();
      filtered = historical.filter(item => {
        const key = item.date.slice(0, 7); // YYYY-MM
        if (!seen.has(key)) {
          seen.add(key);
          return true; // take first entry of the month
        }
        return false;
      });
    }

    // Your indicator calculations go here...

    const indicators = calculateIndicators(filtered);
    const enriched = filtered.map((item, i) => ({
      date: item.date,
      close: item.close,
      volume: item.volume,
      rsi: indicators.rsi[i] ?? null,
      macd: indicators.macd[i]?.MACD ?? null,
      signal: indicators.macd[i]?.signal ?? null,
      bb_upper: indicators.bbands[i]?.upper ?? null,
      bb_lower: indicators.bbands[i]?.lower ?? null,
      roc: indicators.roc[i] ?? null,
    }));


    // Sort oldest to newest
    const sorted = enriched.sort((a, b) => new Date(a.date) - new Date(b.date));

    const tf = require('@tensorflow/tfjs-node');

    // --- Build training dataset ---
    const inputs = [];
    const labels = [];

    for (let i = 2; i < sorted.length; i++) {
      const macd = sorted[i].macd;
      const close1 = sorted[i - 1].close;
      const close2 = sorted[i - 2].close;
      const currentClose = sorted[i].close;

      if (macd != null && close1 != null && close2 != null && currentClose != null) {
        inputs.push([macd, close1, close2]);  // add volume to model
        labels.push([currentClose]);
      }
    }

    // --- Train model ---
    const xs = tf.tensor2d(inputs);
    const ys = tf.tensor2d(labels, [labels.length, 1]);

    const model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [3], units: 10, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1 }));

    model.compile({ loss: 'meanSquaredError', optimizer: 'adam' });
    await model.fit(xs, ys, { epochs: epochs, shuffle: false });

    // --- Make predictions ---
    const predsTensor = model.predict(xs);
    const preds = await predsTensor.array();

    // --- Compute MAPE ---
    let absPctErrors = [];
    for (let i = 0; i < preds.length; i++) {
      const actual = labels[i][0];
      const predicted = preds[i][0];
      const pctError = Math.abs((predicted - actual) / actual);
      absPctErrors.push(pctError);
    }
    const mape = absPctErrors.reduce((sum, e) => sum + e, 0) / absPctErrors.length;

    // --- Embed predictions into sorted output ---
    let predIndex = 0;
    for (let i = 2; i < sorted.length; i++) {
      const macd = sorted[i].macd;
      const close1 = sorted[i - 1].close;
      const close2 = sorted[i - 2].close;

      if (macd != null && close1 != null && close2 != null) {
        sorted[i].prediction = preds[predIndex][0];
        predIndex++;
      } else {
        sorted[i].prediction = null;
      }
    }
    console.log(`MAPE for ${symbol}: ${(mape * 100).toFixed(2)}%`);

    // --- Optional: free memory ---
    tf.dispose([xs, ys, predsTensor]);
    tf.engine().disposeVariables()
    tf.engine().reset();

    // --- Return result ---
    res.json({
      mape: (mape * 100).toFixed(2),
      data: sorted
    });


    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch stock data' });
    }
  });

app.listen(3001, () => console.log('Server running on http://localhost:3001'));

