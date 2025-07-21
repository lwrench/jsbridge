import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  AppstoreOutlined,
  UploadOutlined,
  BarChartOutlined,
} from '@ant-design/icons';

const { Header, Sider } = Layout;
const { Title } = Typography;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">仪表盘</Link>,
    },
    {
      key: '/packages',
      icon: <AppstoreOutlined />,
      label: <Link to="/packages">离线包管理</Link>,
    },
    {
      key: '/upload',
      icon: <UploadOutlined />,
      label: <Link to="/upload">上传离线包</Link>,
    },
    {
      key: '/analytics',
      icon: <BarChartOutlined />,
      label: <Link to="/analytics">统计分析</Link>,
    },
  ];

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        backgroundColor: '#001529',
        padding: '0 24px'
      }}>
        <Title level={3} style={{ color: 'white', margin: 0 }}>
          离线包管理平台
        </Title>
      </Header>
      <Layout>
        <Sider
          width={240}
          style={{
            overflow: 'auto',
            height: 'calc(100vh - 64px)',
            position: 'fixed',
            left: 0,
            top: 64,
            bottom: 0,
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            style={{ height: '100%', borderRight: 0 }}
            items={menuItems}
          />
        </Sider>
        <Layout style={{ marginLeft: 240 }}>
          {children}
        </Layout>
      </Layout>
    </Layout>
  );
};

export default MainLayout;