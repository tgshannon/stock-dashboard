import React, { useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import Modal from 'react-modal';

Modal.setAppElement('#root');

const defaultFeatures = ['close1', 'close2', 'macd'];

const App = () => {
  const [symbol, setSymbol] = useState('AAPL');
  const [interval, setInterval] = useState('daily');
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
          classFeatures: classificationFeatures.join(',')
        }
      });
console.log('🧾 Full API response:', res.data);

      const { data, mape, accuracy, labelCounts, actionInfo } = res.data;

      setChartData(data);
      setMape(mape);
      setActionInfo(actionInfo);
      setAccuracy?.(accuracy);
      setLabelCounts?.(labelCounts);

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

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Stock Dashboard</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <label>Symbol:</label>
        <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} style={{ width: 80 }} />

        <label>Interval:</label>
        <select value={interval} onChange={e => setInterval(e.target.value)}>
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
        </select>

        <button onClick={handleGo}>Go</button>

        <button onClick={() => setIsModalOpen(true)} style={{ marginLeft: 'auto' }}>⚙️</button>
      </div>

      <div style={{ marginTop: '1rem' }}>
        {mape && (
          <div><strong>MAPE:</strong> {mape.toFixed(4)}</div>
        )}
        {actionInfo && (
          <div><strong>Action:</strong> {actionInfo.label} (Confidence: {(actionInfo.confidence * 100).toFixed(1)}%)</div>
        )}
        {accuracy != null && (
          <div><strong>Accuracy:</strong> {(accuracy * 100).toFixed(2)}%</div>
        )}
        {labelCounts && (
          <div>
            <strong>Labels:</strong>
            {' '}Buy: {labelCounts.buy}, Hold: {labelCounts.hold}, Sell: {labelCounts.sell}
          </div>
        )}
      </div>

      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="#ccc" />
            <XAxis dataKey="date" />
            <YAxis domain={['auto', 'auto']} yAxisId="left" />
            <YAxis orientation="right" yAxisId="right" domain={[0, 100]}/>
            <Tooltip />
            <Legend />
            <Line dataKey="close" stroke="#8884d8" dot={false} name="Close" yAxisId="left" />
            <Line dataKey="predicted" stroke="#ff7300" dot={false} name="Predicted" yAxisId="left" />
            <Line dataKey="bb_upper" stroke="#00C49F" dot={false} name="BB Upper" yAxisId="left" />
            <Line dataKey="bb_lower" stroke="#FFBB28" dot={false} name="BB Lower" yAxisId="left" />
            <Line dataKey="rsi" stroke="#888888" dot={false} name="RSI" yAxisId="right" />

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

