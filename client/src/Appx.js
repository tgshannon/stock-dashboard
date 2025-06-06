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
  const [inputSymbol, setInputSymbol] = useState('AAPL');

  const fetchData = async () => {
    try {
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
      })).filter(d => d.rsi && d.macd && d.signal);

      setChartData(enriched);
      trainModel(enriched);
    } catch (err) {
      console.error('Fetch error:', err);
    }
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
  }, [symbol]);

  return (
    <div>
      <h2>Stock Dashboard: {symbol}</h2>
      <input
        value={inputSymbol}
        onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === 'Enter' && setSymbol(inputSymbol)}
        placeholder="Enter symbol (e.g. AAPL)"
      />
      <button onClick={() => setSymbol(inputSymbol)}>Go</button>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={predictions} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis 
            yAxisId="left"
            domain={[dataMin => dataMin * 0.95, dataMax => dataMax * 1.05]} 
          />
          <YAxis
            yAxisId="right"
            orientation=""right
            domain={[0,100]}
          />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="close" stroke="#8884d8" name="Close" dot={false} yAxisId="left" />
          <Line type="monotone" dataKey="predicted" stroke="#ff7300" name="Predicted" dot={false} yAxisId="left" />
          <Line type="monotone" dataKey="bb_upper" stroke="#00C49F" name="Upper BB" dot={false}  yAxisId="left" />
          <Line type="monotone" dataKey="bb_lower" stroke="#FFBB28" name="Lower BB" dot={false} yAxisId="left" />
          <Line type="monotone" dataKey="rsi" stroke="#888888" name="RSI" dot={false} yAxisId="right" />
        </LineChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={150}>
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <XAxis dataKey="date" hide />
          <YAxis domain={[0, 'auto']} />
          <Tooltip />
          <Area type="monotone" dataKey="volume" stroke="#82ca9d" fill="#82ca9d" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default App;

