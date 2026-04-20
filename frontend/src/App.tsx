import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import Login from '@/pages/Login';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Habitaciones from '@/pages/Habitaciones';
import Productos from '@/pages/Productos';
import ProductosLimpieza from '@/pages/ProductosLimpieza';
import Ventas from '@/pages/Ventas';
import Alquileres from '@/pages/Alquileres';
import Historial from '@/pages/Historial';
import Limpieza from '@/pages/Limpieza';
import Caja from '@/pages/Caja';
import Sedes from '@/pages/Sedes';
import Usuarios from '@/pages/Usuarios';

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="habitaciones" element={<Habitaciones />} />
        <Route path="productos" element={<Productos />} />
        <Route path="productos-limpieza" element={<ProductosLimpieza />} />
        <Route path="ventas" element={<Ventas />} />
        <Route path="alquileres" element={<Alquileres />} />
        <Route path="historial" element={<Historial />} />
        <Route path="limpieza" element={<Limpieza />} />
        <Route path="caja" element={<Caja />} />
        <Route path="sedes" element={<Sedes />} />
        <Route path="usuarios" element={<Usuarios />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
