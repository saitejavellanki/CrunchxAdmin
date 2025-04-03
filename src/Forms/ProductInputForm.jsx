import React, { useState, useEffect } from 'react';
import { ChevronDown, X, Plus, Upload, Check, Search, Filter, RefreshCw, Save, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Import the Firebase configuration
import { app, db } from '../config';
import '../styles/ProductInputForm.css';

// Initialize Firebase Storage
const storage = getStorage(app);

// Predefined categories
const CATEGORIES = ["Fruits", "Nuts", "Beverages", "Mixed Options"];

// Predefined nutrition units
const NUTRITION_UNITS = ["g", "mg", "mcg", "IU", "%"];

export default function ProductInputForm() {
  // Product form state
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productDiscountPrice, setProductDiscountPrice] = useState('');
  const [productWeight, setProductWeight] = useState('');
  const [productDeliveryTime, setProductDeliveryTime] = useState('10 min');
  const [productDescription, setProductDescription] = useState('');
  const [productImage, setProductImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [productTags, setProductTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [isInStock, setIsInStock] = useState(true);
  const [isPopular, setIsPopular] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  
  // Nutrition facts
  const [nutritionFacts, setNutritionFacts] = useState([
    { name: 'Calories', value: '', unit: 'kcal' },
    { name: 'Protein', value: '', unit: 'g' },
    { name: 'Carbs', value: '', unit: 'g' },
    { name: 'Fat', value: '', unit: 'g' },
  ]);
  const [showNutritionSection, setShowNutritionSection] = useState(false);
  
  // Dropdowns
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Product management
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // For editing
  const [editMode, setEditMode] = useState(false);
  const [currentProductId, setCurrentProductId] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Bulk operations
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Load data from Firebase when component mounts
  useEffect(() => {
    loadProducts();
  }, []);

  // Load products from Firebase
  const loadProducts = async () => {
    setLoading(true);
    try {
      // Create a query with optional sorting
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
      
      setProducts(productsData);
    } catch (error) {
      console.error("Error loading products:", error);
      alert("Failed to load products from the database");
    } finally {
      setLoading(false);
    }
  };

  // Handle image selection
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setProductImage(URL.createObjectURL(file));
    }
  };

  // Upload image to Firebase Storage and get URL
  const uploadImage = async (file) => {
    const filename = `${Date.now()}-${file.name}`;
    const storageRef = ref(storage, `product-images/${filename}`);
    
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // Add a new product or update existing
  const saveProduct = async () => {
    // Validate form
    if (!productName.trim()) {
      alert('Product name is required');
      return;
    }
    
    if (!productPrice.trim() || isNaN(parseFloat(productPrice))) {
      alert('Valid price is required');
      return;
    }
    
    if (productDiscountPrice && isNaN(parseFloat(productDiscountPrice))) {
      alert('Discount price must be a valid number');
      return;
    }
    
    if (!productWeight.trim()) {
      alert('Weight/quantity is required');
      return;
    }
    
    if (!imageFile && !editMode) {
      alert('Product image is required');
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Prepare nutrition facts - filter out empty values
      const filteredNutritionFacts = nutritionFacts.filter(fact => fact.value !== '');
      
      // Create product data object
      let productData = {
        name: productName,
        price: parseFloat(productPrice),
        weight: productWeight,
        deliveryTime: productDeliveryTime,
        category: selectedCategory,
        description: productDescription,
        tags: productTags,
        inStock: isInStock,
        isPopular: isPopular,
        isFeatured: isFeatured,
        nutritionFacts: filteredNutritionFacts,
        updatedAt: new Date()
      };
      
      // Add discount price if available
      if (productDiscountPrice) {
        productData.discountPrice = parseFloat(productDiscountPrice);
      }
      
      // Handle image upload for new products or when image is updated
      if (imageFile) {
        const imageUrl = await uploadImage(imageFile);
        productData.image = imageUrl;
      }
      
      if (editMode && currentProductId) {
        // Update existing product
        await updateDoc(doc(db, "products", currentProductId), productData);
        
        // Update local state
        setProducts(products.map(product => 
          product.id === currentProductId ? { ...product, ...productData } : product
        ));
        
        alert('Product updated successfully');
      } else {
        // Add createdAt for new products
        productData.createdAt = new Date();
        
        // Add to Firestore
        const productRef = await addDoc(collection(db, "products"), productData);
        
        // Update local state with the new image
        setProducts([...products, { id: productRef.id, ...productData }]);
        
        alert('Product added successfully');
      }
      
      // Reset form
      resetForm();
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Failed to save product to the database");
    } finally {
      setIsUploading(false);
    }
  };

  // Reset form fields
  const resetForm = () => {
    setProductName('');
    setProductPrice('');
    setProductDiscountPrice('');
    setProductWeight('');
    setProductDeliveryTime('10 min');
    setProductDescription('');
    setProductImage(null);
    setImageFile(null);
    setProductTags([]);
    setIsInStock(true);
    setIsPopular(false);
    setIsFeatured(false);
    setNutritionFacts([
      { name: 'Calories', value: '', unit: 'kcal' },
      { name: 'Protein', value: '', unit: 'g' },
      { name: 'Carbs', value: '', unit: 'g' },
      { name: 'Fat', value: '', unit: 'g' },
    ]);
    setShowNutritionSection(false);
    setEditMode(false);
    setCurrentProductId(null);
  };

  // Delete a product
  const deleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      setLoading(true);
      
      // Delete from Firestore
      await deleteDoc(doc(db, "products", productId));
      
      // Update local state
      setProducts(products.filter(product => product.id !== productId));
      
      // If the deleted product was being edited, reset the form
      if (currentProductId === productId) {
        resetForm();
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product from the database");
    } finally {
      setLoading(false);
    }
  };

  // Edit a product
  const editProduct = (product) => {
    setEditMode(true);
    setCurrentProductId(product.id);
    setProductName(product.name);
    setProductPrice(product.price.toString());
    setProductDiscountPrice(product.discountPrice ? product.discountPrice.toString() : '');
    setProductWeight(product.weight);
    setProductDeliveryTime(product.deliveryTime);
    setSelectedCategory(product.category);
    setProductDescription(product.description || '');
    setProductImage(product.image);
    setImageFile(null); // Don't need to upload again unless changed
    setProductTags(product.tags || []);
    setIsInStock(product.inStock !== undefined ? product.inStock : true);
    setIsPopular(product.isPopular || false);
    setIsFeatured(product.isFeatured || false);
    
    // Set nutrition facts or default empty ones
    if (product.nutritionFacts && product.nutritionFacts.length > 0) {
      setNutritionFacts(product.nutritionFacts);
      setShowNutritionSection(true);
    } else {
      setNutritionFacts([
        { name: 'Calories', value: '', unit: 'kcal' },
        { name: 'Protein', value: '', unit: 'g' },
        { name: 'Carbs', value: '', unit: 'g' },
        { name: 'Fat', value: '', unit: 'g' },
      ]);
      setShowNutritionSection(false);
    }
    
    // Scroll to the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add a tag
  const addTag = () => {
    if (newTag.trim() && !productTags.includes(newTag.trim())) {
      setProductTags([...productTags, newTag.trim()]);
      setNewTag('');
    }
  };

  // Remove a tag
  const removeTag = (tagToRemove) => {
    setProductTags(productTags.filter(tag => tag !== tagToRemove));
  };

  // Add a nutrition fact
  const addNutritionFact = () => {
    setNutritionFacts([...nutritionFacts, { name: '', value: '', unit: 'g' }]);
  };

  // Update a nutrition fact
  const updateNutritionFact = (index, field, value) => {
    const updatedFacts = [...nutritionFacts];
    updatedFacts[index][field] = value;
    setNutritionFacts(updatedFacts);
  };

  // Remove a nutrition fact
  const removeNutritionFact = (index) => {
    const updatedFacts = [...nutritionFacts];
    updatedFacts.splice(index, 1);
    setNutritionFacts(updatedFacts);
  };

  // Handle bulk selection
  const toggleSelectProduct = (productId) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  // Handle select all
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(product => product.id));
    }
    setSelectAll(!selectAll);
  };

  // Delete selected products
  const deleteSelectedProducts = async () => {
    if (selectedProducts.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedProducts.length} selected products?`)) return;
    
    setLoading(true);
    
    try {
      // Delete each selected product
      for (const productId of selectedProducts) {
        await deleteDoc(doc(db, "products", productId));
      }
      
      // Update local state
      setProducts(products.filter(product => !selectedProducts.includes(product.id)));
      
      // Reset selection
      setSelectedProducts([]);
      setSelectAll(false);
      
      alert(`Successfully deleted ${selectedProducts.length} products`);
    } catch (error) {
      console.error("Error deleting products:", error);
      alert("Failed to delete some products");
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
    
    // Reload with new sorting
    loadProducts();
  };

  // Filter products by search term and category
  const filteredProducts = products
    .filter(product => {
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

  return (
    <div className="container">
      {(loading || isUploading) && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>{isUploading ? 'Uploading product...' : 'Loading...'}</p>
          </div>
        </div>
      )}
      
      <div className="header">
        <h1 className="title">{editMode ? 'Edit Product' : 'Add New Product'}</h1>
        <p className="subtitle">
          {editMode 
            ? `Editing product: ${productName}` 
            : 'Add products to your FitFuel app inventory'}
        </p>
      </div>
      
      {/* Product Form Section */}
      <div className="section">
        <div className="form-header">
          <h2 className="section-title">Product Details</h2>
          {editMode && (
            <button className="secondary-button" onClick={resetForm}>
              Cancel Edit
            </button>
          )}
        </div>
        
        <div className="form-row">
          {/* Left Column */}
          <div className="form-column">
            {/* Product Name */}
            <div className="input-group">
              <label className="input-label">Product Name*</label>
              <input
                className="text-input"
                placeholder="Enter product name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>
            
            {/* Category Dropdown */}
            <div className="input-group">
              <label className="input-label">Category*</label>
              <div className="dropdown-container">
                <button 
                  className="dropdown-button"
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  type="button"
                >
                  <span>{selectedCategory}</span>
                  <ChevronDown size={20} />
                </button>
                
                {showCategoryDropdown && (
                  <div className="dropdown-menu">
                    {CATEGORIES.map((category) => (
                      <button
                        key={category}
                        className="dropdown-item"
                        onClick={() => {
                          setSelectedCategory(category);
                          setShowCategoryDropdown(false);
                        }}
                        type="button"
                      >
                        <span>{category}</span>
                        {selectedCategory === category && (
                          <Check size={20} className="check-icon" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Price Row */}
            <div className="price-row">
              <div className="input-group">
                <label className="input-label">Price ($)*</label>
                <input
                  className="text-input"
                  placeholder="Regular price"
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                  type="number"
                  step="0.01"
                  min="0"
                />
              </div>
              
              <div className="input-group">
                <label className="input-label">Discount Price ($)</label>
                <input
                  className="text-input"
                  placeholder="Sale price (optional)"
                  value={productDiscountPrice}
                  onChange={(e) => setProductDiscountPrice(e.target.value)}
                  type="number"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            
            {/* Weight and Delivery Time */}
            <div className="price-row">
              <div className="input-group">
                <label className="input-label">Weight/Quantity*</label>
                <input
                  className="text-input"
                  placeholder="e.g. 250g, 6 pcs"
                  value={productWeight}
                  onChange={(e) => setProductWeight(e.target.value)}
                />
              </div>
              
              <div className="input-group">
                <label className="input-label">Delivery Time</label>
                <input
                  className="text-input"
                  placeholder="e.g. 10 min"
                  value={productDeliveryTime}
                  onChange={(e) => setProductDeliveryTime(e.target.value)}
                />
              </div>
            </div>
            
            {/* Description */}
            <div className="input-group">
              <label className="input-label">Description</label>
              <textarea
                className="text-area"
                placeholder="Enter product description"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                rows={4}
              />
            </div>
            
            {/* Tags */}
            <div className="input-group">
              <label className="input-label">Tags</label>
              <div className="tag-input-container">
                <input
                  className="tag-input"
                  placeholder="Add tags and press Enter"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <button 
                  className="tag-add-button" 
                  onClick={addTag}
                  type="button"
                >
                  <Plus size={20} />
                </button>
              </div>
              
              <div className="tags-container">
                {productTags.map((tag, index) => (
                  <div key={index} className="tag">
                    <span>{tag}</span>
                    <button 
                      className="tag-remove" 
                      onClick={() => removeTag(tag)}
                      type="button"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Product Options */}
            <div className="checkbox-group">
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="inStock"
                  checked={isInStock}
                  onChange={(e) => setIsInStock(e.target.checked)}
                />
                <label htmlFor="inStock">In Stock</label>
              </div>
              
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="isPopular"
                  checked={isPopular}
                  onChange={(e) => setIsPopular(e.target.checked)}
                />
                <label htmlFor="isPopular">Popular Item</label>
              </div>
              
              <div className="checkbox-item">
                <input
                  type="checkbox"
                  id="isFeatured"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                />
                <label htmlFor="isFeatured">Featured Item</label>
              </div>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="form-column">
            {/* Image Picker */}
            <div className="input-group">
              <label className="input-label">Product Image*</label>
              {productImage ? (
                <div className="image-preview-container">
                  <img src={productImage} alt="Product" className="image-preview" />
                  <label className="image-change-button">
                    Change Image
                    <input
                      type="file"
                      className="hidden-input"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              ) : (
                <label className="image-picker">
                  <Upload size={32} />
                  <span>Click to upload an image</span>
                  <input
                    type="file"
                    className="hidden-input"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
            
            {/* Nutrition Facts */}
            <div className="nutrition-section">
              <div className="nutrition-header">
                <h3 className="nutrition-title">Nutrition Facts</h3>
                <button 
                  className="toggle-button"
                  onClick={() => setShowNutritionSection(!showNutritionSection)}
                  type="button"
                >
                  {showNutritionSection ? <EyeOff size={20} /> : <Eye size={20} />}
                  {showNutritionSection ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {showNutritionSection && (
                <div className="nutrition-facts">
                  {nutritionFacts.map((fact, index) => (
                    <div key={index} className="nutrition-fact-row">
                      <input
                        className="nutrition-name"
                        placeholder="Name"
                        value={fact.name}
                        onChange={(e) => updateNutritionFact(index, 'name', e.target.value)}
                      />
                      <input
                        className="nutrition-value"
                        placeholder="Value"
                        value={fact.value}
                        onChange={(e) => updateNutritionFact(index, 'value', e.target.value)}
                        type="number"
                        min="0"
                        step="0.1"
                      />
                      <select
                        className="nutrition-unit"
                        value={fact.unit}
                        onChange={(e) => updateNutritionFact(index, 'unit', e.target.value)}
                      >
                        {NUTRITION_UNITS.map(unit => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                        <option value="kcal">kcal</option>
                      </select>
                      <button 
                        className="remove-nutrition-button"
                        onClick={() => removeNutritionFact(index)}
                        type="button"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  
                  <button 
                    className="add-nutrition-button"
                    onClick={addNutritionFact}
                    type="button"
                  >
                    <Plus size={16} />
                    Add Nutrition Item
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Submit Button */}
        <button
          className="save-button"
          onClick={saveProduct}
          disabled={isUploading}
          type="button"
        >
          <Save size={20} />
          {editMode ? 'Update Product' : 'Add Product'}
          {isUploading && <div className="button-spinner"></div>}
        </button>
      </div>
      
      {/* Manage Products Section */}
      <div className="section">
        <div className="product-header">
          <h2 className="section-title">Manage Products</h2>
          <div className="product-controls">
            <div className="view-toggle">
              <button 
                className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                type="button"
              >
                Grid
              </button>
              <button 
                className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                type="button"
              >
                List
              </button>
            </div>
            
            <button 
              className="refresh-button"
              onClick={loadProducts}
              type="button"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
        
        {/* Search and Filter */}
        <div className="search-filter-container">
          <div className="search-container">
            <Search size={20} className="search-icon" />
            <input
              className="search-input"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-container">
            <button 
              className="filter-button"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              type="button"
            >
              <Filter size={20} />
              Filter: {filterCategory}
            </button>
            
            {showFilterDropdown && (
              <div className="dropdown-menu filter-menu">
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setFilterCategory('All');
                    setShowFilterDropdown(false);
                  }}
                >
                  <span>All</span>
                  {filterCategory === 'All' && (
                    <Check size={20} className="check-icon" />
                  )}
                </button>
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    className="dropdown-item"
                    onClick={() => {
                      setFilterCategory(category);
                      setShowFilterDropdown(false);
                    }}
                  >
                    <span>{category}</span>
                    {filterCategory === category && (
                      <Check size={20} className="check-icon" />
                    )}
                  </button>
                ))}
              </div>
            )}
            
            <div className="sort-container">
              <span className="sort-label">Sort by:</span>
              <button 
                className={`sort-button ${sortBy === 'name' ? 'active' : ''}`}
                onClick={() => toggleSort('name')}
                type="button"
              >
                Name {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                className={`sort-button ${sortBy === 'price' ? 'active' : ''}`}
                onClick={() => toggleSort('price')}
                type="button"
              >
                Price {sortBy === 'price' && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>
              <button 
                className={`sort-button ${sortBy === 'createdAt' ? 'active' : ''}`}
                onClick={() => toggleSort('createdAt')}
                type="button"
              >
                Date {sortBy === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>
        </div>
        
        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <div className="bulk-actions">
            <span className="selected-count">{selectedProducts.length} selected</span>
            <button 
              className="delete-selected-button"
              onClick={deleteSelectedProducts}
              type="button"
            >
              <Trash2 size={16} />
              Delete Selected
            </button>
          </div>
        )}
        
        {/* Product List */}
        {filteredProducts.length === 0 ? (
          <p className="empty-message">No products available</p>
        ) : viewMode === 'grid' ? (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <div key={product.id} className={`product-card ${selectedProducts.includes(product.id) ? 'selected' : ''}`}>
                <div className="product-selection">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => toggleSelectProduct(product.id)}
                  />
                </div>
                <div className="product-image-container">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="product-card-image" 
                  />
                  {product.discountPrice && (
                    <div className="discount-badge">Sale</div>
                  )}
                </div>
                <div className="product-card-content">
                  <h3 className="product-card-title">{product.name}</h3>
                  <div className="product-card-meta">
                    <span className="product-card-category">{product.category}</span>
                    <span className="product-card-weight">{product.weight}</span>
                  </div>
                  <div className="product-card-price">
                    {product.discountPrice ? (
                      <>
                        <span className="product-card-discount">${product.discountPrice.toFixed(2)}</span>
                        <span className="product-card-original">${product.price.toFixed(2)}</span>
                      </>
                    ) : (
                      <span className="product-card-regular">${product.price.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="product-card-tags">
                    {product.tags && product.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="product-card-tag">{tag}</span>
                    ))}
                    {product.tags && product.tags.length > 3 && (
                      <span className="product-card-tag-more">+{product.tags.length - 3}</span>
                    )}
                  </div>
                  <div className="product-card-flags">
                    {!product.inStock && <span className="out-of-stock-flag">Out of Stock</span>}
                    {product.isPopular && <span className="popular-flag">Popular</span>}
                    {product.isFeatured && <span className="featured-flag">Featured</span>}
                  </div>
                </div>
                <div className="product-card-actions">
                  <button
                    className="edit-button"
                    onClick={() => editProduct(product)}
                    type="button"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => deleteProduct(product.id)}
                    type="button"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="product-list">
            <div className="product-list-header">
              <div className="list-header-cell select-cell">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                />
              </div>
              <div className="list-header-cell image-cell">Image</div>
              <div className="list-header-cell name-cell">Name</div>
              <div className="list-header-cell category-cell">Category</div>
              <div className="list-header-cell price-cell">Price</div>
              <div className="list-header-cell stock-cell">Stock</div>
              <div className="list-header-cell actions-cell">Actions</div>
            </div>
            
            {filteredProducts.map((product) => (
              <div 
                key={product.id} 
                className={`product-list-row ${selectedProducts.includes(product.id) ? 'selected' : ''}`}
              >
                <div className="list-cell select-cell">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => toggleSelectProduct(product.id)}
                  />
                </div>
                <div className="list-cell image-cell">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="list-image" 
                  />
                  {product.discountPrice && (
                    <div className="list-discount-badge">Sale</div>
                  )}
                </div>
                <div className="list-cell name-cell">
                  <div className="list-name">{product.name}</div>
                  <div className="list-weight">{product.weight}</div>
                </div>
                <div className="list-cell category-cell">
                  <div className="list-category">{product.category}</div>
                  <div className="list-tags">
                    {product.tags && product.tags.slice(0, 2).map((tag, index) => (
                      <span key={index} className="list-tag">{tag}</span>
                    ))}
                    {product.tags && product.tags.length > 2 && (
                      <span className="list-tag-more">+{product.tags.length - 2}</span>
                    )}
                  </div>
                </div>
                <div className="list-cell price-cell">
                  {product.discountPrice ? (
                    <>
                      <div className="list-discount">${product.discountPrice.toFixed(2)}</div>
                      <div className="list-original">${product.price.toFixed(2)}</div>
                    </>
                  ) : (
                    <div className="list-price">${product.price.toFixed(2)}</div>
                  )}
                </div>
                <div className="list-cell stock-cell">
                  <div className={`stock-indicator ${product.inStock ? 'in-stock' : 'out-of-stock'}`}>
                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                  </div>
                  <div className="list-flags">
                    {product.isPopular && <span className="list-popular">Popular</span>}
                    {product.isFeatured && <span className="list-featured">Featured</span>}
                  </div>
                </div>
                <div className="list-cell actions-cell">
                  <button
                    className="list-edit-button"
                    onClick={() => editProduct(product)}
                    type="button"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className="list-delete-button"
                    onClick={() => deleteProduct(product.id)}
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination could go here in a future update */}
        
      </div>
    </div>
  );
}