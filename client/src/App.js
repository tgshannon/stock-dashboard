import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ReferenceArea, Legend
} from 'recharts';
import Modal from 'react-modal';
import axios from 'axios';

const FEATURE_LIST = ['close1', 'close2', 'macd', 'rsi', 'predicted'];

const App = () => {
  const [symbol, setSymbol] = useState('AAPL');
  const [interval, setInterval] = useState('daily');
  const [features, setFeatures] = useState(['close1', 'close2', 'macd']);
  const [chartData, setChartData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [mape, setMape] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [labelCounts, setLabelCounts] = useState({});
  const [showRSI, setShowRSI] = useState(false);
  const [showBB, setShowBB] = useState(true);
  const [showPrediction, setShowPrediction] = useState(true);
  const [showAction, setShowAction] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleFeature = (f) => {
    setFeatures(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ interval });
      features.forEach(f => params.append('features', f));
      const res = await axios.get(`/api/indicators/${symbol}?${params.toString()}`);
      const json = res.data;
      setChartData(json.data || []);
      setMape(json.mape || null);
      setAccuracy(json.accuracy || null);
      setLabelCounts(json.labelCounts || {});
    } catch (err) {
      console.error('Fetch error:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    const filtered = chartData
      .filter(d => showBB ? (d.bb_upper != null && d.bb_lower != null) : true);
    setDisplayData(filtered.slice(-100));
  }, [chartData, showBB]);

  const backgroundBands = showAction
    ? displayData.map((d, i) => {
        const next = displayData[i + 1];
        if (!next || !d.action) return null;
        const color = d.action === 'buy'
          ? 'rgba(144,238,144,0.3)'
          : d.action === 'sell'
          ? 'rgba(255,99,71,0.3)'
          : 'rgba(255,255,102,0.2)';
        return { x1: d.date, x2: next.date, color };
      }).filter(Boolean)
    : [];

  return (
    <div style={{ padding: '1rem', cursor: loading ? 'wait' : 'default' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        Symbol:
        <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} style={{ width: 80 }} />
        Interval:
        <select value={interval} onChange={e => setInterval(e.target.value)}>
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
        </select>
        <button onClick={fetchData}>Go</button>
        <button onClick={() => setIsModalOpen(true)} style={{ marginLeft: '1rem' }}>⚙️</button>
        <div>
          {mape != null && <div><strong>MAPE:</strong> {(mape * 100).toFixed(2)}%</div>}
          {accuracy != null && <div><strong>Accuracy:</strong> {(accuracy * 100).toFixed(2)}%</div>}
          <div>
            Labels: Buy {labelCounts.buy ?? 0}, Hold {labelCounts.hold ?? 0}, Sell {labelCounts.sell ?? 0}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={displayData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" domain={['auto', 'auto']} />
          <YAxis yAxisId="right" orientation="right" hide={!showRSI} domain={[0, 100]} />
          <Tooltip formatter={(val, name, props) => {
            const point = props.payload;
            const extra = point && point.action ? ` (${point.action}, ${(point.confidence * 100).toFixed(1)}%)` : '';
            return [val, name + extra];
          }} />
          <Legend />
          {backgroundBands.map((b, i) =>
            <ReferenceArea key={i} x1={b.x1} x2={b.x2} strokeOpacity={0} fill={b.color} />
          )}
          <Line dataKey="close" stroke="#000" dot={false} yAxisId="left" name="Close" />
          {showBB && <Line dataKey="bb_upper" stroke="#00C49F" dot={false} yAxisId="left" name="BB Upper" />}
          {showBB && <Line dataKey="bb_lower" stroke="#FFBB28" dot={false} yAxisId="left" name="BB Lower" />}
          {showPrediction && <Line dataKey="predicted" stroke="#8884d8" dot={false} yAxisId="left" name="Predicted" />}
          {showRSI && <Line dataKey="rsi" stroke="#888" dot={false} yAxisId="right" name="RSI" />}
        </LineChart>
      </ResponsiveContainer>

      <ResponsiveContainer width="100%" height={100}>
        <AreaChart data={displayData}>
          <XAxis dataKey="date" hide />
          <YAxis domain={['auto', 'auto']} />
          <Tooltip />
          <Area dataKey="volume" stroke="#8884d8" fill="#82ca9d" />
        </AreaChart>
      </ResponsiveContainer>

      <Modal isOpen={isModalOpen} onRequestClose={() => setIsModalOpen(false)}>
        <h3>Settings</h3>
        <h4>Model Features</h4>
        {FEATURE_LIST.map(f => (
          <label key={f}>
            <input type="checkbox" checked={features.includes(f)} onChange={() => toggleFeature(f)} />
            {f}
          </label>
        ))}
        <h4>Chart Display</h4>
        <label><input type="checkbox" checked={showRSI} onChange={() => setShowRSI(!showRSI)} /> Show RSI</label><br/>
        <label><input type="checkbox" checked={showBB} onChange={() => setShowBB(!showBB)} /> Show Bollinger Bands</label><br/>
        <label><input type="checkbox" checked={showPrediction} onChange={() => setShowPrediction(!showPrediction)} /> Show Prediction</label><br/>
        <label><input type="checkbox" checked={showAction} onChange={() => setShowAction(!showAction)} /> Show Zones</label><br/>
        <button onClick={() => setIsModalOpen(false)}>Close</button>
      </Modal>
    </div>
  );
};

export default App;

