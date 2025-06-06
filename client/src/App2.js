// client/src/App.js
import { trainAndPredict } from './predict';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, BarChart,
} from 'recharts';

function App() {
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`/api/indicators/${symbol}`);
        const { close, rsi, macd, bbands, volume, roc } = response.data;

  const maxLookback = Math.max(26, 20, 14); // MACD (26), BBands (20), RSI (14)
  const pad = Array(maxLookback - 1).fill(null);

  const chartData = close.map((c, i) => ({
    index: i,
    close: c,
    rsi: rsi[i - (close.length - rsi.length)] ?? null,
    macd: macd[i - (close.length - macd.length)]?.MACD ?? null,
    signal: macd[i - (close.length - macd.length)]?.signal ?? null,
    upper: bbands[i - (close.length - bbands.length)]?.upper ?? null,
    middle: bbands[i - (close.length - bbands.length)]?.middle ?? null,
    lower: bbands[i - (close.length - bbands.length)]?.lower ?? null,
    volume: volume[i] ?? null,
    roc: roc[i] ?? null
  })).slice(-150);


        setData(chartData);
        setRSI(rsi);
        setMACD(macd);
        setBBands(bbands);
        setVolume(volume);
        setROC(roc);

        const preds = await trainAndPredict(chartData);
        setPredictions(preds.map((p,i) => ({ index: chartData[i].index, prediction: p[0] })));
      } catch (error) {
        console.error('Error fetching indicators:', error);
      }
    };
    fetchData();
  }, [symbol]);

  return (
    <div>
      <h2>Stock Dashboard - {symbol}</h2>
      <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} />
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="index" />
          <YAxis domain={['auto', 'auto']} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="close" stroke="#8884d8" />
          <Line type="monotone" dataKey="upper" stroke="#82ca9d" />
          <Line type="monotone" dataKey="middle" stroke="#888888" />
          <Line type="monotone" dataKey="lower" stroke="#ff7300" />
        </LineChart>
      </ResponsiveContainer>

      <h3>Volume</h3>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={data}>
          <XAxis dataKey="index" hide />
          <YAxis hide />
          <Tooltip />
          <Bar dataKey="volume" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>

      <h3>MACD</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <XAxis dataKey="index" hide />
          <YAxis domain={['auto', 'auto']} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="macd" stroke="#8884d8" />
          <Line type="monotone" dataKey="signal" stroke="#ff7300" />
        </LineChart>
      </ResponsiveContainer>

      <h3>RSI</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <XAxis dataKey="index" hide />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Line type="monotone" dataKey="rsi" stroke="#82ca9d" />
        </LineChart>
      </ResponsiveContainer>

      <h3>Prediction</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data.map((d, i) => ({ ...d, prediction: predictions[i]?.prediction }))}>
          <XAxis dataKey="index" hide />
          <YAxis domain={['auto', 'auto']} />
          <Tooltip />
          <Line type="monotone" dataKey="prediction" stroke="#ff0000" />
        </LineChart>
      </ResponsiveContainer> 
    </div>
  );
}

export default App;


