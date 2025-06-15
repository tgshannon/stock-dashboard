// server/classify.js

const tf = require('@tensorflow/tfjs-node');
const { buildClassificationMatrix } = require('./features');

async function trainClassifier(data, lookahead = 5, epochs = 20) {
  const { X, Y, meta } = buildClassificationMatrix(data, lookahead);

  if (!X.length || !Y.length) {
    console.warn("⚠️ Classification skipped: insufficient label data.");
    return {
      data,
      accuracy: 0,
      labelCounts: { buy: 0, hold: 0, sell: 0 }
    };
  }

  const xs = tf.tensor2d(X);
  const ys = tf.tensor2d(Y);

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [X[0].length], units: 8, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 3, activation: 'softmax' }));
  model.compile({ loss: 'categoricalCrossentropy', optimizer: 'adam' });

  await model.fit(xs, ys, { epochs });

  const preds = await model.predict(xs).array();
  const classList = ['buy', 'hold', 'sell'];
  const labelCounts = { buy: 0, hold: 0, sell: 0 };
  let correct = 0;

  meta.forEach((m, i) => {
    const maxIdx = preds[i].indexOf(Math.max(...preds[i]));
    const predLabel = classList[maxIdx];
    const actualLabel = m.label;
    data[m.index].action = predLabel;
    data[m.index].confidence = preds[i][maxIdx];
    data[m.index].actualLabel = actualLabel;
    data[m.index].predictedLabel = predLabel;
    labelCounts[actualLabel]++;
    if (actualLabel === predLabel) correct++;
  });

  tf.dispose([xs, ys]);
  const accuracy = correct / meta.length;
  return { data, accuracy, labelCounts };
}

module.exports = { trainClassifier };

