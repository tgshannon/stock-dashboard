import * as tf from '@tensorflow/tfjs';

export function prepareData(data) {
  const inputs = data.map(d => [d.rsi, d.macd, d.roc, d.close1, d.close2, d.close]);
  const outputs = data.map(d => d.close);
  return {
    inputs: tf.tensor2d(inputs),
    outputs: tf.tensor2d(outputs, [outputs.length, 1]),
  };
}

export function buildModel() {
  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 10, activation: 'relu', inputShape: [6] }));
  model.add(tf.layers.dense({ units: 1 }));
  model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
  return model;
}

export async function trainAndPredict(data) {
  const { inputs, outputs } = prepareData(data);
  const model = buildModel();

  await model.fit(inputs, outputs, {
    epochs: 20,
    batchSize: 16,
    shuffle: true,
    verbose: 1,
  });

  const predictions = model.predict(inputs);
  return predictions.array();
}

