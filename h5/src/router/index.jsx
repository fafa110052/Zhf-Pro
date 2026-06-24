import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import AuthGuard from '../components/AuthGuard';
import Home from '../pages/Home';
import Category from '../pages/Category';
import WorkDetail from '../pages/WorkDetail';
import Login from '../pages/Login';
import Mine from '../pages/Mine';
import WorkManage from '../pages/WorkManage';
import WorkUpload from '../pages/WorkUpload';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'category', element: <Category /> },
      { path: 'work/:id', element: <WorkDetail /> },
      { path: 'login', element: <Login /> },
      { path: 'mine', element: <Mine /> },
      {
        path: 'work-manage',
        element: (
          <AuthGuard requireRole="designer">
            <WorkManage />
          </AuthGuard>
        ),
      },
      {
        path: 'work-upload',
        element: (
          <AuthGuard requireRole="designer">
            <WorkUpload />
          </AuthGuard>
        ),
      },
      {
        path: 'work-upload/:id',
        element: (
          <AuthGuard requireRole="designer">
            <WorkUpload />
          </AuthGuard>
        ),
      },
    ],
  },
]);

export default router;
