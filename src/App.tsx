import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute } from './context/AuthContext';
import { RequirePerm, WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import Categories from './pages/Categories';
import Dashboard from './pages/Dashboard';
import FeedbackDetail from './pages/FeedbackDetail';
import FeedbackForm from './pages/FeedbackForm';
import FeedbackList from './pages/FeedbackList';
import Login from './pages/Login';
import PublicRoadmap from './pages/PublicRoadmap';
import ReleaseNotes from './pages/ReleaseNotes';
import RoadmapBoard from './pages/RoadmapBoard';
import Settings from './pages/Settings';
import Subscription from './pages/Subscription';
import Team from './pages/Team';
import WorkspaceSelector from './pages/WorkspaceSelector';

function Home() {
  const { can, workspace } = useWorkspace();
  return can('viewDashboard') ? <Dashboard /> : <Navigate to={`/w/${workspace.id}/feedback`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/roadmap/:slug" element={<PublicRoadmap />} />
      <Route path="/workspaces" element={<ProtectedRoute><WorkspaceSelector /></ProtectedRoute>} />
      <Route path="/w/:workspaceId" element={<ProtectedRoute><WorkspaceProvider><Layout /></WorkspaceProvider></ProtectedRoute>}>
        <Route index element={<Home />} />
        <Route path="feedback" element={<FeedbackList />} />
        <Route path="feedback/new" element={<FeedbackForm />} />
        <Route path="feedback/:id" element={<FeedbackDetail />} />
        <Route path="feedback/:id/edit" element={<FeedbackForm />} />
        <Route path="roadmap" element={<RoadmapBoard />} />
        <Route path="releases" element={<ReleaseNotes />} />
        <Route path="categories" element={<RequirePerm perm="manageCategories"><Categories /></RequirePerm>} />
        <Route path="team" element={<RequirePerm perm="manageMembers"><Team /></RequirePerm>} />
        <Route path="subscription" element={<RequirePerm perm="manageSubscription"><Subscription /></RequirePerm>} />
        <Route path="settings" element={<RequirePerm perm="manageWorkspace"><Settings /></RequirePerm>} />
      </Route>
      <Route path="*" element={<Navigate to="/workspaces" replace />} />
    </Routes>
  );
}
