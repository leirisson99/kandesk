import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { routes } from './routes';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          {routes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Route>
      </Routes>
    </HashRouter>
  );
}
