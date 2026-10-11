import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, AlertTriangle, Clock } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function ChartsSection({ timeSeriesData }) {
  const times = (timeSeriesData || []).map((d) => d.time);
  const requests = (timeSeriesData || []).map((d) => d.requests);
  const errorRates = (timeSeriesData || []).map((d) => d.errorRate);
  const latencies = (timeSeriesData || []).map((d) => d.avgLatency);

  const makeOptions = (suggestedMax = null, max = null, unit = '') => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 250, // Fast smooth transition on 2.5s streaming ticks
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#141b26',
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
        borderColor: '#263346',
        borderWidth: 1,
        callbacks: {
          label: (context) => ` ${context.dataset.label}: ${context.parsed.y}${unit}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(38, 51, 70, 0.4)' },
        ticks: { color: '#64748b', font: { size: 10, family: 'JetBrains Mono' }, maxTicksLimit: 8 },
      },
      y: {
        grid: { color: 'rgba(38, 51, 70, 0.4)' },
        ticks: { color: '#64748b', font: { size: 10, family: 'JetBrains Mono' } },
        beginAtZero: true,
        ...(suggestedMax ? { suggestedMax } : {}),
        ...(max ? { max } : {}),
      },
    },
  });

  const requestsData = {
    labels: times,
    datasets: [
      {
        label: 'Requests (5s)',
        data: requests,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.15)',
        fill: true,
        tension: 0.2,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  };

  const errorData = {
    labels: times,
    datasets: [
      {
        label: 'Error Rate',
        data: errorRates,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        fill: true,
        tension: 0.2,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  };

  const latencyData = {
    labels: times,
    datasets: [
      {
        label: 'Avg Latency',
        data: latencies,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        fill: true,
        tension: 0.2,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: '16px',
    }}>
      {/* Requests Chart */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <TrendingUp size={16} color="var(--accent-cyan)" />
            Throughput (Req / 5s)
          </div>
        </div>
        <div style={{ height: '180px' }}>
          <Line data={requestsData} options={makeOptions(10, null, ' reqs')} />
        </div>
      </div>

      {/* Error Rate Chart */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <AlertTriangle size={16} color="var(--accent-crimson)" />
            HTTP Error Rate (%)
          </div>
        </div>
        <div style={{ height: '180px' }}>
          <Line data={errorData} options={makeOptions(null, 100, '%')} />
        </div>
      </div>

      {/* Latency Chart */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Clock size={16} color="var(--accent-amber)" />
            Response Latency (ms)
          </div>
        </div>
        <div style={{ height: '180px' }}>
          <Line data={latencyData} options={makeOptions(500, null, ' ms')} />
        </div>
      </div>
    </div>
  );
}
