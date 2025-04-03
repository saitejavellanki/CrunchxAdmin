import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/NotificationAdmin.css';
import AnalyticsDashboard from './NotificationTracking';

// Configure the API base URL
const API_BASE_URL = 'http://localhost:5000/api'; // Update with your server URL

const NotificationAdmin = () => {
  // State for notification data
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [dataJson, setDataJson] = useState('{}');
  const [tokens, setTokens] = useState([]);
  const [filteredTokens, setFilteredTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [showSampleTokens, setShowSampleTokens] = useState(false);
  
  // State for water reminder feature
  const [waterReminderStatus, setWaterReminderStatus] = useState({
    active: false,
    nextReminder: null
  });
  const [isWaterReminderLoading, setIsWaterReminderLoading] = useState(false);
  const [isSendingTestReminder, setIsSendingTestReminder] = useState(false);
  
  // Fetch tokens on component mount
  useEffect(() => {
    fetchPushTokens();
    fetchWaterReminderStatus();
  }, []);
  
  // Function to fetch all push tokens from our Express server
  const fetchPushTokens = async () => {
    setIsLoading(true);
    setStatusMessage({ type: 'info', text: 'Fetching device tokens...' });
    
    try {
      const response = await axios.get(`${API_BASE_URL}/tokens`);
      const fetchedTokens = response.data.tokens || [];
      
      if (fetchedTokens.length > 0) {
        setTokens(fetchedTokens);
        setFilteredTokens(fetchedTokens);
        setStatusMessage({ 
          type: 'success', 
          text: `Successfully loaded ${fetchedTokens.length} device tokens.` 
        });
      } else {
        setTokens([]);
        setFilteredTokens([]);
        setStatusMessage({ 
          type: 'warning', 
          text: 'No device tokens found in the database.' 
        });
      }
    } catch (err) {
      console.error('Error fetching tokens:', err);
      setStatusMessage({ 
        type: 'error', 
        text: `Failed to fetch tokens: ${err.response?.data?.error || err.message}` 
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to send notifications via our Express server
  const sendNotification = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !body.trim()) {
      setStatusMessage({ type: 'error', text: 'Title and body are required!' });
      return;
    }
    
    if (filteredTokens.length === 0) {
      setStatusMessage({ type: 'error', text: 'No tokens available to send notifications to!' });
      return;
    }
    
    setIsSending(true);
    setStatusMessage({ type: 'info', text: 'Sending notifications...' });
    
    try {
      // Parse the data JSON (handle potential parsing errors)
      let parsedData = {};
      try {
        parsedData = JSON.parse(dataJson);
      } catch (err) {
        throw new Error('Invalid JSON format in data field');
      }
      
      // Send request to our Express server
      const response = await axios.post(`${API_BASE_URL}/send-notifications`, {
        tokens: filteredTokens.map(item => item.token),
        title,
        body,
        data: parsedData
      });
      
      const { sent, failed } = response.data;
      
      setStatusMessage({
        type: sent > 0 ? 'success' : 'warning',
        text: `Sent notifications to ${sent} devices. ${failed > 0 ? `Failed: ${failed}` : ''}`
      });
      
      // Clear form after successful send
      if (sent > 0) {
        setTitle('');
        setBody('');
        setDataJson('{}');
      }
    } catch (err) {
      console.error('Error sending notifications:', err);
      setStatusMessage({ 
        type: 'error', 
        text: `Failed to send notifications: ${err.response?.data?.error || err.message}` 
      });
    } finally {
      setIsSending(false);
    }
  };
  
  // Toggle showing sample tokens
  const toggleSampleTokens = () => {
    setShowSampleTokens(!showSampleTokens);
  };
  
  // Function to fetch water reminder status
  const fetchWaterReminderStatus = async () => {
    setIsWaterReminderLoading(true);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/water-reminders/status`);
      const { active, jobs } = response.data;
      
      setWaterReminderStatus({
        active,
        nextReminder: jobs && jobs.length > 0 ? new Date(jobs[0].nextInvocation) : null,
        jobs
      });
    } catch (err) {
      console.error('Error fetching water reminder status:', err);
      setStatusMessage({ 
        type: 'error', 
        text: `Failed to fetch water reminder status: ${err.response?.data?.error || err.message}` 
      });
    } finally {
      setIsWaterReminderLoading(false);
    }
  };
  
  // Function to start water reminders
  const startWaterReminders = async () => {
    setIsWaterReminderLoading(true);
    setStatusMessage({ type: 'info', text: 'Starting water reminders...' });
    
    try {
      const response = await axios.post(`${API_BASE_URL}/start-water-reminders`);
      
      setWaterReminderStatus({
        active: true,
        nextReminder: response.data.nextReminder ? new Date(response.data.nextReminder) : null,
        schedule: response.data.schedule
      });
      
      setStatusMessage({ 
        type: 'success', 
        text: `Water reminders started successfully. Next reminder: ${new Date(response.data.nextReminder).toLocaleString()}` 
      });
    } catch (err) {
      console.error('Error starting water reminders:', err);
      setStatusMessage({ 
        type: 'error', 
        text: `Failed to start water reminders: ${err.response?.data?.error || err.message}` 
      });
    } finally {
      setIsWaterReminderLoading(false);
    }
  };
  
  // Function to send immediate water reminder
  const sendImmediateWaterReminder = async () => {
    setIsSendingTestReminder(true);
    setStatusMessage({ type: 'info', text: 'Sending immediate water reminder...' });
    
    try {
      const response = await axios.post(`${API_BASE_URL}/water-reminders/send-now`);
      
      const { successful, failed } = response.data;
      
      setStatusMessage({ 
        type: 'success', 
        text: `Water reminder sent to ${successful} devices. ${failed > 0 ? `Failed: ${failed}` : ''}` 
      });
    } catch (err) {
      console.error('Error sending water reminder:', err);
      setStatusMessage({ 
        type: 'error', 
        text: `Failed to send water reminder: ${err.response?.data?.error || err.message}` 
      });
    } finally {
      setIsSendingTestReminder(false);
    }
  };
  
  // Format the next reminder time
  const formatNextReminder = (date) => {
    if (!date) return 'Not scheduled';
    
    try {
      const reminderDate = new Date(date);
      return reminderDate.toLocaleString();
    } catch (err) {
      return 'Invalid date';
    }
  };
  
  return (
    <div className="notification-admin">
      <header className="admin-header">
        <h1>Push Notification Dashboard</h1>
      </header>
      
      <div className="admin-content">
        <div className="admin-grid">
          <section className="tokens-section card">
            <div className="section-header">
              <h2>Device Tokens</h2>
              <button 
                onClick={fetchPushTokens}
                disabled={isLoading}
                className="btn refresh-button"
              >
                <span className={isLoading ? 'loading-spinner' : 'refresh-icon'}></span>
                {isLoading ? 'Loading...' : 'Refresh Tokens'}
              </button>
            </div>
            
            <div className="token-stats">
              <div className="stat-box">
                <span className="stat-value">{tokens.length}</span>
                <span className="stat-label">Total Devices</span>
              </div>
              <div className="stat-box">
                <span className="stat-value">{filteredTokens.length}</span>
                <span className="stat-label">Selected Devices</span>
              </div>
            </div>
            
            <button 
              onClick={toggleSampleTokens} 
              className="btn toggle-samples-button"
            >
              {showSampleTokens ? 'Hide Sample Tokens' : 'Show Sample Tokens'}
            </button>
            
            {showSampleTokens && (
              <div className="sample-tokens">
                <h3>Sample Tokens (First 3)</h3>
                <div className="token-list">
                  {tokens.slice(0, 3).map((item, index) => (
                    <div key={index} className="token-item">
                      <div className="token-header">
                        <span className="token-user">User: {item.userId}</span>
                        <span className="token-platform platform-badge">{item.platform}</span>
                      </div>
                      <code className="token-value">{item.token}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
          
          <section className="notification-form-section card">
            <h2>Send New Notification</h2>
            
            {statusMessage && (
              <div className={`status-message ${statusMessage.type}`}>
                <span className="status-icon"></span>
                {statusMessage.text}
              </div>
            )}
            
            <form onSubmit={sendNotification} className="notification-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="title">Notification Title</label>
                  <input 
                    id="title"
                    type="text" 
                    placeholder="Enter notification title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="body">Notification Body</label>
                  <textarea 
                    id="body"
                    placeholder="Enter notification message"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows="3"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="data">Additional Data (JSON)</label>
                  <textarea 
                    id="data"
                    placeholder='{"screen": "Home", "id": "123"}'
                    value={dataJson}
                    onChange={(e) => setDataJson(e.target.value)}
                    rows="3"
                  />
                  <p className="field-hint">Optional: Add data to pass to your app (valid JSON)</p>
                </div>
              </div>
              
              <div className="form-row">
                <div className="preview-box">
                  <h3>Notification Preview</h3>
                  <div className="mobile-frame">
                    <div className="notification-preview">
                      <div className="preview-app-icon"></div>
                      <div className="preview-content">
                        <div className="preview-title">{title || "Notification Title"}</div>
                        <div className="preview-body">{body || "Notification message will appear here"}</div>
                      </div>
                      <div className="preview-time">now</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={isSending || filteredTokens.length === 0}
                className="btn send-button"
              >
                {isSending ? (
                  <>
                    <span className="loading-spinner"></span>
                    Sending...
                  </>
                ) : (
                  <>
                    <span className="send-icon"></span>
                    Send to {filteredTokens.length} Devices
                  </>
                )}
              </button>
            </form>
          </section>

          <AnalyticsDashboard/>
          
          {/* New section for Water Reminders */}
          <section className="water-reminders-section card">
            <h2>Water Reminders</h2>
            
            <div className="reminder-status">
              <div className="status-indicator">
                <span className={`status-dot ${waterReminderStatus.active ? 'active' : 'inactive'}`}></span>
                <span className="status-text">
                  {waterReminderStatus.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="next-reminder">
                <span className="reminder-label">Next Reminder:</span>
                <span className="reminder-time">
                  {formatNextReminder(waterReminderStatus.nextReminder)}
                </span>
              </div>
              
              {waterReminderStatus.schedule && (
                <div className="reminder-schedule">
                  <span className="schedule-label">Schedule:</span>
                  <span className="schedule-value">{waterReminderStatus.schedule}</span>
                  <span className="schedule-description">(Every 2 hours from 8 AM to 8 PM)</span>
                </div>
              )}
            </div>
            
            <div className="reminder-actions">
              <button 
                onClick={startWaterReminders}
                disabled={isWaterReminderLoading || (waterReminderStatus.active && !isWaterReminderLoading)}
                className="btn start-reminder-button"
              >
                {isWaterReminderLoading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Processing...
                  </>
                ) : waterReminderStatus.active ? (
                  'Reminders Active'
                ) : (
                  'Start Reminders'
                )}
              </button>
              
              <button 
                onClick={sendImmediateWaterReminder}
                disabled={isSendingTestReminder}
                className="btn test-reminder-button"
              >
                {isSendingTestReminder ? (
                  <>
                    <span className="loading-spinner"></span>
                    Sending...
                  </>
                ) : (
                  'Send Test Reminder Now'
                )}
              </button>
              
              <button 
                onClick={fetchWaterReminderStatus}
                disabled={isWaterReminderLoading}
                className="btn refresh-status-button"
              >
                <span className={isWaterReminderLoading ? 'loading-spinner' : 'refresh-icon'}></span>
                Refresh Status
              </button>
            </div>
            
            <div className="reminder-help">
              <h4>About Water Reminders</h4>
              <p>
                Water reminders help users stay hydrated by sending regular notifications 
                throughout the day. The default schedule sends reminders every 2 hours 
                from 8 AM to 8 PM.
              </p>
              <p>
                <strong>Test Reminder:</strong> Send an immediate water reminder to all devices.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default NotificationAdmin;