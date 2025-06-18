const tf = require('@tensorflow/tfjs-node');
const { buildMatrix } = require('./features');

async function trainAndPredict(data, features, epochs = 20) {
  if (!features || features.length === 0) {
    throw new Error('trainAndPredict: features array is missing or empty.');
  }

  const { X, Y } = buildMatrix(data, features, false);
  if (!X.length || !Y.length) return { data, mape: null };

  console.log('🔍 [Predict] Before training:', tf.memory());

  const xs = tf.tensor2d(X);
  const ys = tf.tensor2d(Y, [Y.length, 1]);
  const optimizer = tf.train.adam();

  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 8, inputShape: [X[0].length], activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1 }));
  model.compile({ loss: 'meanAbsolutePercentageError', optimizer });

  await model.fit(xs, ys, { epochs });

  const preds = model.predict(xs).dataSync();
  const result = data.slice(0, preds.length).map((d, i) => ({
    ...d,
    predicted: preds[i],
  }));

  const mape = result.reduce((sum, d, i) => {
    const actual = Y[i];
    const predicted = preds[i];
    return sum + Math.abs((actual - predicted) / actual);
  }, 0) / preds.length;

  tf.dispose([xs, ys]);
  model.dispose();
  optimizer.dispose();

  console.log('✅ [Predict] After training:', tf.memory());

  return { data: result, mape };
}

module.exports = { trainAndPredict };

