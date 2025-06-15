# 📝 TODO — Stock Dashboard

Track features, model improvements, and fixes here. Move completed tasks to `CHANGELOG.md` when tagged in a release.

---

## 🔧 Model Improvements

- [ ] Add MACD histogram as input feature
- [ ] Add Bollinger Band width as volatility indicator
- [ ] Tune classifier thresholds (e.g., asymmetric buy/sell trigger)
- [ ] Normalize all input features to prevent scale bias
- [ ] Compare model accuracy with and without volume
- [ ] Experiment with longer lookahead periods (e.g., 10 steps)

---

## 🧠 Model Labeling Logic

- [ ] Make label assignment depend on RSI or MACD crossover
- [ ] Add support for "take profit" or "exit" signal
- [ ] Log thresholds and lookahead in every `.csv` row

---

## 🧪 Evaluation & Debugging

- [ ] Visualize feature correlations with prediction accuracy
- [ ] Show top contributing features (e.g., SHAP-like display)
- [ ] Show recent predictions with true vs. predicted label

---

## 🖥️ Frontend / UX

- [ ] Add floating icon with modal toggle for chart overlays (✅ started)
- [ ] Show tooltip with recommendation, confidence, and label
- [ ] Auto-color close price line by classification output
- [ ] Persist user’s selected symbol and interval across reload
- [ ] Display comparison chart of price vs. predicted price (as band?)

---

## 🧹 Codebase Cleanup

- [ ] Auto-clear TensorFlow memory after every model run
- [ ] Create utility module for feature prep
- [ ] Move model logic into separate backend files (predict.js, classify.js)

---

## 📦 Versioning & Logs

- [x] Add CHANGELOG.md and tagging system
- [x] Log model runs to `model_summary.csv`
- [ ] Add model version to server response
- [ ] Track last trained version in frontend

---

## 📌 Stretch Goals

- [ ] Enable model saving/loading to avoid retraining
- [ ] Backtest predicted vs. actual over last 12 months
- [ ] Compare with real-world trading strategies
- [ ] Export labeled dataset for external ML tools (e.g., Colab)

---

> ✅ Tip: Check off items as you go and move completed work to `CHANGELOG.md` when tagging a new version.


