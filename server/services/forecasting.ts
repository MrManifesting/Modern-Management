import { Matrix } from 'ml-matrix';
import { SimpleLinearRegression } from 'ml-regression';
import { TimeSeriesData } from '@shared/schema';

/**
 * Generate ARIMA forecast for time series data
 * 
 * This is a simplified ARIMA model implementation that uses
 * autoregressive techniques to forecast future values based on past data
 * 
 * @param timeSeriesData Historical time series data
 * @param forecastPeriods Number of periods to forecast
 * @param categoryOrWeight Category or weight to filter by (optional)
 * @returns Forecasted time series data
 */
export function generateForecast(
  timeSeriesData: TimeSeriesData[],
  forecastPeriods: number = 3,
  categoryOrWeight?: string
): TimeSeriesData[] {
  // Check if we have enough data to generate a forecast
  if (timeSeriesData.length < 3) {
    return [];
  }
  
  // Filter by category or weight if provided
  let filteredData = timeSeriesData;
  if (categoryOrWeight) {
    filteredData = timeSeriesData.filter(data => 
      data.label.includes(categoryOrWeight) || 
      data.metadata?.category === categoryOrWeight || 
      data.metadata?.packageSize === categoryOrWeight ||
      data.metadata?.strain === categoryOrWeight
    );
  }
  
  // Prepare data for ARIMA model - extract numerical data points
  const salesValues = filteredData.map(data => data.sales);
  const revenueValues = filteredData.map(data => data.revenue);
  const profitValues = filteredData.map(data => data.profit);
  
  // Generate time indices (assuming equally spaced data)
  const timeIndices = Array.from({ length: salesValues.length }, (_, i) => i + 1);
  
  // Determine last date label to continue sequence
  const lastLabel = filteredData[filteredData.length - 1].label;
  const lastDateMatch = lastLabel.match(/(\d{4})-(\d{2})-(\d{2})/);
  let lastDate: Date | null = null;
  
  if (lastDateMatch) {
    lastDate = new Date(lastDateMatch[0]);
  }
  
  // Function to forecast a single time series using a simple linear regression
  const forecastTimeSeries = (values: number[]): number[] => {
    try {
      // Create a regression model
      const regression = new SimpleLinearRegression(timeIndices, values);
      
      // Forecast future values
      const forecast: number[] = [];
      for (let i = 1; i <= forecastPeriods; i++) {
        const predictedValue = regression.predict(timeIndices.length + i);
        // Ensure values are non-negative
        forecast.push(Math.max(0, predictedValue));
      }
      
      return forecast;
    } catch (error) {
      console.error('Error generating forecast:', error);
      // Return zeros as fallback
      return Array(forecastPeriods).fill(0);
    }
  };
  
  // Generate forecasts for each metric
  const salesForecast = forecastTimeSeries(salesValues);
  const revenueForecast = forecastTimeSeries(revenueValues);
  const profitForecast = forecastTimeSeries(profitValues);
  
  // Create new time series data points for forecasted values
  const forecastedData: TimeSeriesData[] = [];
  
  for (let i = 0; i < forecastPeriods; i++) {
    let forecastLabel: string;
    
    if (lastDate) {
      // Generate the next date in sequence
      const nextDate = new Date(lastDate);
      nextDate.setMonth(nextDate.getMonth() + 1);
      lastDate = nextDate;
      
      // Format as YYYY-MM-DD
      forecastLabel = nextDate.toISOString().split('T')[0];
    } else {
      // If we couldn't parse a date, just use a numeric sequence
      forecastLabel = `Forecast ${i + 1}`;
    }
    
    forecastedData.push({
      label: forecastLabel,
      sales: salesForecast[i],
      revenue: revenueForecast[i],
      profit: profitForecast[i],
      isForecasted: true,
    });
  }
  
  return forecastedData;
}

/**
 * Calculate KPIs based on historical and forecasted data
 * 
 * @param historicalData Historical time series data
 * @param forecastedData Forecasted time series data
 * @returns Object containing KPIs
 */
export function calculateKPIs(
  historicalData: TimeSeriesData[],
  forecastedData: TimeSeriesData[]
) {
  // Calculate total historical metrics
  const totalHistoricalSales = historicalData.reduce((sum, data) => sum + data.sales, 0);
  const totalHistoricalRevenue = historicalData.reduce((sum, data) => sum + data.revenue, 0);
  const totalHistoricalProfit = historicalData.reduce((sum, data) => sum + data.profit, 0);
  
  // Calculate total forecasted metrics
  const totalForecastedSales = forecastedData.reduce((sum, data) => sum + data.sales, 0);
  const totalForecastedRevenue = forecastedData.reduce((sum, data) => sum + data.revenue, 0);
  const totalForecastedProfit = forecastedData.reduce((sum, data) => sum + data.profit, 0);
  
  // Calculate growth percentages
  const salesGrowth = totalHistoricalSales > 0 
    ? ((totalForecastedSales - totalHistoricalSales) / totalHistoricalSales) * 100 
    : 0;
    
  const revenueGrowth = totalHistoricalRevenue > 0 
    ? ((totalForecastedRevenue - totalHistoricalRevenue) / totalHistoricalRevenue) * 100 
    : 0;
    
  const profitGrowth = totalHistoricalProfit > 0 
    ? ((totalForecastedProfit - totalHistoricalProfit) / totalHistoricalProfit) * 100 
    : 0;
  
  // Calculate average monthly sales (historical and forecasted)
  const avgMonthlySales = historicalData.length > 0 
    ? totalHistoricalSales / historicalData.length 
    : 0;
    
  const avgMonthlyForecastedSales = forecastedData.length > 0 
    ? totalForecastedSales / forecastedData.length 
    : 0;
  
  // Calculate suggested inventory levels based on forecasted sales
  // (using a simple rule: keep 1.5x the average monthly forecasted sales in stock)
  const suggestedInventoryLevel = avgMonthlyForecastedSales * 1.5;
  
  return {
    historicalMetrics: {
      totalSales: totalHistoricalSales,
      totalRevenue: totalHistoricalRevenue,
      totalProfit: totalHistoricalProfit,
      avgMonthlySales
    },
    forecastedMetrics: {
      totalSales: totalForecastedSales,
      totalRevenue: totalForecastedRevenue,
      totalProfit: totalForecastedProfit,
      avgMonthlySales: avgMonthlyForecastedSales
    },
    growthMetrics: {
      salesGrowth,
      revenueGrowth,
      profitGrowth
    },
    inventoryMetrics: {
      suggestedInventoryLevel
    }
  };
}

/**
 * Apply ARIMA model to time series data
 * This is a simplified version of ARIMA that uses a weighted average
 * of past values with a trend component
 * 
 * @param data Historical time series values
 * @param p Autoregressive order
 * @param d Integrated order (differencing)
 * @param q Moving average order
 * @param periods Number of periods to forecast
 * @returns Forecasted values
 */
export function arima(
  data: number[], 
  p: number = 1, 
  d: number = 0, 
  q: number = 0, 
  periods: number = 3
): number[] {
  // Ensure we have enough data
  if (data.length < Math.max(p, q) + d + 1) {
    return Array(periods).fill(0);
  }
  
  // Apply differencing if d > 0
  let diffData = [...data];
  for (let i = 0; i < d; i++) {
    diffData = differenceData(diffData);
  }
  
  // Weights for AR and MA components
  // In a full ARIMA implementation, these would be calculated 
  // based on statistical optimization
  const arWeights = Array(p).fill(1/p);
  const maWeights = Array(q).fill(1/q);
  
  // Errors for MA component
  const errors: number[] = [];
  
  // Generate predictions
  const forecast: number[] = [];
  
  for (let i = 0; i < periods; i++) {
    // Current working data
    const currentData = [...diffData, ...forecast];
    
    // AR component
    let arComponent = 0;
    for (let j = 0; j < p; j++) {
      const index = currentData.length - 1 - j;
      if (index >= 0) {
        arComponent += arWeights[j] * currentData[index];
      }
    }
    
    // MA component
    let maComponent = 0;
    for (let j = 0; j < q; j++) {
      const index = errors.length - 1 - j;
      if (index >= 0) {
        maComponent += maWeights[j] * errors[index];
      }
    }
    
    // Combined prediction
    const prediction = arComponent + maComponent;
    forecast.push(prediction);
    
    // Calculate error for this prediction (using last actual value as reference)
    const actual = diffData[diffData.length - 1] || 0;
    errors.push(prediction - actual);
  }
  
  // Undo differencing
  let result = [...forecast];
  for (let i = 0; i < d; i++) {
    result = undoDifferencing(result, diffData);
  }
  
  // Ensure non-negative values
  return result.map(val => Math.max(0, val));
}

/**
 * Apply differencing to data
 * @param data Input data array
 * @returns Differenced data
 */
function differenceData(data: number[]): number[] {
  const result = [];
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] - data[i-1]);
  }
  return result;
}

/**
 * Undo differencing on data
 * @param diffData Differenced data
 * @param originalData Original data (needed for the base value)
 * @returns Undifferenced data
 */
function undoDifferencing(diffData: number[], originalData: number[]): number[] {
  const result = [];
  let lastValue = originalData[originalData.length - 1] || 0;
  
  for (let i = 0; i < diffData.length; i++) {
    const value = lastValue + diffData[i];
    result.push(value);
    lastValue = value;
  }
  
  return result;
}