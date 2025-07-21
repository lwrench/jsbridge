import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from 'antd';
import MainLayout from './components/MainLayout';
import Dashboard from './pages/Dashboard';
import PackageList from './pages/PackageList';
import PackageDetail from './pages/PackageDetail';
import Upload from './pages/Upload';
import Analytics from './pages/Analytics';

const { Content } = Layout;

function App() {
  return (
    <MainLayout>
      <Content style={{ padding: '24px', minHeight: 'calc(100vh - 64px)' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/packages" element={<PackageList />} />
          <Route path="/packages/:packageId" element={<PackageDetail />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Content>
    </MainLayout>
  );
}

export default App;