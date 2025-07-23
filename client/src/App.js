import React, { useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Scatter, Label
} from 'recharts';
import './App.css';
import { FaCog } from 'react-icons/fa';

const defaultPredictionFeaturesByRule = {
  'pct': ['close1'],
  'macd-cross': ['macd', 'signal'],
  'macd-direction': ['macd'],
  'custom-macd': ['close1', 'macd', 'closeShortMA', 'closeLongMA'],
  'momentum-macd': ['predicted', 'macd', 'macd_1', 'macd_2']
};

const defaultClassificationFeaturesByRule = {
  'pct': ['close1'],
  'macd-cross': ['macd'],
  'macd-direction': ['macd'],
  'custom-macd': ['close1', 'macd', 'closeShortMA', 'closeLongMA'],
  'momentum-macd': ['macd', 'macd_1', 'macd_2']
};

function App() {
  const [symbol, setSymbol] = useState('AAPL');
  const [interval, setInterval] = useState('daily');
  const [ruleSet, setRuleSet] = useState('pct');
  const [data, setData] = useState([]);
  const [mape, setMape] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [labelCounts, setLabelCounts] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fundamentals, setFundamentals] = useState([]);

  const [showRSI, setShowRSI] = useState(true);
  const [showBB, setShowBB] = useState(true);
  const [showPredicted, setShowPredicted] = useState(true);

  const [predictionFeatures, setPredictionFeatures] = useState(defaultPredictionFeaturesByRule['pct']);
  const [classificationFeatures, setClassificationFeatures] = useState(defaultClassificationFeaturesByRule['pct']);
  const [selectedFeatures, setSelectedFeatures] = useState(defaultClassificationFeaturesByRule['pct']);

  const handleGo = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/evaluate', {
        params: {
          symbol,
          interval,
          ruleSet,
          featureSets: JSON.stringify([predictionFeatures, classificationFeatures])
        }
      });
      const result = response.data[0] || {};
      setData(result.predictions || []);
      setMape(result.mape ?? null);
      setAccuracy(result.accuracy ?? null);
      setLabelCounts(result.labelCounts ?? {});
      setFundamentals(result.fundamentals || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setData([]);
    }
  };

  const toggleFeature = (feature) => {
    setSelectedFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  console.log("Sample data before chartData:", data[0]);

  const chartData = (data || []).slice(-100).map((d, i, arr) => {
    const prev = arr[i - 1];
    const next = arr[i + 1];
    const macd = d.macd;

    const isPeak = prev && next && macd > prev.macd && macd > next.macd;
    const isTrough = prev && next && macd < prev.macd && macd < next.macd;

    return {
      ...d,
      close_buy: d.action === 'buy' ? d.close : null,                // ruleSet prediction
      close_hold: d.action === 'hold' ? d.close : null,
      close_sell: d.action === 'sell' ? d.close : null,

      predicted_buy: d.predictedAction === 'buy' ? d.predicted : null,   // classifier prediction
      predicted_hold: d.predictedAction === 'hold' ? d.predicted : null,
      predicted_sell: d.predictedAction === 'sell' ? d.close : null,

      macdTurn: isPeak ? 'sell' : isTrough ? 'buy' : null
    };
  });

  return (
    <div className="App">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label>Symbol:</label>
          <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} />

          <label>Interval:</label>
          <select value={interval} onChange={e => setInterval(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>

          <label>Rule Set:</label>
          <select
            value={ruleSet}
            onChange={e => {
              const newRule = e.target.value;
              setRuleSet(newRule);
              const pred = defaultPredictionFeaturesByRule[newRule];
              const classify = defaultClassificationFeaturesByRule[newRule];
              if (pred && classify) {
                setPredictionFeatures(pred);
                setClassificationFeatures(classify);
//                setSelectedFeatures(classify);
              }
            }}
          >
            <option value="pct">% Price Change — threshold-based</option>
            <option value="macd-cross">MACD Cross — cross signal line</option>
            <option value="macd-direction">MACD Direction — rising/falling</option>
            <option value="custom-macd">Custom MACD — zero line, slope & MA</option>
            <option value="momentum-macd">Momentum MACD — requires macd, macd_1, macd_2</option>
          </select>

          <button onClick={handleGo}>Go</button>
          <FaCog onClick={() => setIsModalOpen(!isModalOpen)} style={{ cursor: 'pointer' }} />
        </div>

        <div style={{ textAlign: 'left' }}>
          {predictionFeatures && <p><strong>Prediction Features:</strong> {predictionFeatures.join(', ')}</p>}
          {classificationFeatures && <p><strong>Classification Features:</strong> {classificationFeatures.join(', ')}</p>}
          {mape !== null && <p>MAPE: {(mape * 100).toFixed(2)}%</p>}
          {accuracy !== null && <p>Accuracy: {(accuracy * 100).toFixed(2)}%</p>}
          {labelCounts && (
            <div style={{ textAlign: 'left' }}>
              <strong>Labels:</strong>
              {Object.entries(labelCounts).map(([label, count]) => (
                <span key={label} style={{ marginLeft: '0.5rem' }}>{label}: {count}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div style={{ paddingLeft: '1rem' }}>
          <strong>Prediction Features:</strong><br />
          {['close1', 'close2', 'macd', 'macd_1', 'macd_2', 'rsi', 'signal', 'predicted', 'closeShortMA', 'closeLongMA'].map(f => (
            <label key={`pred-${f}`} style={{ marginRight: '1rem' }}>
              <input
                type="checkbox"
                checked={predictionFeatures.includes(f)}
                onChange={() =>
                  setPredictionFeatures(prev =>
                    prev.includes(f) ? prev.filter(p => p !== f) : [...prev, f]
                  )
                }
              /> {f}
            </label>
          ))}

          <br /><br />
          <strong>Classification Features:</strong><br />
          {['close1', 'close2', 'macd', 'macd_1', 'macd_2', 'rsi', 'signal', 'predicted', 'closeShortMA', 'closeLongMA'].map(f => (
            <label key={`class-${f}`} style={{ marginRight: '1rem' }}>
              <input
                type="checkbox"
                checked={classificationFeatures.includes(f)}
                onChange={() =>
                  setClassificationFeatures(prev =>
                    prev.includes(f) ? prev.filter(c => c !== f) : [...prev, f]
                  )
                }
              /> {f}
            </label>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', padding: '0.5rem 1rem' }}>
        <label>
          <input type="checkbox" checked={showRSI} onChange={() => setShowRSI(!showRSI)} />
          RSI
        </label>
        <label>
          <input type="checkbox" checked={showBB} onChange={() => setShowBB(!showBB)} />
          Bollinger Bands
        </label>
        <label>
          <input type="checkbox" checked={showPredicted} onChange={() => setShowPredicted(!showPredicted)} />
          Predicted Price
        </label>
      </div>


      <ResponsiveContainer width="100%" height={500}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" domain={['auto', 'auto']} />
          <YAxis yAxisId="right" orientation="right" />
            <Tooltip
              formatter={(value, name) =>
                typeof value === 'number' ? [value.toFixed(2), name] : [value, name]
              }
            />
          <Legend />

          <Line yAxisId="left" type="monotone" dataKey="close_buy" stroke="#00A000" dot={true} strokeWidth={2} name="Close (Buy)" />
          <Line yAxisId="left" type="monotone" dataKey="close_hold" stroke="#94b9eb" dot={true} strokeWidth={2} name="Close (Hold)" />
          <Line yAxisId="left" type="monotone" dataKey="close_sell" stroke="#FF3333" dot={true}  strokeWidth={2} name="Close (Sell)" />

          {showPredicted && (
            <Line yAxisId="left" type="monotone" dataKey="predicted" stroke="#82ca9d" dot={true} strokeWidth={2} name="Predicted" />
          )}

          {showBB && (
              <Line yAxisId="left" type="monotone" dataKey="bb_upper" stroke="#00C49F" dot={true} name="BB Upper" />
          )}
          {showBB && (
              <Line yAxisId="left" type="monotone" dataKey="bb_lower" stroke="#FFBB28" dot={false} name="BB Lower" />
          )}

          {showRSI && (
            <Line yAxisId="right" type="monotone" dataKey="rsi" stroke="#888888" dot={false} name="RSI" />
          )}

          <Line yAxisId="left" type="monotone" dataKey="predicted_buy" stroke="#006400" strokeDasharray="5 2" dot={false} name="Predicted (Buy)" />
          <Line yAxisId="left" type="monotone" dataKey="predicted_hold" stroke="#999999" strokeDasharray="5 2" dot={false} name="Predicted (Hold)" />
          <Line yAxisId="left" type="monotone" dataKey="predicted_sell" stroke="#990000" strokeDasharray="5 2" dot={false} name="Predicted (Sell)" />

          <Scatter data={chartData.filter(d => d.macdTurn === 'buy')} dataKey="close" yAxisId="left" fill="#006400" shape="star" name="MACD Turn (Buy)" />
          <Scatter data={chartData.filter(d => d.macdTurn === 'sell')} dataKey="close" yAxisId="left" fill="#8B0000" shape="diamond" name="MACD Turn (Sell)" />
        </LineChart>
      </ResponsiveContainer>

      {fundamentals.length > 0 && (
        <ResponsiveContainer width="45%" height={300}>
          <LineChart data={fundamentals} margin={{ top: 20, right: 30, left: 50, bottom: 45 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" >
              <Label value="Date" offset={-30} position="insideBottom" />
            </XAxis>

            <YAxis yAxisId="left" domain={['auto', 'auto']} tickFormatter={(v) => `$${v.toFixed(2)}`} >
              <Label value="Free Cash Flow" angle={-90} position="insideLeft" style={{ textAnchor: 'middle' }} />
            </YAxis>

            <YAxis 
              yAxisId="right"
              orientation="right"
              domain={[0, 'auto']} // scale 0% to 30%
              tickFormatter={(v) => `${v.toFixed(1)}%`}
            >
              <Label value="ROI (%)" angle={90} position="insideRight" style={{ textAnchor: 'middle' }} />
            </YAxis>

            <Tooltip formatter={(value, name) =>
              name === 'ROE'
                ? [`${(value * 1).toFixed(1)}%`, 'ROE']
                : [value.toFixed(2), 'Free Cash Flow']
            }/>
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="freeCashFlowPerShare" stroke="#3366cc" dot={false} name="Free Cash Flow" />
            <Line yAxisId="right" type="monotone" dataKey="returnOnEquity" stroke="#cc0000" dot={false} name="ROE" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default App;

