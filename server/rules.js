// rules.js

// --- Rule 1: Percent Change Threshold
function rulePct(currentClose, futureClose, threshold = 0.03) {
  const change = (futureClose - currentClose) / currentClose;
  if (change > threshold) return 'buy';
  if (change < -threshold) return 'sell';
  return 'hold';
}

// --- Rule 2: MACD Cross
function ruleMacdCross(current, future) {
  const macdNow = current.macd ?? 0;
  const signalNow = current.signal ?? 0;
  const macdFuture = future.macd ?? 0;
  const signalFuture = future.signal ?? 0;

  if (macdNow < signalNow && macdFuture > signalFuture) return 'buy';
  if (macdNow > signalNow && macdFuture < signalFuture) return 'sell';
  return 'hold';
}

// --- Rule 3: MACD Direction
function ruleMacdDirection(current, future) {
  const macdChange = (future.macd ?? 0) - (current.macd ?? 0);
  if (macdChange > 1) return 'buy';
  if (macdChange < -1) return 'sell';
  return 'hold';
}

// --- Rule 4: Custom MACD Rule (your logic)
function ruleCustom(current, previous, prev2) {
  // Buy when MACD crosses above zero
  if (
    (current.macd > 0 && previous.macd < 0) ||
    (current.closeShortMA > current.closeLongMA && 
      previous.closeShortMA < previous.closeLongMA) ||
    (current.close < current.closeLongMA)
  ) {
    return 'buy';
  }

  // Sell when MACD reverses sharply
  if (
    (current.macd - previous.macd < 0) &&
    (previous.macd - prev2.macd > 0)
  ) {
    return 'sell';
  }

  return 'hold';
}

// --- Rule 5: MACD Momemtum Rule (ChatGPT logic)
function ruleMomentumMACD(current) {
  const { macd, macd_1, macd_2 } = current;

  if (macd == null || macd_1 == null || macd_2 == null) return 'hold';

  if (macd < 0 && macd_1 > 0 && macd_2 > 0) return 'buy';
  if (macd > 0 && macd_1 < 0 && macd_2 < 0) return 'sell';
  return 'hold';
}

// --- Main dispatcher
function getLabel(current, future, ruleSet = 'pct', history = []) {
  //console.log('[getLabel] ruleSet:', ruleSet);

  switch (ruleSet) {
    case 'pct':
      return rulePct(current.close, future.close);
    case 'macd-cross':
      return ruleMacdCross(current, future);
    case 'macd-direction':
      return ruleMacdDirection(current, future);
    case 'custom-macd':
      const previous = history[history.length - 2] ?? current;
      const prev2 = history[history.length - 3] ?? previous;
      return ruleCustom(current, previous, prev2);
    case 'momentum-macd':
      return ruleMomentumMACD(current);

    default:
      return 'hold';
  }
}

module.exports = { getLabel };

