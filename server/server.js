// server/server.js

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv').config();
const fs = require('fs');
const { calculateMACD, calculateRSI, calculateBollingerBands } = require('./indicators');
const { trainAndPredict } = require('./predict');
const { trainClassifier } = require('./classify');

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3001;

const LOOKAHEAD = 5;

app.get('/api/indicators/:symbol', async (req, res) => {
  try {
    const symbol   = req.params.symbol.toUpperCase();
    const interval = req.query.interval || 'monthly';

    // Parse dynamic features
    let features = req.query.features;
    if (!features) {
      features = ['close1', 'close2', 'macd'];
    } else if (!Array.isArray(features)) {
      features = [features];
    }
    console.log(`🧪 Experiment: symbol=${symbol}, interval=${interval}, lookahead=${LOOKAHEAD}, features=[${features.join(',')}]`);


    // Fetch full history
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?serietype=line&apikey=${process.env.FMP_API_KEY}`;
    const response = await axios.get(url);
    let raw = (response.data.historical || []).slice().reverse();

    // Monthly filter
    if (interval === 'monthly') {
      const seen = new Set();
      raw = raw.filter(d => {
        const ym = d.date.slice(0, 7);
        if (seen.has(ym)) return false;
        seen.add(ym);
        return true;
      });
    }

    // Indicators
    const closes = raw.map(d => d.close);
    const macd   = calculateMACD(closes);
    const rsi    = calculateRSI(closes);
    const bb     = calculateBollingerBands(closes);

    // Enrich data
    const enriched = raw.map((d, i) => ({
      date:     d.date,
      close:    d.close,
      volume:   d.volume,
      macd:     macd[i]?.macd    ?? 0,
      rsi:      rsi[i]           ?? 50,
      bb_upper: bb[i]?.upper     ?? null,
      bb_lower: bb[i]?.lower     ?? null
    }));

    const epochs = interval === 'monthly' ? 60 : 20;

    // 1) Prediction
    const { data: withPredictions, mape } =
      await trainAndPredict(enriched, features, epochs);

    // 2) Classification
    const { data: final, accuracy, labelCounts } =
      await trainClassifier(withPredictions, LOOKAHEAD, epochs, features);

    // 3) CSV logging (always)
    const csvPath = 'model_summary.csv';
    if (!fs.existsSync(csvPath)) {
      fs.writeFileSync(
        csvPath,
        'timestamp,symbol,interval,lookahaed,features,label_buy,label_hold,label_sell,accuracy,mape\n'
      );
    }

    const timestamp = new Date().toISOString();
    const buy       = labelCounts.buy  || 0;
    const hold      = labelCounts.hold || 0;
    const sell      = labelCounts.sell || 0;
    const accVal    = (typeof accuracy === 'number') ? accuracy.toFixed(4) : '';
    const mapeVal   = (typeof mape     === 'number') ? mape.toFixed(4)     : '';
    const feats     = features.join('|');
    const lookahead = LOOKAHEAD;

    const csvRow = [
      timestamp,
      symbol,
      interval,
      lookahead,
      feats,
      buy,
      hold,
      sell,
      accVal,
      mapeVal
    ].join(',') + '\n';

    fs.appendFileSync(csvPath, csvRow);

    // 4) Respond
    res.json({ data: final, accuracy, mape, labelCounts });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

