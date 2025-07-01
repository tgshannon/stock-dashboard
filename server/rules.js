// server/rules.js

function rulePct(current, future, threshold = 0.03) {
  const change = (future - current) / current;
  if (change > threshold) return 'buy';
  if (change < -threshold) return 'sell';
  return 'hold';
}

function ruleMacdCross(current, future) {
  const macdNow = current.macd ?? 0;
  const signalNow = current.signal ?? 0;
  const macdFuture = future.macd ?? 0;
  const signalFuture = future.signal ?? 0;

  if (macdNow < signalNow && macdFuture > signalFuture) return 'buy';
  if (macdNow > signalNow && macdFuture < signalFuture) return 'sell';
  return 'hold';
}

function ruleMacdDirection(current, future) {
  const macdChange = (future.macd ?? 0) - (current.macd ?? 0);
  if (macdChange > 1) return 'buy';
  if (macdChange < -1) return 'sell';
  return 'hold';
}

function getLabel(current, future, ruleSet = 'pct') {
  switch (ruleSet) {
    case 'pct':
      return rulePct(current.close, future.close);
    case 'macd-cross':
      return ruleMacdCross(current, future);
    case 'macd-direction':
      return ruleMacdDirection(current, future);
    default:
      return 'hold';
  }
}

module.exports = { getLabel };

