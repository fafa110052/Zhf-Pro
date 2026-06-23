import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import ZoomProvider from './components/ZoomProvider';
import router from './router';

function App() {
  return (
    <ToastProvider>
      <ZoomProvider>
        <RouterProvider router={router} />
      </ZoomProvider>
    </ToastProvider>
  );
}

export default App;
