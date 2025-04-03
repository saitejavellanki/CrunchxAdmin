import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import ProductInputForm from './Forms/ProductInputForm';
import OrderDashboard from './Dashboard/OrderDashboard';
import NotificationAdmin from './Notification/NotificationAdmin';



function App() {


  return (
    <Router>
     
      <Routes>
        
        <Route path="/" element={<ProductInputForm/>} />
        <Route path="/pro" element={<OrderDashboard/>} />
        <Route path="/Not" element={<NotificationAdmin/>} />
        
      </Routes>
    </Router>
  );
}

export default App;