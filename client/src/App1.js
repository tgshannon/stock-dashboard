// client/src/App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, BarChart,
} from 'recharts';

function App() {
  const [symbol, setSymbol] = useState('AAPL');
  const [data, setData] = useState([]);
  const [rsi, setRSI] = useState([]);
  const [macd, setMACD] = useState([]);
  const [bbands, setBBands] = useState([]);
  const [volume, setVolume] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`http://localhost:3001/api/indicators/${symbol}`);
        const { close, rsi, macd, bbands, volume } = response.data;
        const chartData = close.map((c, i) => ({
          index: i,
          close: c,
          rsi: rsi[i],
          macd: macd[i]?.MACD,
          signal: macd[i]?.signal,
          upper: bbands[i]?.upper,
          middle: bbands[i]?.middle,
          lower: bbands[i]?.lower,
          volume: volume[i]
        })).slice(-100);
        setData(chartData);
        setRSI(rsi);
        setMACD(macd);
        setBBands(bbands);
        setVolume(volume);
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
    </div>
  );
}

export default App;


