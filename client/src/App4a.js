import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { calculateRSI, calculateMACD, calculateBollingerBands } from './indicators';
import * as tf from '@tensorflow/tfjs';

const App = () => {
  const [symbol, setSymbol] = useState('AAPL');
  const [chartData, setChartData] = useState([]);
  const [predictions, setPredictions] = useState([]);

  const fetchData = async () => {
    const res = await fetch(`/api/stock?symbol=${symbol}`);
    const data = await res.json();
    if (!data || !data.length) return;

    const bb = calculateBollingerBands(data.map(d => d.close));
    const rsi = calculateRSI(data.map(d => d.close));
    const macd = calculateMACD(data.map(d => d.close));

    const enriched = data.map((d, i) => ({
      date: d.date,
      close: d.close,
      volume: d.volume,
      bb_upper: bb[i]?.upper,
      bb_lower: bb[i]?.lower,
      rsi: rsi[i],
      macd: macd[i]?.macd,
      signal: macd[i]?.signal,
    }));

    setChartData(enriched);
    trainModel(enriched);
  };

  const trainModel = async (data) => {
    const inputs = data.slice(0, -1).map(d => [
      d.close, d.volume, d.rsi || 50, d.macd || 0
    ]);
    const labels = data.slice(1).map(d => d.close);

    const xs = tf.tensor2d(inputs);
    const ys = tf.tensor2d(labels, [labels.length, 1]);

    const model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [4], units: 8, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1 }));

    model.compile({ loss: 'meanSquaredError', optimizer: 'adam' });
    await model.fit(xs, ys, { epochs: 20 });

    const preds = model.predict(xs).arraySync().map(p => p[0]);
    const predictionData = data.slice(0, preds.length).map((d, i) => ({
      ...d,
      predicted: preds[i],
    }));
    setPredictions(predictionData);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div>
      <h2>Stock Dashboard: {symbol}</h2>
      <input
        value={symbol}
        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === 'Enter' && fetchData()}
        placeholder="Enter symbol (e.g. AAPL)"
      />
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={predictions}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="close" stroke="#8884d8" />
          <Line yAxisId="left" type="monotone" dataKey="predicted" stroke="#ff7300" />
          <Line yAxisId="left" type="monotone" dataKey="bb_upper" stroke="#00C49F" dot={false} />
          <Line yAxisId="left" type="monotone" dataKey="bb_lower" stroke="#FFBB28" dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="rsi" stroke="#888888" />
        </LineChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={150}>
        <AreaChart data={chartData}>
          <XAxis dataKey="date" hide />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="volume" stroke="#82ca9d" fill="#82ca9d" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default App;

