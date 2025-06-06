import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Legend,
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`/api/indicators/${symbol}`);
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

        setData(chartData);

        const preds = await trainAndPredict(chartData);
        setPredictions(preds.map((p, i) => ({ index: chartData[i].index, prediction: p[0] })));
      } catch (error) {
        console.error('Error fetching indicators:', error);
      }
    };
    fetchData();
  }, [symbol]);

  const combinedData = data.map((d, i) => ({
    ...d,
    prediction: predictions[i]?.prediction
  }));

return (
  <div style={{ padding: '20px' }}>
    <h2>{symbol} Stock Dashboard</h2>
    <div>
    <label htmlFor="symbol">Select Symbol: </label>
    <select
      id="symbol"
      value={symbol}
      onChange={(e) => setSymbol(e.target.value)}
    >
    {symbol.map(sym => (
      <option key={sym} value={sym}>{sym}</option>
    ))}
    </select>
    </div>

    {/* Price with Bollinger Bands and Predictions */}
    <h3>Price & Predictions with Bollinger Bands</h3>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data.map((d, i) => ({ ...d, prediction: predictions[i]?.prediction }))}>
        <XAxis dataKey="index" hide />
        <YAxis domain={['auto', 'auto']} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="close" stroke="#0000ff" name="Close" dot={false} />
        <Line type="monotone" dataKey="prediction" stroke="#ff0000" name="Prediction" dot={false} />
        <Line type="monotone" dataKey="upper" stroke="#00cc00" name="Upper BB" dot={false} />
        <Line type="monotone" dataKey="middle" stroke="#999999" name="Middle BB" dot={false} />
        <Line type="monotone" dataKey="lower" stroke="#00cc00" name="Lower BB" dot={false} />
      </LineChart>
    </ResponsiveContainer>

    {/* Volume */}
    <h3>Volume</h3>
    <ResponsiveContainer width="100%" height={100}>
      <BarChart data={data}>
        <XAxis dataKey="index" hide />
        <YAxis domain={['auto', 'auto']} />
        <Tooltip />
        <Bar dataKey="volume" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>

    {/* RSI */}
    <h3>Relative Strength Index (RSI)</h3>
    <ResponsiveContainer width="100%" height={150}>
      <LineChart data={data}>
        <XAxis dataKey="index" hide />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Line type="monotone" dataKey="rsi" stroke="#ff9900" name="RSI" dot={false} />
      </LineChart>
    </ResponsiveContainer>

    {/* MACD */}
    <h3>MACD</h3>
    <ResponsiveContainer width="100%" height={150}>
      <LineChart data={data}>
        <XAxis dataKey="index" hide />
        <YAxis domain={['auto', 'auto']} />
        <Tooltip />
        <Line type="monotone" dataKey="macd" stroke="#00bfff" name="MACD" dot={false} />
        <Line type="monotone" dataKey="signal" stroke="#ff00ff" name="Signal" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);
}

export default App;

