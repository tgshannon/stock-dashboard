const tf = require('@tensorflow/tfjs-node');
const { buildMatrix } = require('./features');
const { getLabel } = require('./rules');

async function trainClassifier(data, lookahead, epochs, features, ruleSet = 'pct') {
  if (!features || !Array.isArray(features) || features.length === 0) {
    throw new Error(`trainClassifier: invalid features passed: ${features}`);
  }

  console.log('🧠 [Classify] Features passed to classifier:', features);

  const { X, Y, meta } = buildMatrix(data, features, true, lookahead, ruleSet, getLabel);
  if (!X.length || !Y.length) {
    console.warn('⚠️ Classification skipped: no training samples.');
    return { data, accuracy: null, labelCounts: {} };
  }

  console.log(`🧠 [Classify] Training on ${X.length} samples for ${epochs} epochs…`);
  console.log('🔍 [Classify] Before training:', tf.memory());

  const xs = tf.tensor2d(X);
  const ys = tf.oneHot(tf.tensor1d(Y, 'int32'), 3);

  const optimizer = tf.train.adam();
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [X[0].length], units: 12, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));

  model.compile({
    loss: 'categoricalCrossentropy',
    optimizer,
    metrics: ['categoricalAccuracy'],
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

  return { updatedData: data, accuracy: finalAccuracy, labelCounts };
}

module.exports = { trainClassifier };

