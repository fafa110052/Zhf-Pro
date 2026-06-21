import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import Home from '../pages/Home';
import Category from '../pages/Category';
import WorkDetail from '../pages/WorkDetail';
import Login from '../pages/Login';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'category', element: <Category /> },
      { path: 'work/:id', element: <WorkDetail /> },
      { path: 'login', element: <Login /> },
    ],
  },
]);

export default router;
