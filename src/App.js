import { BrowserRouter as Router, Route, Routes, Navigate, Link } from 'react-router-dom';
import ProductInputForm from './Forms/ProductInputForm';
import OrderDashboard from './Dashboard/OrderDashboard';
import NotificationAdmin from './Notification/NotificationAdmin';
import ProductDashboard from './Dashboard/ProductDashbaord';
import './styles/Navbar.css'; // Import the external CSS file

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">Admin Panel</div>
        <div className="navbar-links">
          <Link to="/" className="nav-link">
            Product Input
          </Link>
          <Link to="/pro" className="nav-link">
            Orders
          </Link>
          <Link to="/Not" className="nav-link">
            Notifications
          </Link>
          <Link to="/dash" className="nav-link">
            Products
          </Link>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <div >
          <Routes>
            <Route path="/" element={<ProductInputForm />} />
            <Route path="/pro" element={<OrderDashboard />} />
            <Route path="/Not" element={<NotificationAdmin />} />
            <Route path="/dash" element={<ProductDashboard />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;