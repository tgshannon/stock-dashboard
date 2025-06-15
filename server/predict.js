// server/predict.js

const tf = require('@tensorflow/tfjs-node');
const { buildPredictionMatrix } = require('./features');

async function trainAndPredict(data, epochs = 20) {
  const { X, Y } = buildPredictionMatrix(data);

  if (!X.length || !Y.length) {
    console.warn("⚠️ Prediction skipped: insufficient input data.");
    return { data, mape: 0 };
  }

  const xs = tf.tensor2d(X);
  const ys = tf.tensor2d(Y, [Y.length, 1]);

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [X[0].length], units: 8, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1 }));
  model.compile({ loss: 'meanSquaredError', optimizer: 'adam' });

  await model.fit(xs, ys, { epochs });

  const preds = model.predict(xs).arraySync().map(p => p[0]);
  preds.forEach((p, i) => {
    data[i + 2].predicted = p;
  });

  const mape = preds.reduce((acc, p, i) => {
    const actual = Y[i];
    return acc + Math.abs((actual - p) / actual);
  }, 0) / preds.length;

  tf.dispose([xs, ys]);
  return { data, mape };
}

module.exports = { trainAndPredict };

