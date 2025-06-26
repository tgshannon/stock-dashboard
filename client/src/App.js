import React, { useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Scatter
} from 'recharts';
import Modal from 'react-modal';

Modal.setAppElement('#root');

const defaultFeatures = ['close1', 'close2', 'macd'];

const App = () => {
  const [symbol, setSymbol] = useState('AAPL');
  const [interval, setInterval] = useState('daily');
  const [ruleSet, setRuleSet] = useState('pct');
  const [chartData, setChartData] = useState([]);
  const [predictionFeatures, setPredictionFeatures] = useState(defaultFeatures);
  const [classificationFeatures, setClassificationFeatures] = useState(defaultFeatures);
  const [mape, setMape] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [labelCounts, setLabelCounts] = useState(null);
  const [actionInfo, setActionInfo] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const featureOptions = ['close1', 'close2', 'macd', 'rsi', 'predicted'];

  const toggleFeature = (feature, setFn, currentList) => {
    if (currentList.includes(feature)) {
      setFn(currentList.filter(f => f !== feature));
    } else {
      setFn([...currentList, feature]);
    }
  };

  const fetchData = async () => {
    try {
      const res = await axios.get(`/api/indicators/${symbol}?interval=${interval}`, {
        params: {
          predFeatures: predictionFeatures.join(','),
          classFeatures: classificationFeatures.join(','),
          ruleSet
        }
      });

      const { data, mape, accuracy, labelCounts, actionInfo } = res.data;

      const enhancedData = data.map(d => ({
        ...d,
        close_buy: d.action === 'buy' ? d.close : null,
        close_hold: d.action === 'hold' ? d.close : null,
        close_sell: d.action === 'sell' ? d.close : null
      }));

      setChartData(enhancedData);
      setMape(mape);
      setActionInfo(actionInfo);
      setAccuracy(accuracy);
      setLabelCounts(labelCounts);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const handleGo = () => {
    if (!symbol || !interval) return;
    if (predictionFeatures.length === 0 || classificationFeatures.length === 0) {
      alert('Please select at least one feature for both prediction and classification.');
      return;
    }
    fetchData();
  };

  const buyMarkers = chartData.filter(d => d.action === 'buy');
  const sellMarkers = chartData.filter(d => d.action === 'sell');

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Stock Dashboard</h2>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label>Symbol:</label>
          <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} style={{ width: 80 }} />

          <label>Interval:</label>
          <select value={interval} onChange={e => setInterval(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
          </select>

          <label>Rule:</label>
          <select value={ruleSet} onChange={e => setRuleSet(e.target.value)}>
            <option value="pct">% Price Change</option>
            <option value="macd-cross">MACD Cross</option>
            <option value="macd-direction">MACD Direction</option>
          </select>

          <button onClick={handleGo}>Go</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          {predictionFeatures.length > 0 && (
            <div><strong>Prediction Features:</strong> {predictionFeatures.join(', ')}</div>
          )}
          {mape != null && <div><strong>MAPE:</strong> {mape.toFixed(4)}</div>}
          {classificationFeatures.length > 0 && (
            <div><strong>Classification Features:</strong> {classificationFeatures.join(', ')}</div>
          )}
          {accuracy != null && <div><strong>Accuracy:</strong> {(accuracy * 100).toFixed(2)}%</div>}
          {actionInfo && (
            <div><strong>Action:</strong> {actionInfo.label} ({(actionInfo.confidence * 100).toFixed(1)}%)</div>
          )}
          {labelCounts && (
            <div>
              Buy: {labelCounts.buy}, Hold: {labelCounts.hold}, Sell: {labelCounts.sell}
            </div>
          )}
          <button onClick={() => setIsModalOpen(true)} style={{ marginTop: '0.5rem' }}>⚙️</button>
        </div>
      </div>

      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="#ccc" />
            <XAxis dataKey="date" />
            <YAxis domain={['auto', 'auto']} yAxisId="left" />
            <YAxis orientation="right" yAxisId="right" domain={[0, 100]} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const dataPoint = payload[0].payload;
                return (
                  <div style={{ backgroundColor: 'white', border: '1px solid #ccc', padding: '0.5rem' }}>
                    <div><strong>{label}</strong></div>
                    {payload.map((entry, idx) => (
                      <div key={idx} style={{ color: entry.color }}>
                        {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                      </div>
                    ))}
                    {dataPoint.action && (
                      <div><strong>Class:</strong> {dataPoint.action}</div>
                    )}
                    {dataPoint.confidence != null && (
                      <div><strong>Confidence:</strong> {(dataPoint.confidence * 100).toFixed(1)}%</div>
                    )}
                  </div>
                );
              }}
            />
            <Legend />

            <Line dataKey="close_buy" stroke="green" dot={false} strokeWidth={2} name="Close (Buy)" yAxisId="left" />
            <Line dataKey="close_hold" stroke="gray" dot={false} strokeWidth={2} name="Close (Hold)" yAxisId="left" />
            <Line dataKey="close_sell" stroke="red" dot={false} strokeWidth={2} name="Close (Sell)" yAxisId="left" />
            <Line dataKey="predicted" stroke="#ff7300" dot={false} name="Predicted" yAxisId="left" />
            <Line dataKey="bb_upper" stroke="#00C49F" dot={false} name="BB Upper" yAxisId="left" />
            <Line dataKey="bb_lower" stroke="#FFBB28" dot={false} name="BB Lower" yAxisId="left" />
            <Line dataKey="rsi" stroke="#888888" dot={false} name="RSI" yAxisId="right" />
            <Scatter data={buyMarkers} dataKey="close" yAxisId="left" fill="green" shape="triangle" name="Buy" />
            <Scatter data={sellMarkers} dataKey="close" yAxisId="left" fill="red" shape="triangle" name="Sell" />
          </LineChart>
        </ResponsiveContainer>
      )}

      <Modal isOpen={isModalOpen} onRequestClose={() => setIsModalOpen(false)}>
        <h3>Settings</h3>
        <h4>Prediction Features</h4>
        {featureOptions.map(f => (
          <div key={`pred-${f}`}>
            <label>
              <input
                type="checkbox"
                checked={predictionFeatures.includes(f)}
                onChange={() => toggleFeature(f, setPredictionFeatures, predictionFeatures)}
              />
              {f}
            </label>
          </div>
        ))}

        <h4>Classification Features</h4>
        {featureOptions.map(f => (
          <div key={`class-${f}`}>
            <label>
              <input
                type="checkbox"
                checked={classificationFeatures.includes(f)}
                onChange={() => toggleFeature(f, setClassificationFeatures, classificationFeatures)}
              />
              {f}
            </label>
          </div>
        ))}

        <button onClick={() => setIsModalOpen(false)} style={{ marginTop: '1rem' }}>Close</button>
      </Modal>
    </div>
  );
};

export default App;

