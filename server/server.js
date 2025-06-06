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

app.listen(3001, () => console.log('Server running on http://localhost:3001'));

