const tf = require('@tensorflow/tfjs-node');
const { buildMatrix } = require('./features');

/**
 * Train a 3-way classifier (buy/hold/sell) using indicator-enriched price data.
 *
 * @param {Array} data       Enriched input data with close, MACD, RSI, etc.
 * @param {number} lookahead How many steps forward to label action
 * @param {number} epochs    Number of epochs to train
 * @param {string[]} features Features used as input (e.g., ['close1', 'macd', ...])
 */
async function trainClassifier(data, lookahead, epochs, features) {
  if (typeof epochs !== 'number' || epochs <= 0) {
    throw new Error(`trainClassifier: invalid epochs ${epochs}. Must pass a positive number from server.`);
  }
  if (!Array.isArray(features) || features.length === 0) {
    throw new Error('trainClassifier: features array is missing or empty.');
  }

  // Build X (inputs), Y (one-hot labels), and meta (indexes for mapping back)
  const { X, Y, meta } = buildMatrix(data, features, true, lookahead);
  if (X.length === 0 || Y.length === 0) {
    console.warn('⚠️ Classification skipped: no training samples.');
    return { data, accuracy: null, labelCounts: {} };
  }

  console.log(`🧠 [Classify] Training on ${X.length} samples for ${epochs} epochs…`);
  console.log('🔍 [Classify] Before training:', tf.memory());

  const xs = tf.tensor2d(X);
  const ys = tf.tensor2d(Y);

  const optimizer = tf.train.adam();
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [X[0].length], units: 12, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));

  model.compile({
    loss: 'categoricalCrossentropy',
    optimizer,
    metrics: ['categoricalAccuracy'], // ✅ Use correct metric for one-hot labels
  });

  const result = await model.fit(xs, ys, { epochs });
  console.log('📈 [Classify] Accuracy history:', result.history.categoricalAccuracy);

  const finalAccuracy = Array.isArray(result.history.categoricalAccuracy)
    ? result.history.categoricalAccuracy[result.history.categoricalAccuracy.length - 1]
    : null;

  const preds = model.predict(xs);
  const predArray = await preds.array();

  tf.dispose([xs, ys, preds]);
  model.dispose();
  optimizer.dispose();

  console.log('✅ [Classify] After training:', tf.memory());
  console.log('🎯 Final accuracy:', finalAccuracy);

  const classList = ['buy', 'hold', 'sell'];
  const labelCounts = { buy: 0, hold: 0, sell: 0 };

  meta.forEach((m, i) => {
    const scores = predArray[i];
    const maxIdx = scores.indexOf(Math.max(...scores));
    const label = classList[maxIdx];
    data[m.index].action = label;
    data[m.index].confidence = scores[maxIdx];
    data[m.index].actionLabel = label;
    labelCounts[label]++;
  });

  return { data, accuracy: finalAccuracy, labelCounts };
}

module.exports = { trainClassifier };

