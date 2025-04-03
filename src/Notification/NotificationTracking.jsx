import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Bar } from 'recharts';
import '../styles/NotificationTracking.css'
import { XAxis, YAxis } from 'recharts';


// Import this in your NotificationAdmin.js file and add it as a new section

const API_BASE_URL = 'http://localhost:5000/api';

const AnalyticsDashboard = () => {
  // State for analytics data
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('week');
  const [abTestData, setAbTestData] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  
  // Fetch analytics data
  useEffect(() => {
    fetchAnalyticsData();
    fetchCampaigns();
  }, [timeframe]);
  
  // Fetch analytics data from the API
  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/notification-analytics?timeframe=${timeframe}`);
      setAnalyticsData(response.data);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch campaigns
  const fetchCampaigns = async () => {
    try {
      // This endpoint would need to be implemented on the backend
      const response = await axios.get(`${API_BASE_URL}/campaigns`);
      setCampaigns(response.data.campaigns || []);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    }
  };
  
  // Fetch A/B test data
  const fetchAbTestData = async (campaignId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/ab-test-results/${campaignId}`);
      setAbTestData(response.data);
    } catch (err) {
      console.error('Error fetching A/B test data:', err);
    }
  };
  
  // Format date for charts
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };
  
  // Handle campaign selection
  const handleCampaignSelect = (campaignId) => {
    setSelectedCampaign(campaignId);
    if (campaignId) {
      fetchAbTestData(campaignId);
    } else {
      setAbTestData(null);
    }
  };
  
  // Prepare chart data
  const prepareChartData = () => {
    if (!analyticsData || !analyticsData.notifications) return [];
    
    // Group by date
    const groupedData = {};
    analyticsData.notifications.forEach(notification => {
      const dateKey = formatDate(notification.sentAt);
      if (!groupedData[dateKey]) {
        groupedData[dateKey] = {
          date: dateKey,
          sent: 0,
          opened: 0,
          interactions: 0
        };
      }
      
      groupedData[dateKey].sent += notification.targetCount || 0;
      groupedData[dateKey].opened += notification.openCount || 0;
      groupedData[dateKey].interactions += notification.interactionCount || 0;
    });
    
    return Object.values(groupedData).sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA - dateB;
    });
  };
  
  // Create a new A/B test
  const createNewAbTest = () => {
    // Example implementation - would open a modal or form for A/B test setup
    console.log('Open A/B test creation form');
  };
  
  return (
    <section className="analytics-dashboard-section card">
      <h2>Analytics Dashboard</h2>
      
      {isLoading ? (
        <div className="loading-container">
          <span className="loading-spinner"></span>
          <p>Loading analytics data...</p>
        </div>
      ) : (
        <>
          {/* Timeframe Selector */}
          <div className="timeframe-selector">
            <label>Time Period:</label>
            <select 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)}
              className="timeframe-select"
            >
              <option value="day">Last 24 Hours</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
            <button 
              onClick={fetchAnalyticsData}
              className="btn refresh-button"
            >
              <span className="refresh-icon"></span>
              Refresh
            </button>
          </div>

          {/* Summary Cards */}
          {analyticsData && (
            <div className="analytics-summary">
              <div className="summary-card">
                <h3>Delivery Rate</h3>
                <div className="metric-value">
                  {analyticsData.summary.deliveryRate.toFixed(1)}%
                </div>
                <div className="metric-detail">
                  {analyticsData.summary.totalDelivered} / {analyticsData.summary.totalSent} notifications
                </div>
              </div>
              
              <div className="summary-card">
                <h3>Open Rate</h3>
                <div className="metric-value">
                  {analyticsData.summary.openRate.toFixed(1)}%
                </div>
                <div className="metric-detail">
                  {analyticsData.summary.totalOpened} / {analyticsData.summary.totalDelivered} notifications
                </div>
              </div>
              
              <div className="summary-card">
                <h3>Interaction Rate</h3>
                <div className="metric-value">
                  {analyticsData.summary.interactionRate.toFixed(1)}%
                </div>
                <div className="metric-detail">
                  {analyticsData.summary.totalInteractions} / {analyticsData.summary.totalOpened} interactions
                </div>
              </div>
            </div>
          )}

          {/* Performance Chart */}
          <div className="performance-chart">
            <h3>Notification Performance</h3>
            {prepareChartData().length > 0 ? (
              <div className="chart-container">
                <Line 
                  data={prepareChartData()}
                  width={600}
                  height={300}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Line type="monotone" dataKey="sent" stroke="#8884d8" name="Sent" />
                  <Line type="monotone" dataKey="opened" stroke="#82ca9d" name="Opened" />
                  <Line type="monotone" dataKey="interactions" stroke="#ffc658" name="Interactions" />
                </Line>
              </div>
            ) : (
              <p className="no-data-message">No notification data available for this timeframe.</p>
            )}
          </div>

          {/* Recent Notifications Table */}
          <div className="recent-notifications">
            <h3>Recent Notifications</h3>
            {analyticsData && analyticsData.notifications.length > 0 ? (
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Title</th>
                    <th>Sent</th>
                    <th>Opened</th>
                    <th>Open Rate</th>
                    <th>Interactions</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.notifications.map(notification => (
                    <tr key={notification.id}>
                      <td>{new Date(notification.sentAt).toLocaleString()}</td>
                      <td>{notification.title}</td>
                      <td>{notification.sentCount}</td>
                      <td>{notification.openCount || 0}</td>
                      <td>
                        {notification.sentCount > 0 
                          ? ((notification.openCount || 0) / notification.sentCount * 100).toFixed(1) 
                          : 0}%
                      </td>
                      <td>{notification.interactionCount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="no-data-message">No recent notifications found.</p>
            )}
          </div>

          {/* A/B Testing Section */}
          <div className="ab-testing-section">
            <div className="section-header">
              <h3>A/B Testing</h3>
              <button 
                onClick={createNewAbTest}
                className="btn create-ab-test-button"
              >
                Create New A/B Test
              </button>
            </div>
            
            {/* Campaign Selector */}
            <div className="campaign-selector">
              <label>Select Campaign:</label>
              <select 
                value={selectedCampaign || ''}
                onChange={(e) => handleCampaignSelect(e.target.value || null)}
                className="campaign-select"
              >
                <option value="">-- Select Campaign --</option>
                {campaigns.map(campaign => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* A/B Test Results */}
            {abTestData ? (
              <div className="ab-test-results">
                <h4>Test Results: {selectedCampaign}</h4>
                
                {/* Variants Comparison */}
                <div className="variants-comparison">
                  {abTestData.variants.map(variant => (
                    <div 
                      key={variant.id} 
                      className={`variant-card ${variant.id === abTestData.winner.id ? 'winner' : ''}`}
                    >
                      <div className="variant-header">
                        <h5>Variant {variant.variant}</h5>
                        {variant.id === abTestData.winner.id && (
                          <span className="winner-badge">Winner</span>
                        )}
                      </div>
                      
                      <div className="variant-content">
                        <p><strong>Title:</strong> {variant.title}</p>
                        <p><strong>Message:</strong> {variant.body}</p>
                        <p><strong>Open Rate:</strong> {variant.openRate.toFixed(1)}%</p>
                        <p><strong>Interaction Rate:</strong> {variant.interactionRate.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Results Chart */}
                <div className="results-chart">
                  <h4>Performance Comparison</h4>
                  <Bar
                    data={abTestData.variants.map(v => ({
                      variant: `Variant ${v.variant}`,
                      openRate: v.openRate,
                      interactionRate: v.interactionRate
                    }))}
                    width={600}
                    height={300}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis dataKey="variant" />
                    <YAxis />
                    <Bar dataKey="openRate" fill="#82ca9d" name="Open Rate" />
                    <Bar dataKey="interactionRate" fill="#8884d8" name="Interaction Rate" />
                  </Bar>
                </div>
              </div>
            ) : (
              <p className="no-data-message">
                {selectedCampaign 
                  ? "Loading campaign data..." 
                  : "Select a campaign to view A/B test results."}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default AnalyticsDashboard;