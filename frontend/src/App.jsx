import Dashboard from './pages/Dashboard';

// Sin autenticacion por ahora - va directo al Dashboard
// TODO: Agregar rutas de login cuando se configure Google OAuth
export default function App() {
  return <Dashboard user={null} />;
}
