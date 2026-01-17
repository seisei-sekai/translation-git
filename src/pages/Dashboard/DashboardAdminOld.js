import React, { useState, useEffect } from 'react';
import './DashboardAdmin.css';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { VectorMap } from '@react-jvectormap/core';
import { worldMill } from '@react-jvectormap/world';
import { format } from 'date-fns';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

// Filter Options
const FILTER_OPTIONS = {
  operatingSystems: ['All', 'iOS', 'Android', 'Windows', 'macOS', 'Linux', 'Other'],
  languages: ['All', 'English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean'],
  countries: ['All', 'US', 'UK', 'CN', 'FR', 'DE', 'JP', 'IN'],
};

// Granularity Options
const GRANULARITY_OPTIONS = ['15 Minutes', 'Hourly', 'Daily', 'Monthly'];

// Reusable TimeSeriesChart Component
const TimeSeriesChart = ({ data, title, yAxisLabel, granularity }) => {
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#8e9eab',
        },
      },
      title: {
        display: true,
        text: title,
        color: '#ffffff',
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit:
            granularity === '15 Minutes'
              ? 'minute'
              : granularity === 'Hourly'
              ? 'hour'
              : granularity === 'Daily'
              ? 'day'
              : 'month',
          tooltipFormat:
            granularity === '15 Minutes'
              ? 'PPpp'
              : granularity === 'Hourly'
              ? 'PPpp'
              : granularity === 'Daily'
              ? 'PP'
              : 'MMMM yyyy',
        },
        grid: {
          color: '#404040',
        },
        ticks: {
          color: '#8e9eab',
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#404040',
        },
        ticks: {
          color: '#8e9eab',
        },
        title: {
          display: true,
          text: yAxisLabel,
          color: '#8e9eab',
        },
      },
    },
  };

  return <Line data={data} options={options} />;
};

// Reusable BarChart Component
const BarChart = ({ data, title }) => {
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#8e9eab',
        },
      },
      title: {
        display: true,
        text: title,
        color: '#ffffff',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#404040' },
        ticks: { color: '#8e9eab' },
      },
      x: {
        grid: { color: '#404040' },
        ticks: { color: '#8e9eab' },
      },
    },
  };

  return <Bar data={data} options={options} />;
};

// Reusable Select Component for Filters and Granularity
const SelectBox = ({ label, options, value, onChange }) => (
  <div className="filter-group">
    <label>{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

// Financial Metrics Component
const FinancialMetrics = ({ stats }) => {
  const [filters, setFilters] = useState({
    operatingSystem: 'All',
    country: 'All',
    language: 'All',
    granularity: '15 Minutes',
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Placeholder for data aggregation based on granularity
  // Replace with actual data fetching and aggregation logic
  const aggregatedData = {
    labels: Array.from({ length: 30 }, (_, i) => format(new Date(Date.now() - i * 86400000), 'MM/dd')),
    datasets: [
      {
        label: 'Monthly Recurring Revenue',
        data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 10000)),
        borderColor: '#00ff87',
        backgroundColor: '#00ff87',
      },
    ],
  };

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <h2>Financial Metrics</h2>
        <div className="section-filters">
          <SelectBox
            label="Operating System"
            options={FILTER_OPTIONS.operatingSystems}
            value={filters.operatingSystem}
            onChange={(value) => handleFilterChange('operatingSystem', value)}
          />
          <SelectBox
            label="Country"
            options={FILTER_OPTIONS.countries}
            value={filters.country}
            onChange={(value) => handleFilterChange('country', value)}
          />
          <SelectBox
            label="Language"
            options={FILTER_OPTIONS.languages}
            value={filters.language}
            onChange={(value) => handleFilterChange('language', value)}
          />
          <SelectBox
            label="Granularity"
            options={GRANULARITY_OPTIONS}
            value={filters.granularity}
            onChange={(value) => handleFilterChange('granularity', value)}
          />
        </div>
      </div>
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Average Order Size</h3>
          <p>${(stats.finance.averageOrderSize || 0).toFixed(2)}</p>
        </div>
        <div className="metric-card">
          <h3>Monthly Recurring Revenue</h3>
          <p>${(stats.finance.mrr || 0).toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <h3>Annual Run Rate</h3>
          <p>${(stats.finance.arr || 0).toLocaleString()}</p>
        </div>
      </div>
      {/* Time Series Plot */}
      <div className="chart-container">
        <TimeSeriesChart
          data={{
            labels: aggregatedData.labels,
            datasets: aggregatedData.datasets,
          }}
          title="Monthly Recurring Revenue Over Time"
          yAxisLabel="Revenue ($)"
          granularity={filters.granularity}
        />
      </div>
    </section>
  );
};

// User Analytics Component
const UserAnalytics = ({ stats }) => {
  const [filters, setFilters] = useState({
    operatingSystem: 'All',
    country: 'All',
    language: 'All',
    granularity: '15 Minutes',
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Placeholder for data aggregation based on granularity
  const aggregatedData = {
    labels: Array.from({ length: 30 }, (_, i) => format(new Date(Date.now() - i * 86400000), 'MM/dd')),
    datasets: [
      {
        label: 'Daily Active Users',
        data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 1000)),
        borderColor: '#00bfff',
        backgroundColor: '#00bfff',
      },
      {
        label: 'Monthly Active Users',
        data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 2000)),
        borderColor: '#ff6384',
        backgroundColor: '#ff6384',
      },
    ],
  };

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <h2>User Analytics</h2>
        <div className="section-filters">
          <SelectBox
            label="Operating System"
            options={FILTER_OPTIONS.operatingSystems}
            value={filters.operatingSystem}
            onChange={(value) => handleFilterChange('operatingSystem', value)}
          />
          <SelectBox
            label="Country"
            options={FILTER_OPTIONS.countries}
            value={filters.country}
            onChange={(value) => handleFilterChange('country', value)}
          />
          <SelectBox
            label="Language"
            options={FILTER_OPTIONS.languages}
            value={filters.language}
            onChange={(value) => handleFilterChange('language', value)}
          />
          <SelectBox
            label="Granularity"
            options={GRANULARITY_OPTIONS}
            value={filters.granularity}
            onChange={(value) => handleFilterChange('granularity', value)}
          />
        </div>
      </div>
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total User Number</h3>
          <p>{(stats.users.total || 0).toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <h3>Total Basic Plan Users</h3>
          <p>{(stats.users.basic || 0).toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <h3>Total Monthly Subscribed Users</h3>
          <p>{(stats.users.monthly || 0).toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <h3>Total Annually Subscribed Users</h3>
          <p>{(stats.users.annual || 0).toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <h3>Single Month Subscribes</h3>
          <p>{(stats.users.singleMonth || 0).toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <h3>Single Year Subscribes</h3>
          <p>{(stats.users.singleYear || 0).toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <h3>Total Token Packs Purchased</h3>
          <p>{(stats.users.tokenPacksPurchased || 0).toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <h3>Total Tokens Purchased</h3>
          <p>{(stats.users.tokensPurchased || 0).toLocaleString()}</p>
        </div>
      </div>
      {/* Time Series Plot */}
      <div className="chart-container">
        <TimeSeriesChart
          data={{
            labels: aggregatedData.labels,
            datasets: aggregatedData.datasets,
          }}
          title="Daily Active Users & Monthly Active Users Over Time"
          yAxisLabel="Number of Users"
          granularity={filters.granularity}
        />
      </div>
    </section>
  );
};

// Chatroom Statistics Component
const ChatroomStatistics = ({ stats }) => {
  const [filters, setFilters] = useState({
    operatingSystem: 'All',
    country: 'All',
    language: 'All',
    granularity: '15 Minutes',
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <h2>Chatroom Statistics</h2>
        <div className="section-filters">
          <SelectBox
            label="Operating System"
            options={FILTER_OPTIONS.operatingSystems}
            value={filters.operatingSystem}
            onChange={(value) => handleFilterChange('operatingSystem', value)}
          />
          <SelectBox
            label="Country"
            options={FILTER_OPTIONS.countries}
            value={filters.country}
            onChange={(value) => handleFilterChange('country', value)}
          />
          <SelectBox
            label="Language"
            options={FILTER_OPTIONS.languages}
            value={filters.language}
            onChange={(value) => handleFilterChange('language', value)}
          />
          <SelectBox
            label="Granularity"
            options={GRANULARITY_OPTIONS}
            value={filters.granularity}
            onChange={(value) => handleFilterChange('granularity', value)}
          />
        </div>
      </div>
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Chatroom Count</h3>
          <p>{(stats.chatrooms.total || 0).toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <h3>Private Chatrooms</h3>
          <p>{(stats.chatrooms.private || 0).toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <h3>2-People Chatrooms</h3>
          <p>{(stats.chatrooms.twoPeople || 0).toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <h3>2+ People Chatrooms</h3>
          <p>{(stats.chatrooms.twoPlusPeople || 0).toLocaleString()}</p>
        </div>
      </div>
      {/* Participant Distribution */}
      <div className="chart-container">
        <BarChart
          data={{
            labels: ['2', '3', '4', '5', '6+'],
            datasets: [
              {
                label: 'Participants per Chatroom',
                data: stats.chatrooms.participantDistribution || [0, 0, 0, 0, 0],
                backgroundColor: '#ff6384',
              },
            ],
          }}
          title="Distribution of Participants in Chatrooms"
        />
      </div>
      {/* Message Distribution */}
      <div className="chart-container">
        <BarChart
          data={{
            labels: ['0-50', '51-100', '101-200', '201-500', '500+'],
            datasets: [
              {
                label: 'Messages per Chatroom',
                data: stats.chatrooms.messageDistribution || [0, 0, 0, 0, 0],
                backgroundColor: '#36a2eb',
              },
            ],
          }}
          title="Distribution of Messages in Chatrooms"
        />
      </div>
      {/* Message/Participant Distribution */}
      <div className="chart-container">
        <BarChart
          data={{
            labels: ['<1', '1-2', '2-3', '3-4', '4+'],
            datasets: [
              {
                label: 'Messages per Participant',
                data: stats.chatrooms.messagePerParticipant || [0, 0, 0, 0, 0],
                backgroundColor: '#cc65fe',
              },
            ],
          }}
          title="Distribution of Messages per Participant"
        />
      </div>
    </section>
  );
};

// Message Analytics Component
const MessageAnalytics = ({ stats }) => {
  const [filters, setFilters] = useState({
    operatingSystem: 'All',
    country: 'All',
    language: 'All',
    granularity: '15 Minutes',
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Placeholder for data aggregation based on granularity
  const aggregatedData = {
    labels: Array.from({ length: 30 }, (_, i) => format(new Date(Date.now() - i * 86400000), 'MM/dd')),
    datasets: [
      {
        label: 'Subscription Revenue',
        data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 10000)),
        borderColor: '#ffce56',
        backgroundColor: '#ffce56',
      },
    ],
  };

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <h2>Message Analytics</h2>
        <div className="section-filters">
          <SelectBox
            label="Operating System"
            options={FILTER_OPTIONS.operatingSystems}
            value={filters.operatingSystem}
            onChange={(value) => handleFilterChange('operatingSystem', value)}
          />
          <SelectBox
            label="Country"
            options={FILTER_OPTIONS.countries}
            value={filters.country}
            onChange={(value) => handleFilterChange('country', value)}
          />
          <SelectBox
            label="Language"
            options={FILTER_OPTIONS.languages}
            value={filters.language}
            onChange={(value) => handleFilterChange('language', value)}
          />
          <SelectBox
            label="Granularity"
            options={GRANULARITY_OPTIONS}
            value={filters.granularity}
            onChange={(value) => handleFilterChange('granularity', value)}
          />
        </div>
      </div>
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Message Count</h3>
          <p>{(stats.messages.total || 0).toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <h3>Average Message Length</h3>
          <p>{(stats.messages.lengthStats.avg || 0).toFixed(0)} chars</p>
        </div>
        <div className="metric-card">
          <h3>Median Message Length</h3>
          <p>{(stats.messages.lengthStats.median || 0).toFixed(0)} chars</p>
        </div>
        <div className="metric-card">
          <h3>Max Message Length</h3>
          <p>{(stats.messages.lengthStats.max || 0).toLocaleString()} chars</p>
        </div>
        <div className="metric-card">
          <h3>Min Message Length</h3>
          <p>{(stats.messages.lengthStats.min || 0).toLocaleString()} chars</p>
        </div>
        <div className="metric-card">
          <h3>75th Percentile</h3>
          <p>{(stats.messages.lengthStats.percentile75 || 0).toLocaleString()} chars</p>
        </div>
        <div className="metric-card">
          <h3>25th Percentile</h3>
          <p>{(stats.messages.lengthStats.percentile25 || 0).toLocaleString()} chars</p>
        </div>
      </div>

      {/* Token Length Distribution */}
      <div className="chart-container">
        <BarChart
          data={{
            labels: ['0-50', '51-100', '101-200', '201-500', '500+'],
            datasets: [
              {
                label: 'Token Length Distribution',
                data: stats.messages.lengthDistribution || [0, 0, 0, 0, 0],
                backgroundColor: '#00ff87',
              },
            ],
          }}
          title="Token Length Distribution of Original Text"
        />
      </div>

      {/* Language Key Distribution */}
      <div className="chart-container">
        <BarChart
          data={{
            labels: stats.messages.topLanguages.map((l) => l.language),
            datasets: [
              {
                label: 'Language Keys in User Translations',
                data: stats.messages.topLanguages.map((l) => l.count),
                backgroundColor: '#00bfff',
              },
            ],
          }}
          title="Number of Language Keys in User Translations"
        />
      </div>

      {/* Subscription Revenue Time Series */}
      <div className="chart-container">
        <TimeSeriesChart
          data={{
            labels: aggregatedData.labels,
            datasets: aggregatedData.datasets,
          }}
          title="Subscription Revenue Over Time"
          yAxisLabel="Revenue ($)"
          granularity={filters.granularity}
        />
      </div>
    </section>
  );
};

// Platform Analytics Component
const PlatformAnalytics = ({ stats }) => {
  const [filters, setFilters] = useState({
    operatingSystem: 'All',
    country: 'All',
    language: 'All',
    granularity: '15 Minutes',
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Placeholder for data aggregation based on granularity
  const aggregatedData = {
    labels: ['iOS', 'Android', 'Windows', 'macOS', 'Linux', 'Other'],
    datasets: [
      {
        label: 'Operating System Distribution',
        data: [
          stats.platform.osDistribution.iOS || 0,
          stats.platform.osDistribution.Android || 0,
          stats.platform.osDistribution.Windows || 0,
          stats.platform.osDistribution.macOS || 0,
          stats.platform.osDistribution.Linux || 0,
          stats.platform.osDistribution.Other || 0,
        ],
        backgroundColor: '#00bfff',
      },
    ],
  };

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <h2>Platform & Device Analytics</h2>
        <div className="section-filters">
          <SelectBox
            label="Operating System"
            options={FILTER_OPTIONS.operatingSystems}
            value={filters.operatingSystem}
            onChange={(value) => handleFilterChange('operatingSystem', value)}
          />
          <SelectBox
            label="Country"
            options={FILTER_OPTIONS.countries}
            value={filters.country}
            onChange={(value) => handleFilterChange('country', value)}
          />
          <SelectBox
            label="Language"
            options={FILTER_OPTIONS.languages}
            value={filters.language}
            onChange={(value) => handleFilterChange('language', value)}
          />
          <SelectBox
            label="Granularity"
            options={GRANULARITY_OPTIONS}
            value={filters.granularity}
            onChange={(value) => handleFilterChange('granularity', value)}
          />
        </div>
      </div>
      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Mobile Users</h3>
          <p>{(stats.platform.mobile || 0).toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <h3>Desktop Users</h3>
          <p>{(stats.platform.desktop || 0).toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <h3>Tablet Users</h3>
          <p>{(stats.platform.tablet || 0).toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <h3>Other Devices</h3>
          <p>{(stats.platform.other || 0).toLocaleString()}</p>
        </div>
      </div>
      {/* Operating System Distribution */}
      <div className="chart-container">
        <BarChart
          data={{
            labels: aggregatedData.labels,
            datasets: aggregatedData.datasets,
          }}
          title="Operating System Distribution"
        />
      </div>
    </section>
  );
};

// Geographic Distribution Component
const GeographicDistribution = ({ stats }) => {
  if (!stats.geographicDistribution) return null;

  const { geographicDistribution } = stats;

  return (
    <section className="dashboard-section map-section">
      <div className="section-header">
        <h2>Geographic Distribution</h2>
      </div>
      <div className="world-map-container">
        <VectorMap
          map={worldMill}
          backgroundColor="#1a1a1a"
          containerStyle={{
            width: '100%',
            height: '600px',
          }}
          series={{
            regions: [
              {
                values: geographicDistribution,
                scale: ['#00ff87', '#00bfff'],
                normalizeFunction: 'polynomial',
                min: 0,
                max: Math.max(...Object.values(geographicDistribution)),
              },
            ],
          }}
          regionStyle={{
            initial: {
              fill: '#2d3436',
              stroke: '#636e72',
              strokeWidth: 0.5,
              fillOpacity: 1,
            },
            hover: {
              fill: '#00ff87',
              fillOpacity: 0.8,
              cursor: 'pointer',
            },
            selected: {
              fill: '#00bfff',
            },
          }}
          onRegionTipShow={(e, label, code) => {
            const users = geographicDistribution[code] || 0;
            label.html(
              `<div style="background: rgba(0,0,0,0.8); padding: 5px 10px; border-radius: 4px; color: #00ff87;">
                ${label.html()}: ${users.toLocaleString()} users
              </div>`
            );
          }}
        />
      </div>
    </section>
  );
};

// User Usage Statistics Component
const UserUsageStatistics = ({ stats }) => {
  const [filters, setFilters] = useState({
    operatingSystem: 'All',
    country: 'All',
    language: 'All',
    granularity: '15 Minutes'
  });

  if (!stats || !stats.userUsage) return null;

  const { userUsage } = stats;
  const metrics = [
    {
      title: 'Message Count',
      data: userUsage.messageCount,
      color: '#00ff87'
    },
    {
      title: 'Preview Usage',
      data: userUsage.previewCount,
      color: '#00bfff'
    },
    {
      title: 'Audio Trigger',
      data: userUsage.audioCount,
      color: '#ff6384'
    },
    {
      title: 'Audio Duration',
      data: userUsage.audioDuration,
      color: '#ffcd56'
    },
    {
      title: 'Raw Image',
      data: userUsage.rawImageCount,
      color: '#4bc0c0'
    },
    {
      title: 'AI Photo',
      data: userUsage.aiPhotoCount,
      color: '#9966ff'
    },
    {
      title: 'Spend Time',
      data: userUsage.spendTime,
      color: '#36a2eb'
    }
  ];

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <h2>User Usage Statistics</h2>
        <div className="section-filters">
          <SelectBox
            label="Operating System"
            options={FILTER_OPTIONS.operatingSystems}
            value={filters.operatingSystem}
            onChange={(value) => setFilters({ ...filters, operatingSystem: value })}
          />
          <SelectBox
            label="Country"
            options={FILTER_OPTIONS.countries}
            value={filters.country}
            onChange={(value) => setFilters({ ...filters, country: value })}
          />
          <SelectBox
            label="Language"
            options={FILTER_OPTIONS.languages}
            value={filters.language}
            onChange={(value) => setFilters({ ...filters, language: value })}
          />
          <SelectBox
            label="Granularity"
            options={GRANULARITY_OPTIONS}
            value={filters.granularity}
            onChange={(value) => setFilters({ ...filters, granularity: value })}
          />
        </div>
      </div>

      {metrics.map((metric) => (
        <div key={metric.title} className="usage-metric-section">
          <h3>{metric.title} Statistics</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>Total Count</h3>
              <p>{metric.data.total.toLocaleString()}</p>
            </div>
            <div className="metric-card">
              <h3>Average</h3>
              <p>{metric.data.avg.toFixed(2)}</p>
            </div>
            <div className="metric-card">
              <h3>Median</h3>
              <p>{metric.data.median.toFixed(2)}</p>
            </div>
            <div className="metric-card">
              <h3>Maximum</h3>
              <p>{metric.data.max.toLocaleString()}</p>
            </div>
            <div className="metric-card">
              <h3>Minimum</h3>
              <p>{metric.data.min.toLocaleString()}</p>
            </div>
            <div className="metric-card">
              <h3>75th Percentile</h3>
              <p>{metric.data.percentile75.toFixed(2)}</p>
            </div>
            <div className="metric-card">
              <h3>25th Percentile</h3>
              <p>{metric.data.percentile25.toFixed(2)}</p>
            </div>
          </div>
          <div className="chart-container">
            <Bar
              data={{
                labels: ['0-10', '11-50', '51-100', '101-500', '501-1000', '1000+'],
                datasets: [{
                  label: `${metric.title} Distribution`,
                  data: metric.data.distribution,
                  backgroundColor: metric.color,
                }]
              }}
              options={{
                responsive: true,
                plugins: {
                  title: {
                    display: true,
                    text: `${metric.title} Distribution`,
                    color: '#ffffff'
                  },
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: '#404040' },
                    ticks: { color: '#8e9eab' }
                  },
                  x: {
                    grid: { color: '#404040' },
                    ticks: { color: '#8e9eab' }
                  }
                }
              }}
            />
          </div>
        </div>
      ))}
    </section>
  );
};

// Detailed Message Statistics Component
const DetailedMessageStatistics = ({ stats }) => {
  const [filters, setFilters] = useState({
    operatingSystem: 'All',
    country: 'All',
    language: 'All',
    granularity: '15 Minutes'
  });

  if (!stats || !stats.messageStats) return null;

  const { messageStats } = stats;

  return (
    <section className="dashboard-section">
      <div className="section-header">
        <h2>Detailed Message Statistics</h2>
        <div className="section-filters">
          <SelectBox
            label="Operating System"
            options={FILTER_OPTIONS.operatingSystems}
            value={filters.operatingSystem}
            onChange={(value) => setFilters({ ...filters, operatingSystem: value })}
          />
          <SelectBox
            label="Country"
            options={FILTER_OPTIONS.countries}
            value={filters.country}
            onChange={(value) => setFilters({ ...filters, country: value })}
          />
          <SelectBox
            label="Language"
            options={FILTER_OPTIONS.languages}
            value={filters.language}
            onChange={(value) => setFilters({ ...filters, language: value })}
          />
          <SelectBox
            label="Granularity"
            options={GRANULARITY_OPTIONS}
            value={filters.granularity}
            onChange={(value) => setFilters({ ...filters, granularity: value })}
          />
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Message Count</h3>
          <p>{messageStats.total.toLocaleString()}</p>
        </div>
      </div>

      {/* Token Length Distribution */}
      <div className="usage-metric-section">
        <h3>Token Length Statistics</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <h3>Average Length</h3>
            <p>{messageStats.tokenLength.avg.toFixed(2)}</p>
          </div>
          <div className="metric-card">
            <h3>Median Length</h3>
            <p>{messageStats.tokenLength.median.toFixed(2)}</p>
          </div>
          <div className="metric-card">
            <h3>Maximum Length</h3>
            <p>{messageStats.tokenLength.max.toLocaleString()}</p>
          </div>
          <div className="metric-card">
            <h3>Minimum Length</h3>
            <p>{messageStats.tokenLength.min.toLocaleString()}</p>
          </div>
          <div className="metric-card">
            <h3>75th Percentile</h3>
            <p>{messageStats.tokenLength.percentile75.toFixed(2)}</p>
          </div>
          <div className="metric-card">
            <h3>25th Percentile</h3>
            <p>{messageStats.tokenLength.percentile25.toFixed(2)}</p>
          </div>
        </div>
        <div className="chart-container">
          <Bar
            data={{
              labels: ['0-50', '51-100', '101-200', '201-500', '501-1000', '1000+'],
              datasets: [{
                label: 'Token Length Distribution',
                data: messageStats.tokenLength.distribution,
                backgroundColor: '#00ff87'
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: 'Token Length Distribution',
                  color: '#ffffff'
                },
                legend: {
                  display: false
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: '#404040' },
                  ticks: { color: '#8e9eab' }
                },
                x: {
                  grid: { color: '#404040' },
                  ticks: { color: '#8e9eab' }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Language Key Distribution */}
      <div className="usage-metric-section">
        <h3>Translation Language Statistics</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <h3>Average Languages</h3>
            <p>{messageStats.languageKeys.avg.toFixed(2)}</p>
          </div>
          <div className="metric-card">
            <h3>Median Languages</h3>
            <p>{messageStats.languageKeys.median.toFixed(2)}</p>
          </div>
          <div className="metric-card">
            <h3>Maximum Languages</h3>
            <p>{messageStats.languageKeys.max.toLocaleString()}</p>
          </div>
          <div className="metric-card">
            <h3>Minimum Languages</h3>
            <p>{messageStats.languageKeys.min.toLocaleString()}</p>
          </div>
          <div className="metric-card">
            <h3>75th Percentile</h3>
            <p>{messageStats.languageKeys.percentile75.toFixed(2)}</p>
          </div>
          <div className="metric-card">
            <h3>25th Percentile</h3>
            <p>{messageStats.languageKeys.percentile25.toFixed(2)}</p>
          </div>
        </div>
        <div className="chart-container">
          <Bar
            data={{
              labels: messageStats.languageKeys.languages.map(l => l.language),
              datasets: [{
                label: 'Language Usage Distribution',
                data: messageStats.languageKeys.languages.map(l => l.count),
                backgroundColor: '#00bfff'
              }]
            }}
            options={{
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: 'Language Usage Distribution',
                  color: '#ffffff'
                },
                legend: {
                  display: false
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: { color: '#404040' },
                  ticks: { color: '#8e9eab' }
                },
                x: {
                  grid: { color: '#404040' },
                  ticks: { 
                    color: '#8e9eab',
                    maxRotation: 45,
                    minRotation: 45
                  }
                }
              }
            }}
          />
        </div>
      </div>
    </section>
  );
};

// Main DashboardAdmin Component
function DashboardAdmin() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulating API call with dummy data
        // Replace this with actual data fetching logic
        const dummyData = {
          users: {
            total: 1500,
            basic: 300,
            monthly: 150,
            annual: 50,
            singleMonth: 100,
            singleYear: 30,
            tokenPacksPurchased: 200,
            tokensPurchased: 500,
            dau: 250,
            mau: 800,
            timeSeriesData: {
              subscriptions: Array.from({ length: 96 }, (_, i) => ({
                date: new Date(Date.now() - (95 - i) * 15 * 60 * 1000), // Every 15 minutes
                newUsers: Math.floor(Math.random() * 10),
                subscriptionRevenue: Math.floor(Math.random() * 500),
              })),
              subscriptionRevenue: Array.from({ length: 96 }, (_, i) => ({
                date: new Date(Date.now() - (95 - i) * 15 * 60 * 1000),
                amount: Math.floor(Math.random() * 5000),
              })),
              growthRates: {
                monthly: 0.05,
                daily: 0.01,
              },
            },
          },
          finance: {
            averageOrderSize: 89.99,
            mrr: 15000,
            arr: 180000,
            revenueGrowth: 0.23,
          },
          messages: {
            total: 25000,
            lengthStats: {
              avg: 150,
              median: 125,
              max: 1000,
              min: 10,
              percentile75: 200,
              percentile25: 100,
            },
            topLanguages: [
              { language: 'English', count: 12000 },
              { language: 'Spanish', count: 5000 },
              { language: 'French', count: 3000 },
              { language: 'German', count: 2000 },
              { language: 'Chinese', count: 3000 },
            ],
            lengthDistribution: [5000, 8000, 7000, 4000, 1000],
            translationLanguageKeys: [12000, 5000, 3000, 2000, 3000],
          },
          chatrooms: {
            total: 500,
            private: 300,
            twoPeople: 150,
            twoPlusPeople: 50,
            participantDistribution: [2, 3, 4, 5, 6],
            messageDistribution: [50, 100, 150, 200, 250],
            messagePerParticipant: [25, 50, 75, 100, 125],
          },
          platform: {
            mobile: 800,
            desktop: 500,
            tablet: 150,
            other: 50,
            osDistribution: {
              iOS: 400,
              Android: 400,
              Windows: 300,
              macOS: 200,
              Linux: 100,
              Other: 100,
            },
          },
          geographicDistribution: {
            US: 500,
            UK: 200,
            CN: 300,
            FR: 150,
            DE: 250,
            JP: 180,
            IN: 400,
          },
          userUsage: {
            messageCount: {
              total: 25000,
              avg: 150,
              median: 125,
              max: 1000,
              min: 10,
              percentile75: 200,
              percentile25: 100,
              distribution: [5000, 8000, 7000, 4000, 1000, 500]
            },
            previewCount: {
              total: 15000,
              avg: 90,
              median: 75,
              max: 500,
              min: 5,
              percentile75: 150,
              percentile25: 50,
              distribution: [3000, 5000, 4000, 2000, 800, 200]
            },
            audioCount: {
              total: 10000,
              avg: 60,
              median: 50,
              max: 300,
              min: 3,
              percentile75: 100,
              percentile25: 30,
              distribution: [2000, 3000, 3000, 1500, 400, 100]
            },
            audioDuration: {
              total: 50000,
              avg: 300,
              median: 250,
              max: 1500,
              min: 15,
              percentile75: 500,
              percentile25: 150,
              distribution: [10000, 15000, 14000, 8000, 2000, 1000]
            },
            rawImageCount: {
              total: 8000,
              avg: 48,
              median: 40,
              max: 240,
              min: 2,
              percentile75: 80,
              percentile25: 24,
              distribution: [1600, 2400, 2400, 1200, 320, 80]
            },
            aiPhotoCount: {
              total: 6000,
              avg: 36,
              median: 30,
              max: 180,
              min: 1,
              percentile75: 60,
              percentile25: 18,
              distribution: [1200, 1800, 1800, 900, 240, 60]
            },
            spendTime: {
              total: 100000,
              avg: 600,
              median: 500,
              max: 3000,
              min: 30,
              percentile75: 1000,
              percentile25: 300,
              distribution: [20000, 30000, 28000, 16000, 4000, 2000]
            }
          },
          messageStats: {
            total: 25000,
            tokenLength: {
              avg: 150,
              median: 125,
              max: 1000,
              min: 10,
              percentile75: 200,
              percentile25: 100,
              distribution: [5000, 8000, 7000, 4000, 1000, 500]
            },
            languageKeys: {
              avg: 3,
              median: 2,
              max: 10,
              min: 1,
              percentile75: 4,
              percentile25: 1,
              distribution: [12000, 8000, 3000, 1500, 400, 100],
              languages: [
                { language: 'English', count: 12000 },
                { language: 'Spanish', count: 5000 },
                { language: 'French', count: 3000 },
                { language: 'German', count: 2000 },
                { language: 'Chinese', count: 3000 },
                { language: 'Japanese', count: 2000 },
                { language: 'Korean', count: 1000 }
              ]
            }
          }
        };

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setStats(dummyData);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Render All Sections Together
  if (loading) return <div className="dashboard-admin loading">Loading...</div>;
  if (error) return <div className="dashboard-admin">Error: {error}</div>;
  if (!stats) return <div className="dashboard-admin">No data available</div>;

  return (
    <div className="dashboard-admin">
      <h1>Admin Analytics Dashboard</h1>
      <div className="dashboard-layout">
        {/* Left Column */}
        <div className="dashboard-primary">
          <FinancialMetrics stats={stats} />
          <UserAnalytics stats={stats} />
          <UserUsageStatistics stats={stats} />
          <DetailedMessageStatistics stats={stats} />
          <ChatroomStatistics stats={stats} />
          <MessageAnalytics stats={stats} />
        </div>

        {/* Right Column */}
        <div className="dashboard-secondary">
          <GeographicDistribution stats={stats} />
          <PlatformAnalytics stats={stats} />
        </div>
      </div>
    </div>
  );
}

export default DashboardAdmin;
