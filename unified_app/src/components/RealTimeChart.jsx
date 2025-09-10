import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts';
import { simulationSeshApi } from '../services/simulationSeshApi';

const RealTimeChart = ({ 
  symbol, 
  data, 
  interval = '30s', 
  currentTick, 
  isConnected,
  onIntervalChange,
  positions = [],
  currentPrice = null
}) => {
  // Get session ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const sessionIdFromUrl = urlParams.get('session');
  
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const [isChartReady, setIsChartReady] = useState(false);
  const [ohlcAtTick, setOhlcAtTick] = useState(null);
  
  // Refs for position overlays
  const positionOverlaysRef = useRef(new Map());
  const lineSeriesRef = useRef(new Map());

  // Initialize chart on mount
  useEffect(() => {
    if (!chartContainerRef.current) {
      return;
    }

    try {
      const chart = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
        layout: {
          background: { color: '#23283a' },
          textColor: '#e0e6f0',
        },
        grid: {
          vertLines: { color: '#2e3448' },
          horzLines: { color: '#2e3448' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: '#00ffe7',
            width: 1,
            style: LineStyle.Solid,
          },
          horzLine: {
            color: '#00ffe7',
            width: 1,
            style: LineStyle.Solid,
          },
        },
        rightPriceScale: {
          borderColor: '#2e3448',
          textColor: '#e0e6f0',
          autoScale: true,
        },
        timeScale: {
          borderColor: '#2e3448',
          textColor: '#e0e6f0',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      });

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderDownColor: '#ef5350',
        borderUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        wickUpColor: '#26a69a',
      });
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      chartRef.current = chart;
      candlestickSeriesRef.current = candlestickSeries;
      volumeSeriesRef.current = volumeSeries;
      setIsChartReady(true);

      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
          });
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        setIsChartReady(false);
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
        }
      };
    } catch (error) {
      console.error('❌ Error creating chart:', error);
      console.error('❌ Error stack:', error.stack);
    }
  }, []);

  // Function to update position overlays using v3.8.0 compatible methods
  const updatePositionOverlays = useCallback(() => {
    if (!chartRef.current || !isChartReady) return;

    console.log('🔄 Updating position overlays for symbol:', symbol);
    console.log('📊 Positions data:', positions);
    console.log('💰 Current price:', currentPrice);

    // Clear existing overlays
    positionOverlaysRef.current.forEach((overlay) => {
      if (overlay.entryMarker) {
        candlestickSeriesRef.current.setMarkers([]);
      }
    });
    positionOverlaysRef.current.clear();

    // Clear existing line series
    lineSeriesRef.current.forEach((lineSeries) => {
      if (lineSeries) {
        chartRef.current.removeSeries(lineSeries);
      }
    });
    lineSeriesRef.current.clear();

    // Get current position for the selected symbol
    const currentPosition = positions.find(pos => pos.symbol === symbol);
    console.log('🎯 Current position for symbol:', currentPosition);
    
    if (!currentPosition || currentPosition.holdings <= 0) {
      console.log('❌ No active position found for symbol:', symbol);
      return;
    }

    const { avg_price, holdings, pnl, stop_loss_price, take_profit_price } = currentPosition;
    console.log('📈 Position details:', { avg_price, holdings, pnl, stop_loss_price, take_profit_price });
    
    // Determine if position is in profit
    const isInProfit = currentPrice && avg_price ? currentPrice > avg_price : pnl > 0;
    console.log('💹 Position is in profit:', isInProfit);

    // Create markers for entry, stop loss, and take profit
    const markers = [];
    
    // Entry marker
    if (data && data.length > 0) {
      const latestTime = new Date(data[data.length - 1].timestamp).getTime() / 1000;
      markers.push({
        time: latestTime,
        position: 'belowBar',
        color: isInProfit ? '#26a69a' : '#ef5350',
        shape: 'arrowUp',
        text: `Entry: $${avg_price?.toFixed(2)} | P&L: ${pnl >= 0 ? '+' : ''}$${pnl?.toFixed(2)}`,
      });
    }

    // Set markers on candlestick series
    if (markers.length > 0) {
      candlestickSeriesRef.current.setMarkers(markers);
    }

    // Create horizontal line series for price levels
    if (data && data.length > 0) {
      const timeRange = data.map(item => new Date(item.timestamp).getTime() / 1000);
      const startTime = timeRange[0];
      const endTime = timeRange[timeRange.length - 1];

      // Entry price line
      const entryLineData = [
        { time: startTime, value: avg_price },
        { time: endTime, value: avg_price }
      ];
      
      const entryLineSeries = chartRef.current.addLineSeries({
        color: isInProfit ? '#26a69a' : '#ef5350',
        lineWidth: 3,
        lineStyle: 0, // Solid
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      entryLineSeries.setData(entryLineData);
      lineSeriesRef.current.set('entry', entryLineSeries);

      // Stop loss line
      if (stop_loss_price) {
        const stopLossData = [
          { time: startTime, value: stop_loss_price },
          { time: endTime, value: stop_loss_price }
        ];
        
        const stopLossSeries = chartRef.current.addLineSeries({
          color: '#ef5350',
          lineWidth: 2,
          lineStyle: 2, // Dashed
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        stopLossSeries.setData(stopLossData);
        lineSeriesRef.current.set('stopLoss', stopLossSeries);
        console.log('🛑 Stop loss line created at price:', stop_loss_price);
      }

      // Take profit line
      if (take_profit_price) {
        const takeProfitData = [
          { time: startTime, value: take_profit_price },
          { time: endTime, value: take_profit_price }
        ];
        
        const takeProfitSeries = chartRef.current.addLineSeries({
          color: '#26a69a',
          lineWidth: 2,
          lineStyle: 2, // Dashed
          crosshairMarkerVisible: false,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        takeProfitSeries.setData(takeProfitData);
        lineSeriesRef.current.set('takeProfit', takeProfitSeries);
        console.log('🎯 Take profit line created at price:', take_profit_price);
      }
    }

    // Store overlay references
    positionOverlaysRef.current.set(symbol, {
      entryMarker: markers.length > 0 ? markers[0] : null,
      position: currentPosition
    });

    console.log('✅ Position overlays updated successfully');

  }, [symbol, positions, currentPrice, isChartReady, data]);

  // Update position overlays when positions or current price changes
  useEffect(() => {
    updatePositionOverlays();
  }, [updatePositionOverlays]);

  // Real-time P&L updates - refresh overlays when current price changes
  useEffect(() => {
    if (currentPrice && positionOverlaysRef.current.has(symbol) && data && data.length > 0) {
      // Update the entry line color based on current profit/loss
      const overlay = positionOverlaysRef.current.get(symbol);
      if (overlay && overlay.position) {
        const { avg_price, pnl } = overlay.position;
        const isInProfit = currentPrice > avg_price;
        
        // Update entry line series color
        const entryLineSeries = lineSeriesRef.current.get('entry');
        if (entryLineSeries) {
          entryLineSeries.applyOptions({
            color: isInProfit ? '#26a69a' : '#ef5350',
          });
        }

        // Update marker with new P&L
        const latestTime = new Date(data[data.length - 1].timestamp).getTime() / 1000;
        const updatedMarkers = [{
          time: latestTime,
          position: 'belowBar',
          color: isInProfit ? '#26a69a' : '#ef5350',
          shape: 'arrowUp',
          text: `Entry: $${avg_price?.toFixed(2)} | P&L: ${pnl >= 0 ? '+' : ''}$${pnl?.toFixed(2)}`,
        }];
        
        candlestickSeriesRef.current.setMarkers(updatedMarkers);
      }
    }
  }, [currentPrice, symbol, data]);

  // Effect to apply data once the chart is ready and data is available
  useEffect(() => {
    if (!isChartReady || !candlestickSeriesRef.current || !volumeSeriesRef.current) {
      return;
    }

    if (!data || data.length === 0) {
      candlestickSeriesRef.current.setData([]);
      volumeSeriesRef.current.setData([]);
      return;
    }

    const transformedData = data.map(item => ({
      time: new Date(item.timestamp).getTime() / 1000,
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
    }));

    const transformedVolumeData = data.map(item => ({
      time: new Date(item.timestamp).getTime() / 1000,
      value: parseInt(item.volume),
      color: parseFloat(item.close) >= parseFloat(item.open) ? '#26a69a' : '#ef5350',
    }));

    try {
      candlestickSeriesRef.current.setData(transformedData);
      volumeSeriesRef.current.setData(transformedVolumeData);
      
      // Configure auto-scaling with padding
      if (transformedData.length > 0) {
        // Only consider candlestick data for auto-scaling
        const prices = transformedData.flatMap(candle => [candle.high, candle.low]);
        
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        const padding = priceRange * 0.1; // 10% padding
        
        // Create autoscale info provider for candlestick series
        const autoscaleInfoProvider = () => ({
          priceRange: {
            minValue: minPrice - padding,
            maxValue: maxPrice + padding,
          },
          margins: {
            above: 0.1,
            below: 0.1,
          },
        });
        
        // Apply autoscale info provider to candlestick series
        candlestickSeriesRef.current.applyOptions({
          autoscaleInfoProvider: autoscaleInfoProvider,
        });
        
        // Force the chart to recalculate and apply the new scale
        chartRef.current.timeScale().fitContent();
        
        console.log('📊 Auto-scaled chart to price range:', { 
          minPrice, 
          maxPrice, 
          paddedMin: minPrice - padding, 
          paddedMax: maxPrice + padding,
          dataPoints: transformedData.length
        });
      }
    } catch (error) {
      console.error('❌ Error setting chart data:', error);
    }

  }, [data, isChartReady, positions, symbol]);

  // Reset chart scale when symbol changes
  useEffect(() => {
    if (chartRef.current && isChartReady) {
      // Reset the price scale to auto when symbol changes
      chartRef.current.priceScale('right').applyOptions({
        autoScale: true,
      });
      
      // Clear any existing autoscale info provider
      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.applyOptions({
          autoscaleInfoProvider: undefined,
        });
      }
      
      console.log('🔄 Reset chart scale for symbol:', symbol);
    }
  }, [symbol, isChartReady]);

  // Fetch OHLC for the selected symbol at the current tick
  useEffect(() => {
    async function fetchOhlc() {
      if (!sessionIdFromUrl) return;
      
      try {
        const res = await simulationSeshApi.getOhlc({
          session_id: sessionIdFromUrl,
          symbol,
          tick: currentTick,
        });
        setOhlcAtTick(res.data);
      } catch {
        setOhlcAtTick(null);
      }
    }
    if (symbol && currentTick !== undefined && sessionIdFromUrl) {
      fetchOhlc();
    }
  }, [symbol, currentTick, sessionIdFromUrl]);

  // Add real-time updates
  const addRealtimeData = useCallback((newData) => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current) return;

    const time = new Date(newData.timestamp).getTime() / 1000;
    const candleData = {
      time,
      open: parseFloat(newData.open),
      high: parseFloat(newData.high),
      low: parseFloat(newData.low),
      close: parseFloat(newData.close),
    };

    const volumeData = {
      time,
      value: parseInt(newData.volume),
      color: parseFloat(newData.close) >= parseFloat(newData.open) ? '#26a69a' : '#ef5350',
    };

    candlestickSeriesRef.current.update(candleData);
    volumeSeriesRef.current.update(volumeData);
  }, []);

  // Expose addRealtimeData method to parent
  useEffect(() => {
    if (window.addRealtimeData) {
      window.addRealtimeData = addRealtimeData;
    }
  }, [addRealtimeData]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Chart Container */}
      <div 
        ref={chartContainerRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          position: 'relative'
        }} 
      />

      {/* Loading State */}
      {(!data || data.length === 0) && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#8b8fa3',
          fontSize: 16,
          textAlign: 'center'
        }}>
          <div>Loading chart data...</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>
            {symbol} • {interval}
          </div>
        </div>
      )}

      {/* OHLC Info Overlay */}
      {ohlcAtTick && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 10,
          background: 'rgba(35, 40, 58, 0.9)',
          padding: '8px 12px',
          borderRadius: 6,
          border: '1px solid #2e3448',
          fontSize: 12,
          color: '#8b8fa3'
        }}>
          <div>O: {ohlcAtTick.open != null && !isNaN(Number(ohlcAtTick.open)) ? Number(ohlcAtTick.open).toFixed(2) : '-'}</div>
          <div>H: {ohlcAtTick.high != null && !isNaN(Number(ohlcAtTick.high)) ? Number(ohlcAtTick.high).toFixed(2) : '-'}</div>
          <div>L: {ohlcAtTick.low != null && !isNaN(Number(ohlcAtTick.low)) ? Number(ohlcAtTick.low).toFixed(2) : '-'}</div>
          <div>C: {ohlcAtTick.close != null && !isNaN(Number(ohlcAtTick.close)) ? Number(ohlcAtTick.close).toFixed(2) : '-'}</div>
          <div>V: {ohlcAtTick.volume != null && !isNaN(Number(ohlcAtTick.volume)) ? Number(ohlcAtTick.volume) : '-'}</div>
        </div>
      )}
    </div>
  );
};

export default RealTimeChart; 