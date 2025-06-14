/src
# 📈 Stock Dashboard with Machine Learning

This project provides an interactive dashboard for visualizing stock data and applying two machine learning models:

- A **prediction model** for forecasting closing prices
- A **classification model** for generating trading signals (`buy`, `hold`, `sell`)

Data is fetched from the Financial Modeling Prep API (FMP), and models are trained on the fly using TensorFlow.js.

---

## 🧰 Features

- Fetch daily or monthly price history
- Compute technical indicators: RSI, MACD, Bollinger Bands
- Predict future prices using a dense neural network
- Classify action labels (`buy`, `sell`, `hold`) based on price movement
- View model stats: MAPE, accuracy, label distribution
- Log model performance to `model_summary.csv`
- Fully interactive React frontend
- Node/Express backend using live FMP data

---

## 🛠️ Setup Instructions

### 1. Clone the Repo

```bash
git clone https://github.com/YOUR_USERNAME/stock-dashboard.git
cd stock-dashboard


cd server
npm install


cd ../client
npm install


Create a .env file in rh server/ directory

FMP_API_KEY=your_fmp_api_key_here


From the server/ directory:

node server.js

From the client/ directory:

npm start


