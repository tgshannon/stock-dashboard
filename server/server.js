const express = require('express');
const axios = require('axios');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const tf = require('@tensorflow/tfjs-node');

const { addIndicators } = require('./indicators');
const { trainAndPredict } = require('./predict');
const { trainClassifier } = require('./classify');

const app = express();
app.use(cors());
const PORT = 3001;

function safeFeatureParse(value, fallback) {
  return typeof value === 'string' && value !== 'undefined' && value.trim().length > 0
    ? value.split(',').filter(f => f)
    : fallback;
}

app.get('/api/indicators/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { interval = 'daily', predFeatures, classFeatures } = req.query;

  const featuresPred = safeFeatureParse(predFeatures, ['close1', 'close2', 'macd']);
  const featuresClass = safeFeatureParse(classFeatures, ['close1', 'close2', 'macd']);
  const lookahead = 5;
  const epochs = interval === 'monthly' ? 60 : 20;

  try {
    const url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?serietype=line&apikey=${process.env.FMP_API_KEY}`;
    const fmpRes = await axios.get(url);
    const raw = fmpRes.data?.historical || [];

    console.log(`📡 FMP response for ${symbol} (${interval}): ${raw.length}`);

    const filtered = raw.sort((a, b) => new Date(a.date) - new Date(b.date))
      .filter(row => row && row.close != null && row.date && (
        interval === 'daily' ||
        (interval === 'monthly' && row.date.endsWith('-01'))
      ));

    console.log(`📉 Raw data after filter: ${filtered.length}`);

    if (!filtered.length) {
      return res.status(404).json({ error: 'No data found' });
    }

    const enriched = addIndicators(filtered);
    console.log('[DEBUG] Sample enriched:', enriched[0]);

    const { predictions, mape } = await trainAndPredict(enriched, featuresPred, epochs);

console.log('🧪 featuresClass:', featuresClass);
    const { updatedData, accuracy, labelCounts, actionInfo } =
      await trainClassifier(predictions, lookahead, epochs, featuresClass);

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
      accuracy?.toFixed(4) || '',
      mape?.toFixed(4) || ''
    ].join(',') + '\n';

    const header = 'timestamp,symbol,interval,lookahaed,pred_features,class_features,label_buy,label_hold,label_sell,accuracy,mape\n';
    const logPath = path.join(__dirname, 'model_summary.csv');
    if (!fs.existsSync(logPath)) fs.writeFileSync(logPath, header);
    fs.appendFileSync(logPath, summary);

    const final = updatedData.slice(-100);

//    return res.json(final.map(d => ({
//      date: d.date,
//      close: d.close,
//      predicted: d.predicted,
//      bb_upper: d.bb_upper,
//      bb_lower: d.bb_lower,
//      rsi: d.rsi,
//      action: d.action
//    })).map(d => ({
//      ...d,
//      actionInfo
//    })));

console.log('✅ Sending response with:', {
  mape,
  accuracy,
  labelCounts,
  actionInfo,
  sample: final.at(-1)
});


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
    actionInfo
  });


  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

