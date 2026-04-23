/**
 * metricsWorker.js - Web Worker for background metrics processing
 * Offloads heavy calculations from the main thread for better performance
 */

// Worker message handler
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'CALCULATE_METRICS':
      const result = calculateMetrics(data);
      self.postMessage({ type: 'METRICS_RESULT', result });
      break;

    case 'ANALYZE_PROGRESS':
      const analysis = analyzeProgress(data);
      self.postMessage({ type: 'PROGRESS_ANALYSIS', analysis });
      break;

    case 'PREDICT_TIMELINE':
      const prediction = predictTimeline(data);
      self.postMessage({ type: 'TIMELINE_PREDICTION', prediction });
      break;

    default:
      console.warn('Unknown worker message type:', type);
  }
});

/**
 * Calculate body metrics from raw measurements
 */
function calculateMetrics(measurements) {
  // Simulate heavy calculation
  const bmi = (measurements.weight / Math.pow(measurements.height / 100, 2)).toFixed(2);
  const bodyFatPercentage = estimateBodyFat(measurements);
  const muscleMass = (measurements.weight * (1 - bodyFatPercentage / 100)).toFixed(2);

  return {
    bmi,
    bodyFatPercentage,
    muscleMass,
    calculatedAt: Date.now(),
  };
}

/**
 * Analyze progress over time
 */
function analyzeProgress(historicalData) {
  if (!historicalData || historicalData.length < 2) {
    return { trend: 'insufficient_data' };
  }

  const recentData = historicalData.slice(-10);
  const trend = calculateTrend(recentData);
  const velocity = calculateVelocity(recentData);

  return {
    trend,
    velocity,
    consistency: calculateConsistency(recentData),
  };
}

/**
 * Predict future timeline based on current progress
 */
function predictTimeline(data) {
  const { current, target, historicalData } = data;
  const velocity = calculateVelocity(historicalData);
  const daysToGoal = Math.abs((target - current) / velocity);

  return {
    estimatedDays: Math.round(daysToGoal),
    estimatedDate: new Date(Date.now() + daysToGoal * 24 * 60 * 60 * 1000).toISOString(),
    confidence: calculateConfidence(historicalData),
  };
}

/**
 * Helper: Estimate body fat percentage (simplified formula)
 */
function estimateBodyFat(measurements) {
  // Simplified estimation - real implementation would use more accurate formulas
  const { weight, waist, neck, height, gender } = measurements;
  if (gender === 'male') {
    return (495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450).toFixed(2);
  } else {
    return (495 / (1.29579 - 0.35004 * Math.log10(waist + measurements.hip - neck) + 0.22100 * Math.log10(height)) - 450).toFixed(2);
  }
}

/**
 * Helper: Calculate trend from data points
 */
function calculateTrend(dataPoints) {
  if (dataPoints.length < 2) return 'neutral';
  const first = dataPoints[0].value;
  const last = dataPoints[dataPoints.length - 1].value;
  const change = last - first;
  if (change > 0) return 'increasing';
  if (change < 0) return 'decreasing';
  return 'stable';
}

/**
 * Helper: Calculate velocity (rate of change)
 */
function calculateVelocity(dataPoints) {
  if (dataPoints.length < 2) return 0;
  const first = dataPoints[0];
  const last = dataPoints[dataPoints.length - 1];
  const timeSpan = (last.timestamp - first.timestamp) / (1000 * 60 * 60 * 24); // days
  return (last.value - first.value) / timeSpan;
}

/**
 * Helper: Calculate consistency score
 */
function calculateConsistency(dataPoints) {
  if (dataPoints.length < 3) return 0;
  const values = dataPoints.map(d => d.value);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return Math.max(0, 100 - (stdDev / avg * 100)).toFixed(2);
}

/**
 * Helper: Calculate prediction confidence
 */
function calculateConfidence(dataPoints) {
  const consistency = calculateConsistency(dataPoints);
  const dataQuality = Math.min(100, (dataPoints.length / 30) * 100);
  return ((parseFloat(consistency) + dataQuality) / 2).toFixed(2);
}

console.log('Metrics Worker initialized and ready');
