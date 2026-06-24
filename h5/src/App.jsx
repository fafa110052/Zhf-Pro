import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import ZoomProvider from './components/ZoomProvider';
import router from './router';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ZoomProvider>
          <RouterProvider router={router} />
        </ZoomProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
