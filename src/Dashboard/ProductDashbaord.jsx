import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  ShoppingBag, 
  Package, 
  AlertTriangle, 
  Truck, 
  Search, 
  Filter, 
  RefreshCw, 
  Eye, 
  Edit, 
  Save, 
  Tag, 
  CheckCircle, 
  XCircle 
} from 'lucide-react';
import { collection, getDocs, updateDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config';
import '../styles/ProductDashboard.css';

export default function ProductDashboard() {
  // State management
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    inStock: 0,
    outOfStock: 0,
    featured: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [categories, setCategories] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Load products on component mount
  useEffect(() => {
    loadProducts();
  }, [sortBy, sortDirection]);

  // Load products from Firebase
  const loadProducts = async () => {
    setLoading(true);
    try {
      // Create query with optional sorting
      const productsRef = collection(db, "products");
      let productsQuery;
      
      if (sortBy === 'price') {
        productsQuery = query(productsRef, orderBy('price', sortDirection));
      } else if (sortBy === 'name') {
        productsQuery = query(productsRef, orderBy('name', sortDirection));
      } else if (sortBy === 'createdAt') {
        productsQuery = query(productsRef, orderBy('createdAt', sortDirection));
      } else {
        productsQuery = productsRef;
      }
      
      const productsSnapshot = await getDocs(productsQuery);
      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Extract unique categories
      const uniqueCategories = [...new Set(productsData.map(product => product.category))];
      setCategories(uniqueCategories);
      
      // Calculate stats
      const statsData = {
        total: productsData.length,
        inStock: productsData.filter(product => product.inStock).length,
        outOfStock: productsData.filter(product => !product.inStock).length,
        featured: productsData.filter(product => product.isFeatured).length
      };
      
      setProducts(productsData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading products:", error);
      alert("Failed to load products from the database");
    } finally {
      setLoading(false);
    }
  };

  // Toggle sort direction
  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  // Filter products by search term and category
  const filteredProducts = products.filter(product => {
    // Filter by category
    if (filterCategory !== 'All' && product.category !== filterCategory) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      return (
        product.name.toLowerCase().includes(searchLower) || 
        (product.description && product.description.toLowerCase().includes(searchLower)) ||
        (product.tags && product.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      );
    }
    
    return true;
  });

  // Toggle product availability
  const toggleAvailability = async (product) => {
    try {
      const newStatus = !product.inStock;
      
      // Update in Firebase
      await updateDoc(doc(db, "products", product.id), {
        inStock: newStatus,
        updatedAt: new Date()
      });
      
      // Update local state
      setProducts(products.map(p => 
        p.id === product.id ? { ...p, inStock: newStatus } : p
      ));
      
      // Update stats
      setStats({
        ...stats,
        inStock: newStatus ? stats.inStock + 1 : stats.inStock - 1,
        outOfStock: !newStatus ? stats.outOfStock + 1 : stats.outOfStock - 1
      });
      
    } catch (error) {
      console.error("Error updating product availability:", error);
      alert("Failed to update product availability");
    }
  };

  // Toggle featured status
  const toggleFeatured = async (product) => {
    try {
      const newStatus = !product.isFeatured;
      
      // Update in Firebase
      await updateDoc(doc(db, "products", product.id), {
        isFeatured: newStatus,
        updatedAt: new Date()
      });
      
      // Update local state
      setProducts(products.map(p => 
        p.id === product.id ? { ...p, isFeatured: newStatus } : p
      ));
      
      // Update stats
      setStats({
        ...stats,
        featured: newStatus ? stats.featured + 1 : stats.featured - 1
      });
      
    } catch (error) {
      console.error("Error updating featured status:", error);
      alert("Failed to update featured status");
    }
  };

  // Start editing a product (quick edit mode)
  const startEdit = (product) => {
    setEditingProduct({
      ...product,
      tempPrice: product.price.toString(),
      tempDiscountPrice: product.discountPrice ? product.discountPrice.toString() : ''
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingProduct(null);
  };

  // Save edited product
  const saveEdit = async () => {
    try {
      if (!editingProduct) return;
      
      // Validate price
      const price = parseFloat(editingProduct.tempPrice);
      if (isNaN(price) || price <= 0) {
        alert("Please enter a valid price");
        return;
      }
      
      // Check discount price if provided
      let discountPrice = null;
      if (editingProduct.tempDiscountPrice.trim()) {
        discountPrice = parseFloat(editingProduct.tempDiscountPrice);
        if (isNaN(discountPrice) || discountPrice <= 0) {
          alert("Please enter a valid discount price");
          return;
        }
      }
      
      // Prepare update data
      const updateData = {
        name: editingProduct.name,
        price: price,
        inStock: editingProduct.inStock,
        isFeatured: editingProduct.isFeatured,
        updatedAt: new Date()
      };
      
      if (discountPrice) {
        updateData.discountPrice = discountPrice;
      } else {
        // Remove discount price if empty
        // Firebase doesn't support directly setting fields to undefined
        // We would need to use a different approach to completely remove the field
        updateData.discountPrice = null;
      }
      
      // Update in Firebase
      await updateDoc(doc(db, "products", editingProduct.id), updateData);
      
      // Update local state
      setProducts(products.map(p => 
        p.id === editingProduct.id ? { 
          ...p, 
          name: editingProduct.name,
          price: price,
          discountPrice: discountPrice,
          inStock: editingProduct.inStock,
          isFeatured: editingProduct.isFeatured
        } : p
      ));
      
      // Clear editing state
      setEditingProduct(null);
      
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Failed to save product changes");
    }
  };

  // Toggle product selection for bulk actions
  const toggleProductSelection = (productId) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  // Toggle all products selection
  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  // Bulk update availability
  const bulkUpdateAvailability = async (makeAvailable) => {
    if (selectedProducts.length === 0) return;
    
    try {
      setLoading(true);
      
      // Update each selected product
      for (const productId of selectedProducts) {
        await updateDoc(doc(db, "products", productId), {
          inStock: makeAvailable,
          updatedAt: new Date()
        });
      }
      
      // Update local state
      setProducts(products.map(p => 
        selectedProducts.includes(p.id) ? { ...p, inStock: makeAvailable } : p
      ));
      
      // Update stats
      if (makeAvailable) {
        const changedCount = selectedProducts.filter(id => 
          products.find(p => p.id === id && !p.inStock)
        ).length;
        
        setStats({
          ...stats,
          inStock: stats.inStock + changedCount,
          outOfStock: stats.outOfStock - changedCount
        });
      } else {
        const changedCount = selectedProducts.filter(id => 
          products.find(p => p.id === id && p.inStock)
        ).length;
        
        setStats({
          ...stats,
          inStock: stats.inStock - changedCount,
          outOfStock: stats.outOfStock + changedCount
        });
      }
      
      // Clear selection
      setSelectedProducts([]);
      setBulkEditMode(false);
      
    } catch (error) {
      console.error("Error updating products:", error);
      alert("Failed to update some products");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      )}
      
      <div className="dashboard-header">
        <h1 className="dashboard-title">Product Dashboard</h1>
        <div className="dashboard-actions">
          <button className="refresh-button" onClick={loadProducts}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button 
            className={`bulk-edit-button ${bulkEditMode ? 'active' : ''}`} 
            onClick={() => setBulkEditMode(!bulkEditMode)}
          >
            {bulkEditMode ? 'Exit Bulk Edit' : 'Bulk Edit'}
          </button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon total">
            <Package size={24} />
          </div>
          <div className="stat-info">
            <h3>Total Products</h3>
            <p className="stat-value">{stats.total}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon available">
            <ShoppingBag size={24} />
          </div>
          <div className="stat-info">
            <h3>In Stock</h3>
            <p className="stat-value">{stats.inStock}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon unavailable">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-info">
            <h3>Out of Stock</h3>
            <p className="stat-value">{stats.outOfStock}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon featured">
            <Tag size={24} />
          </div>
          <div className="stat-info">
            <h3>Featured</h3>
            <p className="stat-value">{stats.featured}</p>
          </div>
        </div>
      </div>
      
      {/* Search and Filter */}
      <div className="dashboard-tools">
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-section">
          <div className="filter-dropdown">
            <button 
              className="filter-button"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
            >
              <Filter size={18} />
              {filterCategory}
            </button>
            
            {showFilterMenu && (
              <div className="filter-menu">
                <button 
                  className={`filter-option ${filterCategory === 'All' ? 'active' : ''}`}
                  onClick={() => {
                    setFilterCategory('All');
                    setShowFilterMenu(false);
                  }}
                >
                  All Categories
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    className={`filter-option ${filterCategory === category ? 'active' : ''}`}
                    onClick={() => {
                      setFilterCategory(category);
                      setShowFilterMenu(false);
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="sort-controls">
            <span>Sort by:</span>
            <button 
              className={`sort-button ${sortBy === 'name' ? 'active' : ''}`}
              onClick={() => toggleSort('name')}
            >
              Name {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              className={`sort-button ${sortBy === 'price' ? 'active' : ''}`}
              onClick={() => toggleSort('price')}
            >
              Price {sortBy === 'price' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>
      </div>
      
      {/* Bulk Edit Controls */}
      {bulkEditMode && selectedProducts.length > 0 && (
        <div className="bulk-edit-controls">
          <span className="selected-count">{selectedProducts.length} products selected</span>
          <div className="bulk-actions">
            <button 
              className="bulk-action-button make-available"
              onClick={() => bulkUpdateAvailability(true)}
            >
              <CheckCircle size={16} />
              Mark In Stock
            </button>
            <button 
              className="bulk-action-button make-unavailable"
              onClick={() => bulkUpdateAvailability(false)}
            >
              <XCircle size={16} />
              Mark Out of Stock
            </button>
          </div>
        </div>
      )}
      
      {/* Products Table */}
      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              {bulkEditMode && (
                <th className="checkbox-cell">
                  <input 
                    type="checkbox" 
                    checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0} 
                    onChange={toggleSelectAll}
                  />
                </th>
              )}
              <th className="image-cell">Image</th>
              <th className="name-cell">Product Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th>Featured</th>
              <th className="actions-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={bulkEditMode ? 8 : 7} className="no-products">
                  No products found
                </td>
              </tr>
            ) : (
              filteredProducts.map(product => (
                editingProduct && editingProduct.id === product.id ? (
                  // Edit mode row
                  <tr key={product.id} className="editing-row">
                    {bulkEditMode && <td></td>}
                    <td className="image-cell">
                      <img src={product.image} alt={product.name} className="product-image" />
                    </td>
                    <td className="name-cell">
                      <input 
                        type="text" 
                        className="edit-input name-input" 
                        value={editingProduct.name}
                        onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                      />
                    </td>
                    <td>{product.category}</td>
                    <td className="price-cell">
                      <div className="price-inputs">
                        <div className="input-group">
                          <label>Price:</label>
                          <input 
                            type="text" 
                            className="edit-input price-input" 
                            value={editingProduct.tempPrice}
                            onChange={(e) => setEditingProduct({...editingProduct, tempPrice: e.target.value})}
                          />
                        </div>
                        <div className="input-group">
                          <label>Discount:</label>
                          <input 
                            type="text" 
                            className="edit-input discount-input" 
                            value={editingProduct.tempDiscountPrice}
                            onChange={(e) => setEditingProduct({...editingProduct, tempDiscountPrice: e.target.value})}
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <select 
                        className="status-select" 
                        value={editingProduct.inStock ? "instock" : "outofstock"}
                        onChange={(e) => setEditingProduct({
                          ...editingProduct, 
                          inStock: e.target.value === "instock"
                        })}
                      >
                        <option value="instock">In Stock</option>
                        <option value="outofstock">Out of Stock</option>
                      </select>
                    </td>
                    <td>
                      <select 
                        className="featured-select" 
                        value={editingProduct.isFeatured ? "featured" : "regular"}
                        onChange={(e) => setEditingProduct({
                          ...editingProduct, 
                          isFeatured: e.target.value === "featured"
                        })}
                      >
                        <option value="featured">Featured</option>
                        <option value="regular">Regular</option>
                      </select>
                    </td>
                    <td className="editing-actions">
                      <button className="save-edit-button" onClick={saveEdit}>
                        <Save size={16} />
                        Save
                      </button>
                      <button className="cancel-edit-button" onClick={cancelEdit}>Cancel</button>
                    </td>
                  </tr>
                ) : (
                  // Normal row
                  <tr key={product.id}>
                    {bulkEditMode && (
                      <td className="checkbox-cell">
                        <input 
                          type="checkbox" 
                          checked={selectedProducts.includes(product.id)} 
                          onChange={() => toggleProductSelection(product.id)}
                        />
                      </td>
                    )}
                    <td className="image-cell">
                      <img src={product.image} alt={product.name} className="product-image" />
                    </td>
                    <td className="name-cell">
                      <div className="product-name">{product.name}</div>
                      <div className="product-weight">{product.weight}</div>
                    </td>
                    <td>{product.category}</td>
                    <td className="price-info">
                      {product.discountPrice ? (
                        <>
                          <span className="discount-price">${product.discountPrice.toFixed(2)}</span>
                          <span className="original-price">${product.price.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="regular-price">${product.price.toFixed(2)}</span>
                      )}
                    </td>
                    <td>
                      <button 
                        className={`status-toggle ${product.inStock ? 'in-stock' : 'out-of-stock'}`}
                        onClick={() => toggleAvailability(product)}
                      >
                        {product.inStock ? 'In Stock' : 'Out of Stock'}
                      </button>
                    </td>
                    <td>
                      <button 
                        className={`featured-toggle ${product.isFeatured ? 'featured' : 'not-featured'}`}
                        onClick={() => toggleFeatured(product)}
                      >
                        {product.isFeatured ? 'Featured' : 'Regular'}
                      </button>
                    </td>
                    <td className="actions-cell">
                      <button className="view-button" onClick={() => window.location.href = `/product/${product.id}`}>
                        <Eye size={16} />
                      </button>
                      <button className="edit-button" onClick={() => startEdit(product)}>
                        <Edit size={16} />
                      </button>
                      <button className="edit-full-button" onClick={() => window.location.href = `/edit-product/${product.id}`}>
                        Full Edit
                      </button>
                    </td>
                  </tr>
                )
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}