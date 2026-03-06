import { Navigate, useLocation } from 'react-router';

import { ProtectedRoute } from '../components/routing/ProtectedRoute';

export function meta() {
  return [
    { title: 'Events - Grospace' },
    { name: 'description', content: 'Redirecting to Events' },
  ];
}

function NotesRedirect() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set('type', 'notes');

  return <Navigate to={`/events?${params.toString()}`} replace />;
}

export default function NotesPage() {
  return (
    <ProtectedRoute>
      <NotesRedirect />
    </ProtectedRoute>
  );
}
