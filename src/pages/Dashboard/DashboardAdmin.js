import React, { useState, useEffect, useRef } from 'react';
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
import { setGlobalState, getGlobalState } from '../../globalState';
import { useTranslation } from 'react-i18next';

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
  const chartRef = useRef(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (chartRef.current && chartRef.current.destroy) {
        chartRef.current.destroy();
      }
    };
  }, []);

  const options = {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      point: {
        radius: 0 // Only show points on hover
      }
    },
    plugins: {
      decimation: {
        enabled: true,
        algorithm: 'min-max',
        samples: 100 // Adjust this number based on your needs
      }
    },
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

  return <Line ref={chartRef} data={data} options={options} />;
};

// Reusable BarChart Component
const BarChart = ({ data, title }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    return () => {
      if (chartRef.current && chartRef.current.destroy) {
        chartRef.current.destroy();
      }
    };
  }, []);

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
  <div className="filter-group-dashboard">
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

// Add this new component for expandable sections
const ExpandableSection = ({ title, children, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="chart-section-dashboard">
      <div 
        className="chart-header-dashboard"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3>{title}</h3>
        <span>{isExpanded ? '−' : '+'}</span>
      </div>
      <div className={`chart-content-dashboard ${!isExpanded ? 'collapsed' : ''}`}>
        {children}
      </div>
    </div>
  );
};

// Geographic Distribution Component
const GeographicDistribution = ({ stats }) => {
  const [tooltipContent, setTooltipContent] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(null);
  const mapRef = useRef(null);

  const getCountryData = () => {
    if (!stats || !stats.user_ip_location_country) return {};
    return stats.user_ip_location_country; // Return direct mapping of country codes to counts
  };

  const getTotalUsers = (countryData) => {
    return Object.values(countryData).reduce((sum, count) => sum + count, 0);
  };

  const handleCountryClick = (geo) => {
    setSelectedCountry(geo.properties.ISO_A2);
  };

  const handleMouseEnter = (geo) => {
    const countryData = getCountryData();
    const countryCode = geo.properties.ISO_A2;
    const count = countryData[countryCode] || 0;
    const totalUsers = getTotalUsers(countryData);
    const percentage = totalUsers > 0 ? ((count / totalUsers) * 100).toFixed(1) : '0';
    
    setTooltipContent(
      `${geo.properties.NAME}: ${count} user${count !== 1 ? 's' : ''} (${percentage}%)`
    );
  };

  const mapData = getCountryData();
  const totalUsers = getTotalUsers(mapData);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <ExpandableSection title="Geographic Distribution">
      <div className="geographic-content-dashboard">
        <div className="world-map-container-dashboard">
          <VectorMap
            map={worldMill}
            backgroundColor="#1a1a1a"
            containerStyle={{
              width: '100%',
              height: '100%',
            }}
            series={{
              regions: [{
                values: mapData,
                scale: ['#00ff87', '#00bfff'],
                normalizeFunction: 'polynomial',
                min: 0,
                max: Math.max(...Object.values(mapData), 1),
              }],
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
              const count = mapData[code] || 0;
              const percentage = totalUsers > 0 ? ((count / totalUsers) * 100).toFixed(1) : '0';
              label.html(
                `<div style="background: rgba(0,0,0,0.8); padding: 5px 10px; border-radius: 4px; color: #00ff87;">
                  ${label.html()}: ${count} user${count !== 1 ? 's' : ''} (${percentage}%)
                </div>`
              );
            }}
            responsive={true}
          />
        </div>
        
        <div className="country-distribution-dashboard">
          <h3>Country Distribution (Top 20)</h3>
          <div className="country-table-container-dashboard">
            <table className="country-table-dashboard">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Users</th>
                  <th>Percentage</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(mapData)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 20)  // Limit to top 20 countries
                  .map(([countryCode, count]) => {
                    const percentage = ((count / totalUsers) * 100).toFixed(1);
                    return (
                      <tr key={countryCode}>
                        <td>{countryCode}</td>
                        <td>{count}</td>
                        <td>{percentage}%</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ExpandableSection>
  );
};

// Helper functions for time range display (defined at module level for reusability)
const getTimeUnit = (hours) => {
  if (hours === 0) return 'day';  // All time - use days
  if (hours <= 6) return 'minute';
  if (hours <= 48) return 'hour';
  if (hours <= 720) return 'day';  // Up to 30 days
  return 'day';  // For longer ranges
};

const getTimeRangeText = (timeRange) => {
  if (timeRange === 0) return 'All Time (Life-span)';
  if (timeRange === 1) return 'Last 1 Hour';
  if (timeRange === 6) return 'Last 6 Hours';
  if (timeRange === 24) return 'Last 24 Hours';
  if (timeRange === 72) return 'Last 3 Days';
  if (timeRange === 168) return 'Last 7 Days';
  if (timeRange === 720) return 'Last 30 Days';
  if (timeRange === 2160) return 'Last 90 Days';
  return `Last ${timeRange} Hours`;
};

// MetricsTable Component
const MetricsTable = ({ 
  metrics, 
  setMetrics, 
  loading, 
  error, 
  showOnlyTimeSeries, 
  showOnlyDistribution,
  showOnlyMetrics,
  timeRange = 24,  // Default to 24 hours
  metadata = null   // Default to null
}) => {
  const [selectedTimeseriesCard, setSelectedTimeseriesCard] = useState(null);
  const [selectedMetrics, setSelectedMetrics] = useState('all');

  // Helper function to check if a value is a timestamp
  const isTimestamp = (str) => {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str);
  };

  // Define priority metrics with their display names
  const priorityMetrics = [
    { key: 'total_user_number', display: 'User No.', description: 'Total User Number' },
    { key: 'total_chatroom_number', display: 'Chatroom No.', description: 'Total Chatroom Number' },
    { key: 'total_message_count', display: 'Message No.', description: 'Total Message Count' },
    { key: 'total_user_monthly_active', display: 'MAU', description: 'Monthly Active Users' },
    { key: 'total_user_daily_active', display: 'DAU', description: 'Daily Active Users' },
    { key: 'total_user_number_monthly', display: 'Monthly subscription Paid No.', description: 'Monthly Subscription Users' },
    { key: 'total_user_number_monthly_onetime', display: 'Monthly One-time Paid No.', description: 'Monthly One-time Subscription Users' },
    { key: 'total_user_number_annual', display: 'Yearly subscription Paid No.', description: 'Annual Subscription Users' },
    { key: 'total_user_number_annual_onetime', display: 'Yearly One-time Paid No.', description: 'Annual One-time Subscription Users' },
    { key: 'total_user_number_basic_no_refer', display: 'Basic Paid No.', description: 'Basic Plan Users (No Referral)' },
    { key: 'total_user_number_basic_refer', display: 'Basic Promotion', description: 'Basic Plan Users (With Referral)' }
  ];

  // Get the latest values for metrics with timestamps
  const getLatestMetrics = () => {
    if (!metrics) return {};
    
    const latestMetrics = {};
    Object.entries(metrics).forEach(([key, value]) => {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const timestamps = Object.keys(value).filter(isTimestamp);
        if (timestamps.length > 0) {
          // Sort timestamps in descending order and get the latest one
          const latestTimestamp = timestamps.sort().reverse()[0];
          latestMetrics[key] = value[latestTimestamp];
        }
      }
    });
    return latestMetrics;
  };

  const latestMetrics = getLatestMetrics();

  // Render priority metrics first
  const renderPriorityMetrics = () => (
    <div className="priority-metrics-dashboard">
      <h3>Key Metrics</h3>
      <div className="metrics-grid-dashboard">
        {priorityMetrics.map(({ key, display, description }) => (
          <div key={key} className="metric-card-dashboard" title={description}>
            <div className="metric-label-dashboard">
              <span className="metric-abbreviation">{display}</span>
              <span className="metric-full-name">{description}</span>
            </div>
            <div className="metric-value-dashboard">
              {latestMetrics[key]?.toLocaleString() || '0'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Get time series data for a specific metric (optimized)
  const getTimeseriesData = (metricKey) => {
    if (!metrics || !metrics[metricKey]) return [];
    
    const data = metrics[metricKey];
    if (typeof data !== 'object' || Array.isArray(data)) return [];

    // Filter and convert timestamp entries only (backend already filters by time range)
    const timeseriesEntries = Object.entries(data)
      .filter(([timestamp]) => isTimestamp(timestamp))
      .map(([timestamp, value]) => ({
        x: new Date(timestamp),
        y: value
      }))
      .sort((a, b) => a.x - b.x);
    
    // Extra safety: downsample if still too many points (backend limits to 500 by default)
    if (timeseriesEntries.length > 500) {
      const step = Math.ceil(timeseriesEntries.length / 500);
      return timeseriesEntries.filter((_, index) => index % step === 0);
    }
    
    return timeseriesEntries;
  };

  // Get all metrics that have time series data
  const getTimeseriesMetrics = () => {
    if (!metrics) return [];
    
    return Object.keys(metrics).filter(key => {
      const value = metrics[key];
      return typeof value === 'object' && 
             !Array.isArray(value) && 
             Object.keys(value).some(isTimestamp);
    });
  };

  const renderMetricValue = (value) => {
    if (typeof value === 'object') {
      return (
        <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
          {Object.entries(value).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>{key}:</span>
              <span>{typeof val === 'number' ? val.toLocaleString() : val}</span>
            </div>
          ))}
        </div>
      );
    }
    return value;
  };

  // Helper function to prepare data for pie/bar charts (optimized with limit)
  const prepareChartData = (metricKey, maxItems = 20) => {
    if (!metrics || !metrics[metricKey]) return null;
    
    const data = metrics[metricKey];
    if (typeof data !== 'object' || Array.isArray(data)) return null;

    // Filter out timestamp-like keys and sort by value (descending)
    const filteredData = Object.entries(data)
      .filter(([key]) => !isTimestamp(key))
      .sort(([, a], [, b]) => b - a)  // Sort by value descending
      .slice(0, maxItems);  // Limit to top N items
    
    // If we had to truncate, add an "Others" category
    const allEntries = Object.entries(data).filter(([key]) => !isTimestamp(key));
    const hasMore = allEntries.length > maxItems;
    
    if (hasMore) {
      const topValues = filteredData.reduce((sum, [, value]) => sum + value, 0);
      const totalValues = allEntries.reduce((sum, [, value]) => sum + value, 0);
      const othersValue = totalValues - topValues;
      if (othersValue > 0) {
        filteredData.push(['Others', othersValue]);
      }
    }
    
    return {
      labels: filteredData.map(([label]) => label),
      datasets: [{
        data: filteredData.map(([_, value]) => value),
        backgroundColor: filteredData.map((_, index) => 
          `hsl(${(index * 360) / filteredData.length}, 70%, 50%)`
        ),
        borderColor: filteredData.map((_, index) => 
          `hsl(${(index * 360) / filteredData.length}, 70%, 50%)`
        ),
        borderWidth: 1,
      }],
    };
  };

  // Common chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: { color: '#8e9eab' }
      },
      title: {
        display: true,
        color: '#ffffff',
      }
    }
  };

  // Add this section after the time series chart
  const renderDistributionCharts = () => (
    <div className="distribution-charts-dashboard">
      <h3>Distribution Analysis</h3>
      <div className="charts-grid-dashboard">
        {/* Message Language Filter */}
        <div className="chart-card-dashboard">
          <h4>Message Language Distribution (Top 15)</h4>
          <div className="chart-wrapper-dashboard">
            {prepareChartData('message_language_filter', 15) && (
              <Pie 
                data={prepareChartData('message_language_filter', 15)}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: {
                      ...chartOptions.plugins.title,
                      text: 'Message Language Distribution'
                    }
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* User IP Location City */}
        <div className="chart-card-dashboard">
          <h4>User Distribution by City (Top 15)</h4>
          <div className="chart-wrapper-dashboard">
            {prepareChartData('user_ip_location_city', 15) && (
              <Bar
                data={prepareChartData('user_ip_location_city', 15)}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: {
                      ...chartOptions.plugins.title,
                      text: 'User Distribution by City'
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
            )}
          </div>
        </div>

        {/* User IP Location Country */}
        <div className="chart-card-dashboard">
          <h4>User Distribution by Country (Top 15)</h4>
          <div className="chart-wrapper-dashboard">
            {prepareChartData('user_ip_location_country', 15) && (
              <Pie
                data={prepareChartData('user_ip_location_country', 15)}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: {
                      ...chartOptions.plugins.title,
                      text: 'User Distribution by Country'
                    }
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* User IP Location Region */}
        <div className="chart-card-dashboard">
          <h4>User Distribution by Region (Top 15)</h4>
          <div className="chart-wrapper-dashboard">
            {prepareChartData('user_ip_location_region', 15) && (
              <Bar
                data={prepareChartData('user_ip_location_region', 15)}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: {
                      ...chartOptions.plugins.title,
                      text: 'User Distribution by Region'
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
            )}
          </div>
        </div>

        {/* User Operating System */}
        <div className="chart-card-dashboard">
          <h4>Operating System Distribution</h4>
          <div className="chart-wrapper-dashboard">
            {prepareChartData('user_operating_system', 10) && (
              <Pie
                data={prepareChartData('user_operating_system', 10)}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: {
                      ...chartOptions.plugins.title,
                      text: 'Operating System Distribution'
                    }
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* User Preferred Language */}
        <div className="chart-card-dashboard">
          <h4>Preferred Language Distribution (Top 15)</h4>
          <div className="chart-wrapper-dashboard">
            {prepareChartData('user_preferred_language', 15) && (
              <Bar
                data={prepareChartData('user_preferred_language', 15)}
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    title: {
                      ...chartOptions.plugins.title,
                      text: 'Preferred Language Distribution'
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
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (showOnlyTimeSeries) {
    return (
      <>
        {renderPriorityMetrics()}
        {/* Time Series Section */}
        <ExpandableSection title="Metrics Time Series">
          <div className="chart-content-dashboard time-series">
            <div className="metrics-timeseries-dashboard">
              <div className="timeseries-controls-dashboard">
                <select 
                  value={selectedMetrics} 
                  onChange={(e) => {
                    setSelectedMetrics(e.target.value);
                    setSelectedTimeseriesCard(null);
                  }}
                >
                  <option value="all">All Metrics</option>
                  {getTimeseriesMetrics().map(metric => (
                    <option key={metric} value={metric}>
                      {metric.replace(/_/g, ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            <div className="chart-container-dashboard">
              <Line
                data={{
                  datasets: (selectedTimeseriesCard ? 
                    [selectedTimeseriesCard] : 
                    selectedMetrics === 'all' ? 
                      getTimeseriesMetrics() : 
                      [selectedMetrics]
                  ).map(metric => ({
                    label: metric.replace(/_/g, ' ').toUpperCase(),
                    data: getTimeseriesData(metric),
                    borderColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
                    backgroundColor: `hsl(${Math.random() * 360}, 70%, 50%, 0.1)`,
                    tension: 0.4,
                    pointRadius: 0,  // Don't render points by default
                    pointHitRadius: 10  // But make them clickable
                  }))
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: false,  // Disable animations for better performance
                  parsing: false,  // Data is already in correct format
                  normalized: true,  // Data is already sorted
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: { color: '#8e9eab' }
                    },
                    title: {
                      display: true,
                      text: `Metrics Time Series (${getTimeRangeText(timeRange || 24)})${metadata && metadata.data_span_days !== undefined ? ` - ${metadata.data_span_days} day${metadata.data_span_days !== 1 ? 's' : ''} of data` : ''}`,
                      color: '#ffffff'
                    },
                    decimation: {
                      enabled: true,
                      algorithm: 'lttb',  // Largest Triangle Three Buckets algorithm
                      samples: 100
                    }
                  },
                  scales: {
                    x: {
                      type: 'time',
                      time: {
                        unit: getTimeUnit(timeRange || 24),
                        displayFormats: {
                          minute: 'HH:mm',
                          hour: 'MMM d, HH:mm',
                          day: 'MMM d',
                          month: 'MMM yyyy'
                        }
                      },
                      grid: { color: '#404040' },
                      ticks: { 
                        color: '#8e9eab',
                        maxTicksLimit: 20  // Limit number of x-axis labels
                      }
                    },
                    y: {
                      grid: { color: '#404040' },
                      ticks: { 
                        color: '#8e9eab',
                        maxTicksLimit: 10  // Limit number of y-axis labels
                      }
                    }
                  }
                }}
              />
            </div>
            </div>
          </div>
        </ExpandableSection>
      </>
    );
  }

  if (showOnlyDistribution) {
    return renderDistributionCharts();
  }

  if (showOnlyMetrics) {
    return (
      <div className="metrics-table-container-dashboard">
        {error && (
          <div className="error-message-dashboard">
            Error: {error}
          </div>
        )}

        <table className="metrics-table-dashboard">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {metrics && Object.entries(metrics).map(([key, value]) => (
              <tr key={key}>
                <td>{key.replace(/_/g, ' ').toUpperCase()}</td>
                <td>{renderMetricValue(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="metrics-table-dashboard">
      {renderPriorityMetrics()}
      {/* ... rest of your existing render logic ... */}
    </div>
  );
};

// Update TimeSeriesSection
const TimeSeriesSection = ({ metrics, loading, error, setMetrics, timeRange, metadata }) => {
  const [selectedTimeseriesCard, setSelectedTimeseriesCard] = useState(null);
  const [selectedMetrics, setSelectedMetrics] = useState('all');

  // Helper functions from MetricsTable
  const isTimestamp = (str) => {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str);
  };

  const getLatestMetrics = () => {
    if (!metrics) return {};
    
    const latestMetrics = {};
    Object.entries(metrics).forEach(([key, value]) => {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const timestamps = Object.keys(value).filter(isTimestamp);
        if (timestamps.length > 0) {
          const latestTimestamp = timestamps.sort().reverse()[0];
          latestMetrics[key] = value[latestTimestamp];
        }
      }
    });
    return latestMetrics;
  };

  const getTimeseriesData = (metricKey) => {
    if (!metrics || !metrics[metricKey]) return [];
    
    const data = metrics[metricKey];
    if (typeof data !== 'object' || Array.isArray(data)) return [];

    // Filter and convert timestamp entries only (backend already filters by time range)
    const timeseriesEntries = Object.entries(data)
      .filter(([timestamp]) => isTimestamp(timestamp))
      .map(([timestamp, value]) => ({
        x: new Date(timestamp),
        y: value
      }))
      .sort((a, b) => a.x - b.x);
    
    // Extra safety: downsample if still too many points (backend limits to 500 by default)
    if (timeseriesEntries.length > 500) {
      const step = Math.ceil(timeseriesEntries.length / 500);
      return timeseriesEntries.filter((_, index) => index % step === 0);
    }
    
    return timeseriesEntries;
  };

  const getTimeseriesMetrics = () => {
    if (!metrics) return [];
    
    return Object.keys(metrics).filter(key => {
      const value = metrics[key];
      return typeof value === 'object' && 
             !Array.isArray(value) && 
             Object.keys(value).some(isTimestamp);
    });
  };

  return (
    <>
      {/* Latest Metrics Section */}
      <ExpandableSection title="Latest Metrics">
        <div className="metrics-latest-dashboard">
          <div className="metrics-grid-dashboard">
            {Object.entries(getLatestMetrics()).map(([key, value]) => (
              <div 
                key={key} 
                className={`metric-card-dashboard clickable-dashboard ${selectedTimeseriesCard === key ? 'selected-dashboard' : ''}`}
                onClick={() => setSelectedTimeseriesCard(key)}
              >
                <h4>{key.replace(/_/g, ' ').toUpperCase()}</h4>
                <p>{typeof value === 'number' ? value.toLocaleString() : value}</p>
              </div>
            ))}
          </div>
        </div>
      </ExpandableSection>

      {/* Time Series Section */}
      <ExpandableSection title="Metrics Time Series">
        <div className="chart-content-dashboard time-series">
          <div className="metrics-timeseries-dashboard">
            <div className="timeseries-controls-dashboard">
              <select 
                value={selectedMetrics} 
                onChange={(e) => {
                  setSelectedMetrics(e.target.value);
                  setSelectedTimeseriesCard(null);
                }}
              >
                <option value="all">All Metrics</option>
                {getTimeseriesMetrics().map(metric => (
                  <option key={metric} value={metric}>
                    {metric.replace(/_/g, ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="chart-container-dashboard">
              <Line
                data={{
                  datasets: (selectedTimeseriesCard ? 
                    [selectedTimeseriesCard] : 
                    selectedMetrics === 'all' ? 
                      getTimeseriesMetrics() : 
                      [selectedMetrics]
                  ).map(metric => ({
                    label: metric.replace(/_/g, ' ').toUpperCase(),
                    data: getTimeseriesData(metric),
                    borderColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
                    backgroundColor: `hsl(${Math.random() * 360}, 70%, 50%, 0.1)`,
                    tension: 0.4,
                    pointRadius: 0,  // Don't render points by default
                    pointHitRadius: 10  // But make them clickable
                  }))
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: false,  // Disable animations for better performance
                  parsing: false,  // Data is already in correct format
                  normalized: true,  // Data is already sorted
                  plugins: {
                    legend: {
                      position: 'top',
                      labels: { color: '#8e9eab' }
                    },
                    title: {
                      display: true,
                      text: `Metrics Time Series (${getTimeRangeText(timeRange)})${metadata && metadata.data_span_days !== undefined ? ` - ${metadata.data_span_days} day${metadata.data_span_days !== 1 ? 's' : ''} of data` : ''}`,
                      color: '#ffffff'
                    },
                    decimation: {
                      enabled: true,
                      algorithm: 'lttb',  // Largest Triangle Three Buckets algorithm
                      samples: 100
                    }
                  },
                  scales: {
                    x: {
                      type: 'time',
                      time: {
                        unit: getTimeUnit(timeRange),
                        displayFormats: {
                          minute: 'HH:mm',
                          hour: 'MMM d, HH:mm',
                          day: 'MMM d',
                          month: 'MMM yyyy'
                        }
                      },
                      grid: { color: '#404040' },
                      ticks: { 
                        color: '#8e9eab',
                        maxTicksLimit: 20  // Limit number of x-axis labels
                      }
                    },
                    y: {
                      grid: { color: '#404040' },
                      ticks: { 
                        color: '#8e9eab',
                        maxTicksLimit: 10  // Limit number of y-axis labels
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      </ExpandableSection>
    </>
  );
};

// Update DistributionSection
const DistributionSection = ({ metrics }) => (
  <ExpandableSection title="Distribution Analytics">
    <MetricsTable 
      metrics={metrics} 
      showOnlyDistribution={true} 
    />
  </ExpandableSection>
);

// Update SystemMetricsSection
const SystemMetricsSection = ({ metrics, loading, error, setMetrics }) => (
  <ExpandableSection title="System Metrics">
    <MetricsTable 
      metrics={metrics} 
      setMetrics={setMetrics}
      loading={loading}
      error={error}
      showOnlyMetrics={true} 
    />
  </ExpandableSection>
);

// SQL Query Interface Section
const SQLQuerySection = ({ isAuthenticated }) => {
  const [schema, setSchema] = useState(null);
  const [query, setQuery] = useState('SELECT * FROM "user" LIMIT 10;');
  const [queryResults, setQueryResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  
  // AI Assistant states
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [showCopied, setShowCopied] = useState(false);

  // Fetch schema when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const debugPwd = getGlobalState('debugPwd');
      console.log('SQL Query Section: Authentication ready. Password available:', !!debugPwd);
      if (debugPwd) {
        fetchSchema();
      } else {
        console.error('Debug password not found after authentication');
      }
    }
  }, [isAuthenticated]);

  const fetchSchema = async () => {
    const debugPwd = getGlobalState('debugPwd');
    if (!debugPwd) {
      console.error('Cannot fetch schema: No debug password');
      return;
    }
    
    try {
      const response = await fetch('/api/database_schema', {
        method: 'GET',
        headers: {
          'Debug-Password': debugPwd,
        }
      });
      const data = await response.json();
      if (data.success) {
        setSchema(data.schema);
      } else {
        console.error('Schema fetch failed:', data);
      }
    } catch (err) {
      console.error('Error fetching schema:', err);
    }
  };

  const executeQuery = async () => {
    const debugPwd = getGlobalState('debugPwd');
    if (!debugPwd) {
      setError('Authentication error. Please refresh the page and log in again.');
      return;
    }
    
    setLoading(true);
    setError(null);
    setQueryResults(null);
    
    try {
      const response = await fetch('/api/execute_query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Debug-Password': debugPwd,
        },
        body: JSON.stringify({ query, max_rows: 1000 })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setQueryResults(data);
      } else {
        setError(data.error || 'Query execution failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      executeQuery();
    }
  };

  const insertTableName = (tableName) => {
    setQuery(`SELECT * FROM "${tableName}" LIMIT 10;`);
  };

  const generateQueryWithAI = async () => {
    if (!aiPrompt.trim()) return;
    
    const debugPwd = getGlobalState('debugPwd');
    if (!debugPwd) {
      setAiError('Authentication error. Please refresh the page and log in again.');
      return;
    }
    
    setAiLoading(true);
    setAiError(null);
    setAiResponse(null);
    
    try {
      const response = await fetch('/api/ai_generate_query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Debug-Password': debugPwd,
        },
        body: JSON.stringify({ 
          prompt: aiPrompt,
          schema: schema 
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setAiResponse(data);
        setQuery(data.query); // Auto-fill the SQL query box
      } else {
        setAiError(data.error || 'Failed to generate query');
      }
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      generateQueryWithAI();
    }
  };

  const copySchemaToClipboard = () => {
    if (!schema) return;
    
    let schemaText = "DATABASE SCHEMA\n\n";
    schema.forEach(table => {
      schemaText += `Table: ${table.table_name} (${table.row_count} rows)\n`;
      schemaText += `Columns:\n`;
      table.columns.forEach(col => {
        const pk = table.primary_keys.includes(col.name) ? ' [PRIMARY KEY]' : '';
        schemaText += `  - ${col.name}: ${col.type}${pk}\n`;
      });
      schemaText += `\n`;
    });
    
    navigator.clipboard.writeText(schemaText).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    });
  };

  const clearAiResponse = () => {
    setAiResponse(null);
    setAiError(null);
    setAiPrompt('');
  };

  // Check authentication status
  const isAuthReady = !!getGlobalState('debugPwd');

  return (
    <ExpandableSection title="SQL Query Interface" defaultExpanded={false}>
      {!isAuthReady && (
        <div style={{
          padding: '15px',
          background: '#3a1a1a',
          border: '1px solid #ff4444',
          borderRadius: '4px',
          color: '#ff6666',
          marginBottom: '15px'
        }}>
          <strong>Authentication Required:</strong> Please refresh the page and log in again to use this feature.
        </div>
      )}
      <div style={{ display: 'flex', gap: '20px', flexDirection: 'row' }}>
        {/* Schema Panel */}
        <div style={{ 
          flex: '0 0 300px', 
          background: '#1a1a1a', 
          padding: '15px', 
          borderRadius: '8px',
          maxHeight: '600px',
          overflowY: 'auto'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <h4 style={{ color: '#00ff87', margin: 0 }}>Database Schema</h4>
            <button
              onClick={copySchemaToClipboard}
              style={{
                padding: '5px 10px',
                background: showCopied ? '#00ff87' : '#2a2a2a',
                color: showCopied ? '#000' : '#00ff87',
                border: '1px solid #00ff87',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 'bold'
              }}
              title="Copy all schema info to clipboard"
            >
              {showCopied ? 'Copied!' : 'Copy All'}
            </button>
          </div>
          {schema ? (
            <div>
              {schema.map((table) => (
                <div 
                  key={table.table_name} 
                  style={{ 
                    marginBottom: '15px', 
                    padding: '10px', 
                    background: selectedTable === table.table_name ? '#2a2a2a' : '#252525',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: selectedTable === table.table_name ? '1px solid #00ff87' : '1px solid #404040'
                  }}
                  onClick={() => {
                    setSelectedTable(table.table_name);
                    insertTableName(table.table_name);
                  }}
                >
                  <div style={{ 
                    fontWeight: 'bold', 
                    color: '#00bfff', 
                    marginBottom: '5px',
                    fontSize: '14px'
                  }}                  >
                    {table.table_name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8e9eab', marginBottom: '8px' }}>
                    {table.row_count.toLocaleString()} rows
                  </div>
                  <div style={{ fontSize: '11px' }}>
                    {table.columns.slice(0, 5).map((col) => (
                      <div key={col.name} style={{ 
                        color: table.primary_keys.includes(col.name) ? '#ffaa00' : '#aaa',
                        marginLeft: '10px'
                      }}>
                        {table.primary_keys.includes(col.name) ? '[PK] ' : '• '}
                        {col.name}: <span style={{ color: '#00ff87' }}>{col.type}</span>
                      </div>
                    ))}
                    {table.columns.length > 5 && (
                      <div style={{ color: '#666', marginLeft: '10px' }}>
                        ... +{table.columns.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#8e9eab' }}>Loading schema...</div>
          )}
        </div>

        {/* Query Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {/* AI Assistant Box */}
          <div style={{ 
            background: '#1a1a2a', 
            padding: '15px', 
            borderRadius: '8px',
            border: '1px solid #4040ff'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <label style={{ color: '#00bfff', fontWeight: 'bold', fontSize: '14px' }}>
                AI Query Assistant
              </label>
              <div style={{ fontSize: '11px', color: '#8e9eab' }}>
                Describe what you want in plain English
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={handleAiKeyDown}
                placeholder="e.g., Show me all users who logged in today"
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#2a2a3a',
                  color: '#fff',
                  border: '1px solid #4040ff',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
              />
              <button
                onClick={generateQueryWithAI}
                disabled={aiLoading || !aiPrompt.trim()}
                style={{
                  padding: '10px 20px',
                  background: aiLoading ? '#404040' : '#00bfff',
                  color: aiLoading ? '#888' : '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: aiLoading || !aiPrompt.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}
              >
                {aiLoading ? 'Thinking...' : 'Generate SQL'}
              </button>
            </div>

            {/* AI Response */}
            {(aiResponse || aiError) && (
              <div style={{
                marginTop: '10px',
                padding: '12px',
                background: aiError ? '#3a1a1a' : '#1a3a1a',
                border: `1px solid ${aiError ? '#ff4444' : '#00ff87'}`,
                borderRadius: '4px',
                position: 'relative'
              }}>
                <button
                  onClick={clearAiResponse}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '4px 8px'
                  }}
                  title="Clear response"
                >
                  X
                </button>
                
                {aiError ? (
                  <div style={{ color: '#ff6666', fontSize: '12px' }}>
                    <strong>Error:</strong> {aiError}
                  </div>
                ) : (
                  <div>
                    <div style={{ color: '#00ff87', fontSize: '11px', marginBottom: '5px' }}>
                      Generated SQL (auto-filled below):
                    </div>
                    <pre style={{
                      color: '#ddd',
                      fontSize: '12px',
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace'
                    }}>
                      {aiResponse.query}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SQL Query Box */}
          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <label style={{ color: '#00ff87', fontWeight: 'bold' }}>
                SQL Query (SELECT only)
              </label>
              <div style={{ fontSize: '11px', color: '#8e9eab' }}>
                Press Ctrl/Cmd + Enter to execute
              </div>
            </div>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                minHeight: '120px',
                background: '#2a2a2a',
                color: '#fff',
                border: '1px solid #404040',
                borderRadius: '4px',
                padding: '12px',
                fontFamily: 'monospace',
                fontSize: '13px',
                resize: 'vertical'
              }}
              placeholder="SELECT * FROM user LIMIT 10;"
            />
          </div>

          <button
            onClick={executeQuery}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: loading ? '#404040' : '#00ff87',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'wait' : 'pointer',
              fontWeight: 'bold',
              marginBottom: '20px'
            }}
          >
            {loading ? 'Executing...' : 'Execute Query'}
          </button>

          {error && (
            <div style={{
              padding: '15px',
              background: '#3a1a1a',
              border: '1px solid #ff4444',
              borderRadius: '4px',
              color: '#ff6666',
              marginBottom: '15px'
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {queryResults && (
            <div>
              <div style={{ 
                marginBottom: '10px', 
                color: '#8e9eab',
                fontSize: '12px'
              }}>
                {queryResults.row_count.toLocaleString()} row{queryResults.row_count !== 1 ? 's' : ''} returned
                {queryResults.max_rows_reached && ' (limit reached)'}
              </div>
              <div style={{ 
                overflowX: 'auto',
                background: '#1a1a1a',
                borderRadius: '4px',
                border: '1px solid #404040'
              }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  fontSize: '12px'
                }}>
                  <thead>
                    <tr style={{ background: '#2a2a2a' }}>
                      {queryResults.columns.map((col) => (
                        <th key={col} style={{
                          padding: '12px',
                          textAlign: 'left',
                          color: '#00ff87',
                          borderBottom: '2px solid #404040',
                          whiteSpace: 'nowrap',
                          position: 'sticky',
                          top: 0,
                          background: '#2a2a2a'
                        }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResults.data.map((row, idx) => (
                      <tr key={idx} style={{
                        borderBottom: '1px solid #333'
                      }}>
                        {queryResults.columns.map((col) => (
                          <td key={col} style={{
                            padding: '10px 12px',
                            color: '#ddd',
                            maxWidth: '300px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {row[col] === null ? (
                              <span style={{ color: '#666', fontStyle: 'italic' }}>NULL</span>
                            ) : (
                              String(row[col])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </ExpandableSection>
  );
};

function PasswordScreen({ onAuthenticate }) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/debug/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      
      // Store password in global state
      setGlobalState('debugPwd', password);
      onAuthenticate(true);
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-password-screen">
      <form onSubmit={handleSubmit} className="admin-password-form">
        <h2>{t('Admin Dashboard Access')}</h2>
        <div className="admin-password-input-container">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('Enter admin password')}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !password}>
            {loading ? t('Verifying...') : t('Access')}
          </button>
        </div>
        {error && <div className="admin-error-message">{error}</div>}
      </form>
    </div>
  );
}

function DashboardAdmin() {
  const { t } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [timeRange, setTimeRange] = useState(24); // Hours to fetch (0 = all time)
  const [metadata, setMetadata] = useState(null); // Store metadata from backend
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track initial load

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup any remaining chart instances
      const charts = ChartJS.instances;
      Object.keys(charts).forEach(key => {
        charts[key].destroy();
      });
    };
  }, []);

  // Optimized fetchMetrics with data filtering
  const fetchMetrics = async (hoursRange = 24, maxPoints = 500, update = true) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/get_metrics_now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Debug-Password': getGlobalState('debugPwd'),
        },
        body: JSON.stringify({
          hours: hoursRange,      // Hours to fetch (0 = all time)
          max_points: maxPoints,  // Limit data points per metric
          update: update          // Whether to update metrics before fetching
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.metrics);
        setMetadata(data.metadata);
      } else {
        setError(data.error || 'Failed to fetch metrics');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and fetch on time range change
  useEffect(() => {
    if (isAuthenticated) {
      // Update metrics on initial load, then just fetch data on time range changes
      if (isInitialLoad) {
        fetchMetrics(timeRange, 500, true);  // Update metrics on first load
        setIsInitialLoad(false);
      } else {
        fetchMetrics(timeRange, 500, false); // Just fetch data when changing time range
      }
    }
  }, [isAuthenticated, timeRange]); // Auto-fetch when time range changes

  // Get the latest value for a metric
  const getLatestMetricValue = (metricKey) => {
    if (!metrics || !metrics[metricKey]) return 0;
    const timestamps = Object.keys(metrics[metricKey]).filter(key => 
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(key)
    );
    if (timestamps.length === 0) return 0;
    const latestTimestamp = timestamps.sort().reverse()[0];
    return metrics[metricKey][latestTimestamp];
  };

  if (!isAuthenticated) {
    return <PasswordScreen onAuthenticate={setIsAuthenticated} />;
  }

  return (
    <div className="dashboard-admin-dashboard">
      <div className="dashboard-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <h1>{t('Admin Analytics Dashboard')}</h1>
          {metadata && (
            <div style={{ fontSize: '12px', color: '#8e9eab', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div>
                <span style={{ 
                  fontWeight: 'bold', 
                  color: metadata.hours_range === 'all_time' ? '#00ff87' : '#00bfff' 
                }}>
                  {metadata.hours_range === 'all_time' ? 'All Historical Data' : `Last ${metadata.hours_range} hours`}
                </span>
                {metadata.metrics_count > 0 && (
                  <>
                    {' • '}
                    <span title={`${metadata.total_data_points_sent?.toLocaleString() || 0} total data points across ${metadata.metrics_count} metrics`}>
                      {metadata.metrics_count} metrics × ~{metadata.avg_points_per_metric} snapshots
                    </span>
                  </>
                )}
                {' • '}
                Updated: {new Date(metadata.last_updated).toLocaleString()}
              </div>
              {metadata.data_span_days !== undefined && (
                <div style={{ 
                  color: metadata.data_span_days < 7 ? '#ffaa00' : '#00ff87',
                  fontSize: '11px'
                }}>
                  Data available: {metadata.data_span_days} day{metadata.data_span_days !== 1 ? 's' : ''} 
                  {metadata.oldest_data && ` (from ${new Date(metadata.oldest_data).toLocaleDateString()})`}
                  {metadata.data_span_days < 7 && ' [Data collection started recently]'}
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="time-range-selector"
              disabled={loading}
              style={{
                padding: '8px 12px',
                background: '#2a2a2a',
                color: '#fff',
                border: '1px solid #404040',
                borderRadius: '4px',
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              <option value={1}>Last 1 Hour</option>
              <option value={6}>Last 6 Hours</option>
              <option value={24}>Last 24 Hours</option>
              <option value={72}>Last 3 Days</option>
              <option value={168}>Last 7 Days</option>
              <option value={720}>Last 30 Days</option>
              <option value={2160}>Last 90 Days</option>
              <option value={0}>All Time (Life-span)</option>
            </select>
            {loading && (
              <div style={{ 
                position: 'absolute', 
                top: '50%', 
                right: '35px', 
                transform: 'translateY(-50%)',
                color: '#00ff87',
                fontSize: '12px'
              }}>⟳</div>
            )}
          </div>
          <button 
            onClick={() => fetchMetrics(timeRange, 500, true)}
            className="refresh-button-dashboard"
            disabled={loading}
          >
            {loading ? t('Updating...') : t('Refresh Now')}
          </button>
        </div>
      </div>
      <div className="dashboard-layout-dashboard">
        <div className="dashboard-primary-dashboard">
          {/* Priority Metrics Grid */}
          <div className="priority-metrics-grid-dashboard">
            {[
              { key: 'total_user_number', display: 'User No.', description: 'Total User Number' },
              { key: 'total_chatroom_number', display: 'Chatroom No.', description: 'Total Chatroom Number' },
              { key: 'total_message_count', display: 'Message No.', description: 'Total Message Count' },
              { key: 'total_user_monthly_active', display: 'MAU', description: 'Monthly Active Users' },
              { key: 'total_user_daily_active', display: 'DAU', description: 'Daily Active Users' },
              { key: 'total_user_number_monthly', display: 'Monthly subscription Paid No.', description: 'Monthly Subscription Users' },
              { key: 'total_user_number_monthly_onetime', display: 'Monthly One-time Paid No.', description: 'Monthly One-time Subscription Users' },
              { key: 'total_user_number_annual', display: 'Yearly subscription Paid No.', description: 'Annual Subscription Users' },
              { key: 'total_user_number_annual_onetime', display: 'Yearly One-time Paid No.', description: 'Annual One-time Subscription Users' },
              { key: 'total_user_number_basic_no_refer', display: 'Basic Paid No.', description: 'Basic Plan Users (No Referral)' },
              { key: 'total_user_number_basic_refer', display: 'Basic Promotion', description: 'Basic Plan Users (With Referral)' }
            ].map(({ key, display, description }) => (
              <div key={key} className="metric-card-dashboard" title={description}>
                <div className="metric-label-dashboard">
                  <span className="metric-abbreviation">{display}</span>
                  <span className="metric-full-name">{description}</span>
                </div>
                <div className="metric-value-dashboard">
                  {getLatestMetricValue(key).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <TimeSeriesSection 
            metrics={metrics} 
            loading={loading}
            error={error}
            setMetrics={setMetrics}
            timeRange={timeRange}
            metadata={metadata}
          />
          <DistributionSection metrics={metrics} />
          <SystemMetricsSection 
            metrics={metrics}
            loading={loading}
            error={error}
            setMetrics={setMetrics}
          />
          <SQLQuerySection isAuthenticated={isAuthenticated} />
        </div>
        <div className="dashboard-secondary-dashboard">
          <GeographicDistribution stats={metrics} />
        </div>
      </div>
    </div>
  );
}

export default DashboardAdmin;
