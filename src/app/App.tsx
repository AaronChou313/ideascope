import { Navigate, Route, Routes } from 'react-router-dom';
import { SettingsPage } from '../pages/SettingsPage';
import { WorkspacePage } from '../pages/WorkspacePage';

export function App() {
  return <Routes><Route path="/" element={<WorkspacePage />} /><Route path="/workspace/:id" element={<WorkspacePage />} /><Route path="/settings/:section?" element={<SettingsPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}
