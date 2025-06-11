import React, { useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';

const App = () => {
  const [symbol, setSymbol] = useState('');
  const [inputSymbol, setInputSymbol] = useState('AAPL');
  const [interval, setInterval] = useState('monthly');
  const [chartData, setChartData] = useState([]);
  const [mape, setMape] = useState(null);

  const computeVolumeSMA = (data, window = 10) => {
    return data.map((d, i) => {
      if (i < window - 1) return { ...d, volumeSMA: null };
      const slice = data.slice(i - window + 1, i + 1);
      const sum = slice.reduce((acc, val) => acc + (val.volume || 0), 0);
      return { ...d, volumeSMA: sum / window };
    });
  };

  const fetchData = async (selectedSymbol, selectedInterval) => {
    try {
      const res = await axios.get(`/api/indicators/${selectedSymbol}`, {
        params: { interval: selectedInterval }
      });
      const { data, mape } = res.data;

      // Flag up/down days
      const enriched = data.map((d, i) => ({
        ...d,
        up: i > 0 ? d.close >= data[i - 1].close : true
      }));

      // Compute volume SMA
      const final = computeVolumeSMA(enriched);

      setSymbol(selectedSymbol);
      setChartData(final.slice(-100));
      setMape(mape);
    } catch (err) {
      console.error('Error fetching indicators:', err);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Stock Dashboard</h2>

      <div style={{ marginBottom: '1rem' }}>
        <label>Symbol:&nbsp;</label>
        <input
          value={inputSymbol}
          onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              fetchData(inputSymbol, interval);
            }
          }}
        />
        &nbsp;
        <label>Interval:&nbsp;</label>
        <select value={interval} onChange={(e) => setInterval(e.target.value)}>
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
        </select>
        &nbsp;
        <button onClick={() => fetchData(inputSymbol, interval)}>Go</button>
      </div>

      {symbol && (
        <>
          <h3>{symbol} Price, Prediction & Indicators ({interval})</h3>
          {mape && <p>Prediction Accuracy (MAPE): <strong>{mape}%</strong></p>}

          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" domain={['auto', 'auto']} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" dataKey="close" stroke="#8884d8" dot={false} />
              <Line yAxisId="left" dataKey="prediction" stroke="#ff7300" dot={false} strokeDasharray="4 2" />
              <Line yAxisId="left" dataKey="bb_upper" stroke="#00C49F" dot={false} />
              <Line yAxisId="left" dataKey="bb_lower" stroke="#FFBB28" dot={false} />
              <Line yAxisId="right" dataKey="rsi" stroke="#888888" dot={false} />
            </LineChart>
          </ResponsiveContainer>

          <h4>Volume</h4>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
            >
              <XAxis dataKey="date" hide />
              <YAxis
                domain={[0, 'auto']}
                tickFormatter={(val) => `${(val / 1_000_000).toFixed(0)}M`}
              />
              <Tooltip
                formatter={(value, name) =>
                  name === 'volumeSMA'
                    ? [`${Math.round(value).toLocaleString()}`, 'SMA Volume']
                    : [`${Math.round(value).toLocaleString()}`, 'Volume']
                }
              />
              <Bar
                dataKey="volume"
                shape={(props) => {
                  const { x, y, width, height, payload } = props;
                  const color = payload.up ? '#4caf50' : '#f44336';
                  return <rect x={x} y={y} width={width} height={height} fill={color} />;
                }}
              />
              <Line
                type="monotone"
                dataKey="volumeSMA"
                stroke="#000"
                strokeWidth={2}
                dot={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
};

export default App;

