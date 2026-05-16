import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';

// Code-splitting: cada página se descarga solo cuando el usuario la visita,
// no en el bundle inicial. Reduce drásticamente el tiempo de primer pintado.
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Habitaciones = lazy(() => import('@/pages/Habitaciones'));
const Productos = lazy(() => import('@/pages/Productos'));
const ProductosLimpieza = lazy(() => import('@/pages/ProductosLimpieza'));
const Ventas = lazy(() => import('@/pages/Ventas'));
const Alquileres = lazy(() => import('@/pages/Alquileres'));
const Historial = lazy(() => import('@/pages/Historial'));
const Limpieza = lazy(() => import('@/pages/Limpieza'));
const Caja = lazy(() => import('@/pages/Caja'));
const CajaEstadisticas = lazy(() => import('@/pages/CajaEstadisticas'));
const Sedes = lazy(() => import('@/pages/Sedes'));
const Usuarios = lazy(() => import('@/pages/Usuarios'));
const Configuracion = lazy(() => import('@/pages/Configuracion'));
const Chat = lazy(() => import('@/pages/Chat'));
const Reportes = lazy(() => import('@/pages/Reportes'));
const Transferencias = lazy(() => import('@/pages/Transferencias'));
const Auditoria = lazy(() => import('@/pages/Auditoria'));
const Documentos = lazy(() => import('@/pages/Documentos'));
const PersonalPage = lazy(() => import('@/pages/Personal'));
const ImplementosPage = lazy(() => import('@/pages/Implementos'));

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Spinner mientras se carga el chunk de la ruta destino. */
function RouteFallback() {
  return (
    <div className="flex items-center justify-center h-[60vh] text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-xs">Cargando…</div>
      </div>
    </div>
  );
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
        <Route
          index
          element={
            <Suspense fallback={<RouteFallback />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route
          path="habitaciones"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Habitaciones />
            </Suspense>
          }
        />
        <Route
          path="productos"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Productos />
            </Suspense>
          }
        />
        <Route
          path="productos-limpieza"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ProductosLimpieza />
            </Suspense>
          }
        />
        <Route
          path="ventas"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Ventas />
            </Suspense>
          }
        />
        <Route
          path="alquileres"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Alquileres />
            </Suspense>
          }
        />
        <Route
          path="historial"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Historial />
            </Suspense>
          }
        />
        <Route
          path="limpieza"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Limpieza />
            </Suspense>
          }
        />
        <Route
          path="caja"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Caja />
            </Suspense>
          }
        />
        <Route
          path="caja-estadisticas"
          element={
            <Suspense fallback={<RouteFallback />}>
              <CajaEstadisticas />
            </Suspense>
          }
        />
        <Route
          path="sedes"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Sedes />
            </Suspense>
          }
        />
        <Route
          path="usuarios"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Usuarios />
            </Suspense>
          }
        />
        <Route
          path="chat"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Chat />
            </Suspense>
          }
        />
        <Route
          path="reportes"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Reportes />
            </Suspense>
          }
        />
        <Route
          path="transferencias"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Transferencias />
            </Suspense>
          }
        />
        <Route
          path="configuracion"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Configuracion />
            </Suspense>
          }
        />
        <Route
          path="auditoria"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Auditoria />
            </Suspense>
          }
        />
        <Route
          path="documentos"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Documentos />
            </Suspense>
          }
        />
        <Route
          path="personal"
          element={
            <Suspense fallback={<RouteFallback />}>
              <PersonalPage />
            </Suspense>
          }
        />
        <Route
          path="implementos"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ImplementosPage />
            </Suspense>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
