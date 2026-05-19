import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import OwnerRoute from './OwnerRoute'
import StaffRoute from './StaffRoute'
import PublicRoute from './PublicRoute'

// Auth
import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'
import ForgotPassword from '../pages/auth/ForgotPassword'
import ResetPassword from '../pages/auth/ResetPassword'

// Owner
import Home from '../pages/owner/Home'
import BusinessDashboard from '../pages/owner/BusinessDashboard'
import BusinessForm from '../pages/owner/BusinessForm'
import BusinessSettings from '../pages/owner/BusinessSettings'
import MenuCategories from '../pages/owner/MenuCategories'
import MenuItems from '../pages/owner/MenuItems'
import ItemForm from '../pages/owner/ItemForm'
import Tables from '../pages/owner/Tables'
import Dashboard from '../pages/owner/Dashboard'
import OrdersList from '../pages/owner/OrdersList'
import OwnerProfile from '../pages/owner/OwnerProfile'
import AccessLinks from '../pages/owner/AccessLinks'
import Suppliers from '../pages/owner/Suppliers'
import Ingredients from '../pages/owner/Ingredients'
import RecipeForm from '../pages/owner/RecipeForm'
import StockMovements from '../pages/owner/StockMovements'
import PurchaseOrders from '../pages/owner/PurchaseOrders'

// Staff
import StaffLogin from '../pages/staff/StaffLogin'
import PDV from '../pages/staff/PDV'
import Checkout from '../pages/staff/Checkout'

// KDS
import KitchenDisplay from '../pages/kds/KitchenDisplay'

// Customer
import MenuReadOnly from '../pages/customer/MenuReadOnly'
import MenuOrder from '../pages/customer/MenuOrder'
import Cart from '../pages/customer/Cart'
import Identify from '../pages/customer/Identify'
import OrderStatus from '../pages/customer/OrderStatus'

// Public
import CounterDisplay from '../pages/public/CounterDisplay'
import Privacy from '../pages/public/Privacy'
import Terms from '../pages/public/Terms'

export default function AppRouter() {
  useAuth()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Owner */}
        <Route path="/owner/home" element={<OwnerRoute><Home /></OwnerRoute>} />
        <Route path="/owner/business/new" element={<OwnerRoute><BusinessForm /></OwnerRoute>} />
        <Route path="/owner/business/:id" element={<OwnerRoute><BusinessDashboard /></OwnerRoute>} />
        <Route path="/owner/business/:id/edit" element={<OwnerRoute><BusinessForm /></OwnerRoute>} />
        <Route path="/owner/business/:id/settings" element={<OwnerRoute><BusinessSettings /></OwnerRoute>} />
        <Route path="/owner/business/:id/menu" element={<OwnerRoute><MenuCategories /></OwnerRoute>} />
        <Route path="/owner/business/:id/menu/items" element={<OwnerRoute><MenuItems /></OwnerRoute>} />
        <Route path="/owner/business/:id/menu/items/new" element={<OwnerRoute><ItemForm /></OwnerRoute>} />
        <Route path="/owner/business/:id/menu/items/:itemId/edit" element={<OwnerRoute><ItemForm /></OwnerRoute>} />
        <Route path="/owner/business/:id/tables" element={<OwnerRoute><Tables /></OwnerRoute>} />
        <Route path="/owner/business/:id/dashboard" element={<OwnerRoute><Dashboard /></OwnerRoute>} />
        <Route path="/owner/business/:id/orders" element={<OwnerRoute><OrdersList /></OwnerRoute>} />
        <Route path="/owner/profile" element={<OwnerRoute><OwnerProfile /></OwnerRoute>} />
        <Route path="/owner/business/:id/access" element={<OwnerRoute><AccessLinks /></OwnerRoute>} />
        <Route path="/owner/business/:id/suppliers" element={<OwnerRoute><Suppliers /></OwnerRoute>} />
        <Route path="/owner/business/:id/stock/ingredients" element={<OwnerRoute><Ingredients /></OwnerRoute>} />
        <Route path="/owner/business/:id/menu/items/:itemId/recipe" element={<OwnerRoute><RecipeForm /></OwnerRoute>} />
        <Route path="/owner/business/:id/stock/movements" element={<OwnerRoute><StockMovements /></OwnerRoute>} />
        <Route path="/owner/business/:id/purchase-orders" element={<OwnerRoute><PurchaseOrders /></OwnerRoute>} />

        {/* Staff */}
        <Route path="/staff/login" element={<StaffLogin />} />
        <Route path="/staff/pdv" element={<StaffRoute><PDV /></StaffRoute>} />
        <Route path="/staff/checkout/:tableId" element={<StaffRoute><Checkout /></StaffRoute>} />

        {/* KDS */}
        <Route path="/kds/:businessId" element={<StaffRoute><KitchenDisplay /></StaffRoute>} />

        {/* Customer */}
        <Route path="/order/:businessSlug/table/:tableNumber" element={<MenuReadOnly />} />
        <Route path="/order/:businessSlug/counter" element={<MenuOrder />} />
        <Route path="/order/:businessSlug/cart" element={<Cart />} />
        <Route path="/order/:businessSlug/identify" element={<Identify />} />
        <Route path="/order/:businessSlug/status" element={<OrderStatus />} />

        {/* Public */}
        <Route path="/display/:businessSlug" element={<CounterDisplay />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
      </Routes>
    </BrowserRouter>
  )
}
