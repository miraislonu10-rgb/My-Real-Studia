import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import Home from './pages/Home.jsx';
import NotFound from './pages/NotFound.jsx';

/**
 * STUDIA - Definicion de rutas iniciales del cliente.
 * Los modulos del sistema (materias, sesiones, tareas, etc.) se
 * incorporaran aqui como rutas hijas cuando se desarrollen.
 */
export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
