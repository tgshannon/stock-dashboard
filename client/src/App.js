import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ReferenceArea
} from 'recharts';
import Modal from 'react-modal';

const App = () => {
  const [symbol, setSymbol] = useState('AAPL');
  const [interval, setInterval] = useState('daily');
  const [chartData, setChartData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [mape, setMape] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [labelCounts, setLabelCounts] = useState({});
  const [mode, setMode] = useState('both');
  const [showRSI, setShowRSI] = useState(false);
  const [showBB, setShowBB] = useState(false);
  const [showPrediction, setShowPrediction] = useState(true);
  const [showAction, setShowAction] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    setChartData([]);
    setDisplayData([]);
    try {
      const res = await fetch(`/api/indicators/${symbol}?interval=${interval}`);
      const json = await res.json();
      setChartData(json.data || []);
      setMape(json.mape || null);
      setAccuracy(json.accuracy || null);
      setLabelCounts(json.labelCounts || null);
    } catch (err) {
      console.error('Fetch error:', err.message);
    }
  };

  useEffect(() => {
    const sliced = chartData.slice(-100);
    setDisplayData(sliced);
    console.log('📊 displayData (last 100):', sliced);
  }, [chartData]);

  const backgroundBands = (mode === 'action' || mode === 'both') && showAction
    ? displayData
        .filter((d, i) => d.action && displayData[i + 1])
        .map((d, i) => ({
          x1: d.date,
          x2: displayData[i + 1].date,
          color:
            d.action === 'buy'
              ? 'rgba(144,238,144,0.3)'
              : d.action === 'sell'
              ? 'rgba(255,99,71,0.3)'
              : 'rgba(255,255,102,0.2)',
        }))
    : [];

  console.log('🎨 backgroundBands:', backgroundBands);

  const latestAction = [...displayData].reverse().find(d => d.action);

  return (
    <div style={{ padding: '1rem' }}>
      <h2>{symbol} Stock Dashboard</h2>

      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        Symbol:{' '}
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          style={{ width: 100 }}
        />
        Interval:{' '}
        <select value={interval} onChange={(e) => setInterval(e.target.value)}>
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
        </select>
        Mode:{' '}
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="price">Price Prediction</option>
          <option value="action">Action Classification</option>
          <option value="both">Both</option>
        </select>
        <button onClick={fetchData}>Go</button>
        <div style={{ marginLeft: '2rem' }}>   
          <strong>Action:</strong>{' '}
          {latestAction?.action ? latestAction.action.toUpperCase() : 'N/A'}<br />
          <strong>Confidence:</strong>{' '}
          {latestAction?.confidence ? (latestAction.confidence * 100).toFixed(1) + '%' : 'N/A'}
        </div>
      </div>

       {(mape || accuracy) && (
          <div style={{ marginBottom: '1rem', background: '#f9f9f9', padding: '1rem', borderRadius: '8px', width: 'fit-content' }}>
            <h4 style={{ margin: 0 }}>📊 Model Stats</h4>
            {mape && <div><strong>MAPE:</strong> {(mape * 100).toFixed(2)}%</div>}
            {accuracy && <div><strong>Accuracy:</strong> {(accuracy * 100).toFixed(2)}%</div>}
            {labelCounts && (
          <div>
            <strong>Labels:</strong>{' '}
            Buy: {labelCounts.buy ?? 0}, Hold: {labelCounts.hold ?? 0}, Sell: {labelCounts.sell ?? 0}
          </div>
        )}
      </div>
    )}


      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={displayData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" domain={['auto', 'auto']} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
          <Tooltip
            formatter={(value, name, props) => {
              const { payload } = props;
              const action = payload?.action;
              const confidence = payload?.confidence;
              if (name === 'Close' && action) {
                return [`${value} (${action.toUpperCase()}, ${(confidence * 100).toFixed(1)}%)`, name];
              }
              console.log('Tooltip payload:', payload);
              return [value, name];
            }}
          />

          {backgroundBands.length === 0 && (
            <text x={100} y={40} fill="red">
              No zones found — check action/classification data.
            </text>
          )}

          {backgroundBands.map((b, i) => (
            <ReferenceArea key={i} x1={b.x1} x2={b.x2} strokeOpacity={0} fill={b.color} />
          ))}

          <Line dataKey="close" stroke="#000" dot={false} name="Close" yAxisId="left" />

          {showBB && (
            <>
              <Line dataKey="bb_upper" stroke="#00C49F" dot={false} name="BB Upper" yAxisId="left" />
              <Line dataKey="bb_lower" stroke="#FFBB28" dot={false} name="BB Lower" yAxisId="left" />
            </>
          )}

          {showPrediction && (mode === 'price' || mode === 'both') && (
            <Line
              dataKey="prediction"
              stroke="#8884d8"
              dot={false}
              name="Prediction"
              yAxisId="left"
            />
          )}

          {showRSI && (
            <Line
              dataKey="rsi"
              stroke="#888888"
              dot={false}
              name="RSI"
              yAxisId="right"
              strokeDasharray="3 3"
            />
          )}
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

      <button
        onClick={() => setIsModalOpen(true)}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          background: '#eee',
          border: '1px solid #ccc',
          padding: '0.5rem',
          borderRadius: '50%',
          fontSize: '20px',
          cursor: 'pointer',
        }}
      >
        ⚙️
      </button>

      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        style={{
          content: {
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          },
        }}
      >
        <h3>Chart Settings</h3>
        <label>
          <input type="checkbox" checked={showRSI} onChange={() => setShowRSI(!showRSI)} /> Show RSI
        </label>
        <br />
        <label>
          <input type="checkbox" checked={showBB} onChange={() => setShowBB(!showBB)} /> Show Bollinger Bands
        </label>
        <br />
        <label>
          <input type="checkbox" checked={showPrediction} onChange={() => setShowPrediction(!showPrediction)} /> Show Price Prediction
        </label>
        <br />
        <label>
          <input type="checkbox" checked={showAction} onChange={() => setShowAction(!showAction)} /> Show Buy/Sell/Hold Zones
        </label>
        <br />
        <button onClick={() => setIsModalOpen(false)} style={{ marginTop: '1rem' }}>
          Close
        </button>
      </Modal>
    </div>
  );
};

export default App;

