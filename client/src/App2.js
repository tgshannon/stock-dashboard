import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { trainAndPredict } from './predict';

function App() {
  const [data, setData] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [symbol, setSymbol] = useState('AAPL');
  const [inputSymbol, setInputSymbol] = useState('AAPL');
  const [interval, setInterval] = useState('daily');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`/api/indicators/${symbol}`, {
          params: { interval }  // adds ?interval=daily or ?interval=monthly
        });
console.log('Backend data:', response.data);

        const { close, rsi, macd, bbands, volume, roc } = response.data;

        const chartData = close.map((c, i) => ({
          index: i,
          close: c,
          close1: close[i-1],
          close2: close[i-2],
          rsi: rsi[i],
          macd: macd[i]?.MACD,
          signal: macd[i]?.signal,
          upper: bbands[i]?.upper,
          middle: bbands[i]?.middle,
          lower: bbands[i]?.lower,
          volume: volume[i],
          roc: roc[i]
        }))
        .filter(d => d.close1 != null && d.close2 != null && d.rsi != null && d.macd != null && d.roc != null)
        .slice(-100);
console.log('Chart data sample:', chartData.slice(0,3));

        setData(chartData);

        const preds = await trainAndPredict(chartData);
        setPredictions(preds.map((p, i) => ({ index: chartData[i].index, prediction: p[0] })));
      } catch (error) {
        console.error('Error fetching indicators:', error);
      }
    };
    fetchData();
  }, [symbol, interval]);  // include interval in call

  const combinedData = data.map((d, i) => ({
    ...d,
    prediction: predictions[i]?.prediction
  }));

  return (
    <div style={{ padding: '1rem' }}>
      <h2>{symbol} Stock Dashboard</h2>

    <div style={{ marginBottom: '1rem' }}>
      <label htmlFor="symbol">Symbol:&nbsp;</label>
      <input
        id="symbol"
        type="text"
        value={inputSymbol}
        onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === 'Enter') setSymbol(inputSymbol);
        }}
        placeholder="Enter symbol (e.g. AAPL)"
      />
      <button onClick={() => setSymbol(inputSymbol)}>Go</button>
    </div>

<div style={{ marginBottom: '1rem' }}>
  <label htmlFor="interval">Interval:&nbsp;</label>
  <select
    id="interval"
    value={interval}
    onChange={(e) => setInterval(e.target.value)}
  >
    <option value="daily">Daily</option>
    <option value="monthly">Monthly</option>
  </select>
</div>


      <h3>Price, Predictions & Bollinger Bands</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={combinedData}>
          <XAxis dataKey="date" />
          <YAxis 
            tickFormatter={(value) => Math.round(value)}
            allowDecimals={false}
            domain={[ 'datamin - 50', 'datamax + 50']}
          />
          <Tooltip />
          <Line type="monotone" dataKey="close" stroke="#8884d8" />
          <Line type="monotone" dataKey="prediction" stroke="#ff7300" />
          <Line type="monotone" dataKey="upper" stroke="#82ca9d" />
          <Line type="monotone" dataKey="middle" stroke="#aaaaaa" />
          <Line type="monotone" dataKey="lower" stroke="#82ca9d" />
        </LineChart>
      </ResponsiveContainer>

      <h3>Volume</h3>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={combinedData}>
          <XAxis dataKey="index" hide />
          <YAxis type="number" domain={['auto', 'auto']} width={100} />
          <Tooltip />
          <Bar dataKey="volume" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>

      <h3>RSI</h3>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={combinedData}>
          <XAxis dataKey="index" hide />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Line dataKey="rsi" stroke="#ff7300" />
        </LineChart>
      </ResponsiveContainer>

      <h3>MACD</h3>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={combinedData}>
          <XAxis dataKey="index" hide />
          <YAxis />
          <Tooltip />
          <Line dataKey="macd" stroke="#00bcd4" />
          <Line dataKey="signal" stroke="#ff9800" />
        </LineChart>
      </ResponsiveContainer>

      <h3>Rate of Change (ROC)</h3>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={combinedData}>
          <XAxis dataKey="index" hide />
          <YAxis />
          <Tooltip />
          <Line dataKey="roc" stroke="#673ab7" />
        </LineChart>
      </ResponsiveContainer>

      <h3>Predictions</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={combinedData}>
          <XAxis dataKey="index" hide />
          <YAxis />
          <Tooltip />
          <Line dataKey="prediction" stroke="#e91e63" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default App;

