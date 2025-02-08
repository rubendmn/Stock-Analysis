import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import axios from "axios";

const API_URL = "https://query1.finance.yahoo.com/v8/finance/chart/";
const SYMBOL = "AAPL";
const INTERVAL = "1m";
const RANGE = "1d";

export default function StockAnalyzer() {
  const [data, setData] = useState([]);
  const [signal, setSignal] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${API_URL}${SYMBOL}`, {
          params: { interval: INTERVAL, range: RANGE }
        });
        const prices = response.data.chart.result[0].indicators.quote[0].close;
        const timestamps = response.data.chart.result[0].timestamp;
        
        const formattedData = timestamps.map((time, index) => ({
          time: new Date(time * 1000).toLocaleTimeString(),
          price: prices[index]
        }));

        setData(formattedData);
        analyzeData(prices);
      } catch (error) {
        console.error("Error fetching stock data", error);
      }
    };
    
    const interval = setInterval(fetchData, 60000); // Updates every minute
    fetchData();

    return () => clearInterval(interval);
  }, []);

  const analyzeData = (prices) => {
    if (prices.length < 14) return; // At least 14 data points needed for RSI
    const lastPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2];
    
    // Advanced criteria
    const movingAverage = prices.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const shortMA = prices.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const longMA = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
    
    // Calculate RSI (Relative Strength Index)
    const rsi = (() => {
      let gains = 0, losses = 0;
      for (let i = prices.length - 14; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
      }
      const rs = gains / Math.abs(losses || 1);
      return 100 - 100 / (1 + rs);
    })();

    // Price momentum (difference from 4 periods ago)
    const priceMomentum = lastPrice - prices[prices.length - 4];
    
    // Breakout (price higher than last 10 periods)
    const breakout = lastPrice > Math.max(...prices.slice(-10));

    let criteriaMet = 0;
    if (lastPrice > movingAverage) criteriaMet++;
    if (shortMA > longMA) criteriaMet++;
    if (rsi < 30) criteriaMet++;
    if (priceMomentum > 0) criteriaMet++;
    if (breakout) criteriaMet++;
    
    setSignal(criteriaMet >= 3 ? "Buy" : null);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Real-Time Stock Analysis ({SYMBOL})</h1>
      {signal && <div className="text-green-500 font-bold">{signal} signal detected</div>}
      <Card className="p-4 mt-4">
        <LineChart width={600} height={300} data={data}>
          <XAxis dataKey="time" hide={false} />
          <YAxis domain={['auto', 'auto']} />
          <Tooltip />
          <Line type="monotone" dataKey="price" stroke="#8884d8" />
        </LineChart>
      </Card>
    </div>
  );
}
