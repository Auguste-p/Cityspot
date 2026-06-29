import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { UserProvider } from './context/UserContext';

function App() {
  return (
    <UserProvider>
      <RouterProvider router={router} />
      <Toaster position="bottom-center" richColors />
    </UserProvider>
  );
}

export default App;
