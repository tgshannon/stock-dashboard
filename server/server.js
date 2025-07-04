const express = require('express');
const axios = require('axios');
const cors = require('cors');
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');

const { buildMatrix } = require('./features');
const { addIndicators } = require('./indicators');
const { trainAndPredict } = require('./predict');
const { trainClassifier } = require('./classify');

const app = express();
const PORT = 3001;
app.use(cors());

function safeFeatureParse(param, fallback) {
  if (!param || typeof param !== 'string') return fallback;
  const arr = param.split(',').map(s => s.trim()).filter(Boolean);
  return arr.length ? arr : fallback;
}

app.get('/api/indicators/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { interval = 'daily', predFeatures, classFeatures } = req.query;

  const featuresPred = safeFeatureParse(predFeatures, ['close1', 'close2', 'macd']);
  const featuresClass = safeFeatureParse(classFeatures, ['close1', 'close2', 'macd']);
  const ruleSet = req.query.ruleSet || 'pct';

  const lookahead = interval === 'monthly' ? 2 : 5;
  const epochs = interval === 'monthly' ? 60 : 20;

  try {
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?serietype=line&apikey=${process.env.FMP_API_KEY}`;
    const fmpRes = await axios.get(url);

    // Fetch historical key metrics
    const metricsUrl = `https://financialmodelingprep.com/api/v3/key-metrics/${symbol}?limit=20&apikey=${process.env.FMP_API_KEY}`;
    const metricsRes = await axios.get(metricsUrl);
    const keyMetricsArray = metricsRes.data || [];

    let raw = [...(fmpRes.data?.historical || [])].sort((a, b) => new Date(a.date) - new Date(b.date));

    let filtered;
    if (interval === 'monthly') {
      const seen = new Set();
      filtered = raw.filter(row => {
        const key = row.date.slice(0, 7); // YYYY-MM
        if (!seen.has(key)) {
          seen.add(key);
          return true;
        }
        return false;
      });
    } else {
      filtered = raw.filter(row => row && row.close != null && row.date);
    }

    console.log(`📡 FMP response for ${symbol} (${interval}): ${raw.length}`);
    console.log(`📉 Raw data after filter: ${filtered.length}`);
    if (!filtered.length) {
      return res.status(404).json({ error: 'No data found' });
    }

    const enriched = addIndicators(filtered);
    console.log('[DEBUG] Sample enriched:', enriched.at(-1));

    const { predictions, mape, nextPrediction } = await trainAndPredict(enriched, featuresPred, epochs);

    const classifierResult = await trainClassifier(
      predictions,
      lookahead,
      epochs,
      featuresClass,
      ruleSet
    );

    const {
      updatedData = predictions,
      accuracy = 0,
      labelCounts = { buy: 0, hold: 0, sell: 0 },
      actionInfo = { label: 'hold', confidence: 0 }
    } = classifierResult;

    const summary = [
      new Date().toISOString(),
      symbol,
      interval,
      lookahead,
      featuresPred.join('|'),
      featuresClass.join('|'),
      labelCounts.buy || 0,
      labelCounts.hold || 0,
      labelCounts.sell || 0,
      accuracy.toFixed(4),
      mape?.toFixed(4) ?? ''
    ].join(',') + '\n';

    const header = 'timestamp,symbol,interval,lookahead,pred_features,class_features,label_buy,label_hold,label_sell,accuracy,mape\n';
    const logPath = path.join(__dirname, 'model_summary.csv');
    if (!fs.existsSync(logPath)) fs.writeFileSync(logPath, header);
    fs.appendFileSync(logPath, summary);

    const final = updatedData.slice(-100);

    return res.json({
      data: final.map(d => ({
        date: d.date,
        close: d.close,
        predicted: d.predicted,
        bb_upper: d.bb_upper,
        bb_lower: d.bb_lower,
        rsi: d.rsi,
        action: d.action
      })),
      mape,
      accuracy,
      labelCounts,
      actionInfo,
      nextPrediction,
      fundamentals: keyMetricsArray.map(m => ({
        date: m.date,
        freeCashFlowPerShare: m.freeCashFlowPerShare,
        returnOnTangibleAssets: parseFloat( m.returnOnTangibleAssets) * 100  
      }))

    });
  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/evaluate', async (req, res) => {
  try {
    const rawSets = JSON.parse(req.query.featureSets);
    const ruleSet = req.query.ruleSet || 'pct';
    const lookahead = parseInt(req.query.lookahead) || 1;
    const epochs = parseInt(req.query.epochs) || 20;
    const symbol = req.query.symbol || 'AAPL';
    const interval = req.query.interval || 'daily';

    const fmpKey = process.env.FMP_API_KEY;
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?serietype=line&apikey=${fmpKey}`;
    const { data } = await axios.get(url);
    const raw = [...(data?.historical || [])].reverse();
    const enriched = addIndicators(raw);

    const results = [];
    for (const featureSet of rawSets) {
      const { predictions, mape } = await trainAndPredict([...enriched], featureSet, epochs);
      const { accuracy, labelCounts } = await trainClassifier(predictions, lookahead, epochs, featureSet, ruleSet);

      results.push({ symbol, ruleSet, features: featureSet, mape, accuracy, labelCounts });
    }

    // Save results with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `eval-${symbol}-${timestamp}.json`;
    const filepath = path.join(__dirname, 'logs', filename);

    // Add timestamp to each result row
    results.forEach(r => r.timestamp = timestamp);

    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));

    console.log(`✅ Evaluation results saved to logs/${filename}`);

    res.json(results);
  } catch (err) {
    console.error('❌ /api/evaluate error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

