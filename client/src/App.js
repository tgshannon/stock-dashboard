import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';

const App = () => {
  const [symbol, setSymbol] = useState('AAPL');
  const [inputSymbol, setInputSymbol] = useState('AAPL');
  const [interval, setInterval] = useState('daily');
  const [chartData, setChartData] = useState([]);

  const fetchData = async () => {
    try {
      const res = await axios.get(`/api/indicators/${symbol}`, {
        params: { interval }
      });

      const enriched = res.data;

      console.log('Received enriched data:', enriched);

      setChartData(enriched.slice(-100));
    } catch (err) {
      console.error('Error fetching indicators:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [symbol, interval]);

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <label>Symbol:&nbsp;</label>
        <input
          value={inputSymbol}
          onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && setSymbol(inputSymbol)}
        />
        <button onClick={() => setSymbol(inputSymbol)}>Go</button>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>Interval:&nbsp;</label>
        <select value={interval} onChange={(e) => setInterval(e.target.value)}>
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <h3>{symbol} Price, Prediction & Indicators ({interval})</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis
            yAxisId="left"
            domain={['auto', 'auto']}
            tickFormatter={(v) => Math.round(v)}
            allowDecimals={false}
          />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" dataKey="close" stroke="#8884d8" name="Close" dot={false} />
          <Line yAxisId="left" dataKey="prediction" stroke="#ff7300" name="Predicted" dot={false} strokeDasharray="4 2" />
          <Line yAxisId="left" dataKey="bb_upper" stroke="#00C49F" name="Upper BB" dot={false} />
          <Line yAxisId="left" dataKey="bb_lower" stroke="#FFBB28" name="Lower BB" dot={false} />
          <Line yAxisId="right" dataKey="rsi" stroke="#888888" name="RSI" dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <h3>Volume</h3>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={chartData}>
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

