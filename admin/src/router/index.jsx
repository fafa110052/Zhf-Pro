import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedLayout from '../components/ProtectedLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Works from '../pages/Works';
import Designers from '../pages/Designers';
import Images from '../pages/Images';
import Categories from '../pages/Categories';
import Accounts from '../pages/Accounts';
import Settings from '../pages/Settings';
import AvatarReviews from '../pages/AvatarReviews';
import Properties from '../pages/Properties';
import MaterialCategories from '../pages/MaterialCategories';
import Materials from '../pages/Materials';
import MaterialOrders from '../pages/MaterialOrders';

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'works', element: <Works /> },
      { path: 'designers', element: <Designers /> },
      { path: 'images', element: <Images /> },
      { path: 'categories', element: <Categories /> },
      { path: 'accounts', element: <Accounts /> },
      { path: 'settings', element: <Settings /> },
      { path: 'avatar-reviews', element: <AvatarReviews /> },
      { path: 'properties', element: <Properties /> },
      { path: 'material-categories', element: <MaterialCategories /> },
      { path: 'materials', element: <Materials /> },
      { path: 'material-orders', element: <MaterialOrders /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
], { basename: '/admin' });

export default router;
