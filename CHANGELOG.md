# 📄 Changelog

All notable changes to this project will be documented in this file.

This project follows [Semantic Versioning](https://semver.org/).

---

## [v1.0] - 2025-06-07

### 🎉 Initial Release

- Created backend using Express and TensorFlow.js
- Created frontend with React, Recharts, and Axios
- Implemented:
  - Price prediction model (Dense NN)
  - Classification model (`buy`, `hold`, `sell`)
- Added technical indicators: RSI, MACD
- Displayed predicted price vs. actual close
- Added dropdowns for symbol and time interval (daily/monthly)
- Computed and displayed MAPE and classification accuracy
- Logged model stats to `model_summary.csv`

---

## [Unreleased]

### 🔧 In Progress

- Toggle chart overlays with modal (RSI, MACD, BB)
- Improve labeling logic using hybrid conditions (RSI + price)
- Add model feature tracking and performance charting

