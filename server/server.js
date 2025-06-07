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

/**
app.get('/api/indicators/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const response = await axios.get(`https://financialmodelingprep.com/api/v3/historical-chart/1hour/${symbol}?apikey=${API_KEY}`);
    const prices = response.data.reverse();
    const indicators = calculateIndicators(prices);
    res.json(indicators);
  } catch (error) {
    console.error('Error fetching or processing data:', error.message);
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});
**/

app.get('/api/indicators/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const interval = req.query.interval || 'daily';

  try {
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?serietype=line&apikey=${process.env.FMP_API_KEY}`;
    const response = await axios.get(url);
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
/**
    const enriched = calculateIndicators(filtered); // however you apply RSI, MACD, etc.
    console.log('Enriched type:', typeof enriched);
    console.log('Is array?', Array.isArray(enriched));
    console.log('Enriched sample:', enriched?.slice?.(0,3));
    const sorted = enriched.data.sort((a,b) => new Date(a.date) - new Date(b.date));
    res.json(sorted);
**/
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

const sorted = enriched.sort((a, b) => new Date(a.date) - new Date(b.date));
res.json(sorted);


  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});

app.listen(3001, () => console.log('Server running on http://localhost:3001'));

