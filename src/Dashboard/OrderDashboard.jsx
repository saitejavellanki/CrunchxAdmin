import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, Filter, Check, AlertCircle, X, RefreshCw } from 'lucide-react';
import { getFirestore, collection, getDocs, doc, updateDoc, query, orderBy, where, getDoc } from 'firebase/firestore';
import { db } from '../config';
import '../styles/OrderDashboard.css';

// Cache user data to avoid repeated database calls
const userCache = {};

// Function to get user name from Firestore
const getUserName = async (userId) => {
  if (userCache[userId]?.name) return userCache[userId].name;
  
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      userCache[userId] = userData;
      return userData.name || userData.displayName || 'Unknown User';
    }
    return 'Unknown User';
  } catch (error) {
    console.error("Error fetching user data:", error);
    return 'Unknown User';
  }
};

// Function to get comprehensive user details
const getUserDetails = async (userId) => {
  if (userCache[userId]) return userCache[userId];
  
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      userCache[userId] = userData;
      return userData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user details:", error);
    return null;
  }
};

export default function OrderDashboard() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Status options for filtering and updating
  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'out_for_delivery', label: 'Out for Delivery' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];
  
  // Date filter options
  const dateOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ];
  
  // Load orders when component mounts
  useEffect(() => {
    loadOrders();
  }, []);
  
  // Apply filters when filter state changes
  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, dateFilter, orders]);
  
  // Load orders from Firebase
  const loadOrders = async () => {
    setLoading(true);
    try {
      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      // Process orders with user data
      const ordersPromises = querySnapshot.docs.map(async (docSnapshot) => {
        const orderData = docSnapshot.data();
        let customerName = 'Unknown';
        
        if (orderData.userId) {
          customerName = await getUserName(orderData.userId);
        }
        
        let userData = {};
        
        if (orderData.userId && (!orderData.address || !orderData.phoneNumber)) {
          userData = await getUserDetails(orderData.userId);
        }
        
        return {
          id: docSnapshot.id,
          ...orderData,
          customerName: customerName,
          customerPhone: orderData.phoneNumber || userData?.phone || 'No phone provided',
          customerAddress: orderData.address || userData?.address || 'No address provided',
          createdAt: orderData.createdAt?.toDate() || new Date()
        };
      });
      
      const ordersData = await Promise.all(ordersPromises);
      setOrders(ordersData);
      setFilteredOrders(ordersData);
    } catch (error) {
      console.error("Error loading orders:", error);
      alert("Failed to load orders from the database");
    } finally {
      setLoading(false);
    }
  };
  
  // Apply filters to orders
  const applyFilters = () => {
    let result = [...orders];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(order => 
        order.customerName?.toLowerCase().includes(term) ||
        order.id?.toLowerCase().includes(term) ||
        order.customerPhone?.toLowerCase().includes(term) ||
        order.customerAddress?.toLowerCase().includes(term)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(order => order.deliveryStatus === statusFilter);
    }
    
    // Apply date filter
    if (dateFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      switch (dateFilter) {
        case 'today':
          result = result.filter(order => order.createdAt >= today);
          break;
        case 'yesterday':
          result = result.filter(order => 
            order.createdAt >= yesterday && order.createdAt < today
          );
          break;
        case 'week':
          result = result.filter(order => order.createdAt >= weekStart);
          break;
        case 'month':
          result = result.filter(order => order.createdAt >= monthStart);
          break;
        default:
          break;
      }
    }
    
    setFilteredOrders(result);
  };
  
  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    setLoading(true);
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        deliveryStatus: newStatus,
        updatedAt: new Date()
      });
      
      // Update local state
      const updatedOrders = orders.map(order => {
        if (order.id === orderId) {
          return { ...order, deliveryStatus: newStatus };
        }
        return order;
      });
      
      setOrders(updatedOrders);
      applyFilters();
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Failed to update order status");
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle order details expansion
  const toggleOrderExpansion = (orderId) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
    }
  };
  
  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Get status description
  const getStatusDescription = (status) => {
    switch (status) {
      case 'pending':
        return 'Assigning delivery agent';
      case 'processing':
        return 'Processing, Being packed, Delivery in 15 min';
      case 'shipped':
        return 'Picked Up';
      case 'out_for_delivery':
        return 'Out for delivery, arriving in 10 min';
      case 'completed':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Status unknown';
    }
  };
  
  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f59e0b'; // Amber
      case 'processing':
        return '#3b82f6'; // Blue
      case 'shipped':
        return '#8b5cf6'; // Purple
      case 'out_for_delivery':
        return '#10b981'; // Emerald
      case 'completed':
        return '#22c55e'; // Green
      case 'cancelled':
        return '#ef4444'; // Red
      default:
        return '#6b7280'; // Gray
    }
  };
  
  return (
    <div className="dashboard-container">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Loading orders...</p>
          </div>
        </div>
      )}
      
      <div className="dashboard-header">
        <div className="header-title-section">
          <h1 className="dashboard-title">Order Dashboard</h1>
          <p className="dashboard-subtitle">
            Manage and track all customer orders
          </p>
        </div>
        
        <div className="header-actions">
          <button className="refresh-button" onClick={loadOrders}>
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
          
          <div className="view-toggle">
            <button 
              className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button 
              className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
        </div>
      </div>
      
      {/* Controls Section - Fixed at top */}
      <div className="controls-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by customer, order ID, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              className="clear-button" 
              onClick={() => setSearchTerm('')}
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        <div className="filter-controls">
          {/* Status Filter */}
          <div className="filter-dropdown">
            <button 
              className="filter-button"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            >
              <Filter size={16} />
              <span>Status: {statusFilter === 'all' ? 'All' : statusOptions.find(opt => opt.value === statusFilter)?.label}</span>
              <ChevronDown size={16} />
            </button>
            
            {showStatusDropdown && (
              <div className="dropdown-menu">
                <button
                  className={`dropdown-item ${statusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setStatusFilter('all');
                    setShowStatusDropdown(false);
                  }}
                >
                  All Statuses
                  {statusFilter === 'all' && <Check size={16} />}
                </button>
                
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`dropdown-item ${statusFilter === option.value ? 'active' : ''}`}
                    onClick={() => {
                      setStatusFilter(option.value);
                      setShowStatusDropdown(false);
                    }}
                  >
                    {option.label}
                    {statusFilter === option.value && <Check size={16} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Date Filter */}
          <select
            className="date-filter"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            {dateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Clear Filters Button */}
          {(searchTerm || statusFilter !== 'all' || dateFilter !== 'all') && (
            <button 
              className="clear-all-button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDateFilter('all');
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
      
      {/* Dashboard Stats */}
      <div className="dashboard-stats">
        {statusOptions.map(status => {
          const count = orders.filter(order => order.deliveryStatus === status.value).length;
          return (
            <div 
              key={status.value} 
              className="stat-card"
              style={{ borderColor: getStatusColor(status.value) }}
              onClick={() => setStatusFilter(status.value === statusFilter ? 'all' : status.value)}
            >
              <h3 className="stat-title" style={{ color: getStatusColor(status.value) }}>{status.label}</h3>
              <p className="stat-value">{count}</p>
            </div>
          );
        })}
        <div className="stat-card">
          <h3 className="stat-title">Total Orders</h3>
          <p className="stat-value">{orders.length}</p>
        </div>
      </div>
      
      {/* Orders List/Grid */}
      <div className={`orders-container ${viewMode}`}>
        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={48} />
            <p>No orders found</p>
            {(searchTerm || statusFilter !== 'all' || dateFilter !== 'all') && (
              <button 
                className="clear-filters-button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setDateFilter('all');
                }}
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className={`orders-${viewMode}`}>
            {filteredOrders.map((order) => (
              <div 
                key={order.id} 
                className={`order-card ${expandedOrderId === order.id ? 'expanded' : ''}`}
                onClick={() => toggleOrderExpansion(order.id)}
              >
                <div className="order-header">
                  <div 
                    className="status-indicator"
                    style={{ backgroundColor: getStatusColor(order.deliveryStatus) }}
                  ></div>
                  
                  <div className="order-basic-info">
                    <div className="order-id">
                      #{order.id.substring(0, 8)}
                      <span className="order-date">{formatDate(order.createdAt)}</span>
                    </div>
                    
                    <div className="order-status">
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(order.deliveryStatus) }}
                      >
                        {statusOptions.find(opt => opt.value === order.deliveryStatus)?.label || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="customer-info">
                    <div className="customer-name">{order.customerName}</div>
                    <div className="customer-phone">{order.customerPhone}</div>
                  </div>
                  
                  <div className="order-summary">
                    <div className="order-items-count">{order.items?.length || 0} items</div>
                    <div className="order-total">${order.totalAmount?.toFixed(2) || '0.00'}</div>
                  </div>
                  
                  <button className="expand-button">
                    <ChevronDown 
                      size={20} 
                      className={`expand-icon ${expandedOrderId === order.id ? 'rotated' : ''}`}
                    />
                  </button>
                </div>
                
                {expandedOrderId === order.id && (
                  <div className="order-details">
                    <div className="details-grid">
                      <div className="detail-section customer-details">
                        <h4>Customer Information</h4>
                        <div className="detail-row">
                          <span className="detail-label">Name:</span>
                          <span className="detail-value">{order.customerName}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Phone:</span>
                          <span className="detail-value">{order.customerPhone}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Address:</span>
                          <span className="detail-value">{order.customerAddress}</span>
                        </div>
                      </div>
                      
                      <div className="detail-section payment-details">
                        <h4>Payment Information</h4>
                        <div className="detail-row">
                          <span className="detail-label">Method:</span>
                          <span className="detail-value">{order.paymentMethod || 'Not specified'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Status:</span>
                          <span className="detail-value payment-status">
                            {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Total:</span>
                          <span className="detail-value">${order.totalAmount?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                      
                      <div className="detail-section delivery-details">
                        <h4>Delivery Information</h4>
                        <div className="detail-row">
                          <span className="detail-label">Status:</span>
                          <span className="detail-value">{getStatusDescription(order.deliveryStatus)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Order Date:</span>
                          <span className="detail-value">{formatDate(order.createdAt)}</span>
                        </div>
                      </div>
                      
                      <div className="detail-section order-items">
                        <h4>Order Items</h4>
                        <div className="items-list">
                          {order.items?.map((item, index) => (
                            <div key={index} className="item-row">
                              <span className="item-name">{item.name}</span>
                              <div className="item-details">
                                <span className="item-quantity">x{item.quantity}</span>
                                <span className="item-price">${(item.price * (item.quantity || 1)).toFixed(2)}</span>
                              </div>
                            </div>
                          )) || <p>No items found</p>}
                        </div>
                        
                        <div className="order-totals">
                          <div className="total-row">
                            <span>Subtotal</span>
                            <span>${order.subtotal?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div className="total-row">
                            <span>Delivery Fee</span>
                            <span>${order.deliveryFee?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div className="total-row total">
                            <span>Total</span>
                            <span>${order.totalAmount?.toFixed(2) || '0.00'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="update-status-section">
                      <h4>Update Order Status</h4>
                      <div className="status-buttons">
                        {statusOptions.map((option) => (
                          <button
                            key={option.value}
                            className={`status-button ${order.deliveryStatus === option.value ? 'active' : ''}`}
                            style={{ 
                              backgroundColor: order.deliveryStatus === option.value ? getStatusColor(option.value) : 'transparent',
                              color: order.deliveryStatus === option.value ? '#fff' : getStatusColor(option.value),
                              borderColor: getStatusColor(option.value)
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateOrderStatus(order.id, option.value);
                            }}
                            disabled={order.deliveryStatus === option.value}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}