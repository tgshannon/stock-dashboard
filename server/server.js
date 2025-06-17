// server/server.js

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const { calculateMACD, calculateRSI, calculateBollingerBands } = require('./indicators');
const { trainAndPredict } = require('./predict');
const { trainClassifier } = require('./classify');

dotenv.config();
const app = express();
app.use(cors());
const PORT = process.env.PORT || 3001;

const LOOKAHEAD = 5;
const THRESHOLD = 0.03;

app.get('/api/indicators/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const interval = req.query.interval || 'daily';

    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?serietype=line&apikey=${process.env.FMP_API_KEY}`;
    const { data } = await axios.get(url);

    if (!data.historical) {
      return res.status(404).json({ error: 'No data found' });
    }

    let raw = [...data.historical].reverse();
    console.log(`FMP response for ${symbol} (${interval}): ${raw.length}`);

    if (interval === 'monthly') {
      const seen = new Set();
      raw = raw.filter(d => {
        const key = d.date.slice(0, 7); // YYYY-MM
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    console.log(`Raw data after filter: ${raw.length}`);

    const closes = raw.map(d => d.close);
    const macd = calculateMACD(closes);
    const rsi = calculateRSI(closes);
    const bb = calculateBollingerBands(closes);
    const enriched = raw.map((d, i) => ({
      date: d.date,
      close: d.close,
      volume: d.volume,
      macd: macd[i]?.macd ?? 0,
      rsi: rsi[i] ?? 50,
      bb_upper: bb[i]?.upper ?? null,
      bb_lower: bb[i]?.lower ?? null
    }));

    // Step 1: Train prediction model
    const epochs = interval === 'monthly' ? 60 : 20;
    const { data: withPrediction, mape } = await trainAndPredict(enriched, epochs);

    // Step 2: Train classification model using predicted + price data
    const { data: finalData, accuracy, labelCounts } = await trainClassifier(withPrediction, LOOKAHEAD, epochs);

    // Step 3: Log model summary
    const csvPath = 'model_summary.csv';
    if (!fs.existsSync(csvPath)) {
      fs.writeFileSync(csvPath, 'timestamp,symbol,interval,threshold,lookahead,label_buy,label_hold,label_sell,accuracy,mape\n');
    }

    const csvRow = [
      new Date().toISOString(),
      symbol,
      interval,
      THRESHOLD,
      LOOKAHEAD,
      labelCounts.buy || 0,
      labelCounts.hold || 0,
      labelCounts.sell || 0,
      accuracy.toFixed(4),
      mape.toFixed(4)
    ].join(',') + '\n';

    fs.appendFileSync(csvPath, csvRow);

    res.json({
      data: finalData,
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
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

