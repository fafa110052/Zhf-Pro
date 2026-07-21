import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedLayout from '../components/ProtectedLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Works from '../pages/Works';
import Designers from '../pages/Designers';
import Images from '../pages/Images';
import Categories from '../pages/Categories';
import Settings from '../pages/Settings';
import AvatarReviews from '../pages/AvatarReviews';
import Properties from '../pages/Properties';
import MaterialCategories from '../pages/MaterialCategories';
import Materials from '../pages/Materials';
import MaterialOrders from '../pages/MaterialOrders';
import MaterialOrderDetail from '../pages/MaterialOrderDetail';
import MeasurementAppointments from '../pages/MeasurementAppointments';
import LotteryConfig from '../pages/LotteryConfig';
import OperationData from '../pages/OperationData';
import Reports from '../pages/Reports';
import StyleWizardStyles from '../pages/StyleWizardStyles';
import StyleWizardCategories from '../pages/StyleWizardCategories';
import StyleWizardMaterials from '../pages/StyleWizardMaterials';
import StyleWizardDoors from '../pages/StyleWizardDoors';
import StyleWizardBathroomDoors from '../pages/StyleWizardBathroomDoors';
import StyleWizardLighting from '../pages/StyleWizardLighting';
import StyleWizardOrders from '../pages/StyleWizardOrders';

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
      { path: 'accounts', element: <Navigate to="/designers" replace /> },
      { path: 'settings', element: <Settings /> },
      { path: 'avatar-reviews', element: <AvatarReviews /> },
      { path: 'properties', element: <Properties /> },
      { path: 'material-categories', element: <MaterialCategories /> },
      { path: 'materials', element: <Materials /> },
      { path: 'material-orders', element: <MaterialOrders /> },
      { path: 'material-orders/:orderNo', element: <MaterialOrderDetail /> },
      { path: 'measurement-appointments', element: <MeasurementAppointments /> },
      { path: 'lottery', element: <LotteryConfig /> },
      { path: 'operation-data', element: <OperationData /> },
      { path: 'style-wizard/styles', element: <StyleWizardStyles /> },
      { path: 'style-wizard/categories', element: <StyleWizardCategories /> },
      { path: 'style-wizard/materials/2', element: <StyleWizardDoors /> },
      { path: 'style-wizard/bathroom-doors', element: <StyleWizardBathroomDoors /> },
      { path: 'style-wizard/materials/7', element: <StyleWizardLighting /> },
      { path: 'style-wizard/materials/:categoryId', element: <StyleWizardMaterials /> },
      { path: 'style-wizard/materials', element: <StyleWizardMaterials /> },
      { path: 'style-wizard/doors', element: <Navigate to="/style-wizard/materials/2" replace /> },
      { path: 'style-wizard/lighting', element: <Navigate to="/style-wizard/materials/7" replace /> },
      { path: 'style-wizard/orders', element: <StyleWizardOrders /> },
      { path: 'reports', element: <Reports /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
], { basename: '/admin' });

export default router;
