import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import useDoubleTapZoom from './hooks/useDoubleTapZoom';
import router from './router';

function AppInner() {
  useDoubleTapZoom();
  return <RouterProvider router={router} />;
}

function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}

export default App;
