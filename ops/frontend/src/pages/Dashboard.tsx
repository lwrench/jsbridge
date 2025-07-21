import React from 'react';
import { Card, Row, Col, Statistic, Typography } from 'antd';
import {
  DownloadOutlined,
  AppstoreOutlined,
  CloudServerOutlined,
  StockOutlined ,
} from '@ant-design/icons';

const { Title } = Typography;

const Dashboard: React.FC = () => {
  return (
    <div>
      <Title level={2}>仪表盘</Title>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总下载量"
              value={12500}
              prefix={<DownloadOutlined />}
              suffix="次"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="离线包数量"
              value={25}
              prefix={<AppstoreOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="存储使用"
              value={68}
              prefix={<CloudServerOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="本月增长"
              value={15.2}
              prefix={<StockOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="下载趋势" style={{ height: 400 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: 300,
              color: '#999'
            }}>
              下载趋势图表占位
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="热门版本" style={{ height: 400 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: 300,
              color: '#999'
            }}>
              版本分布图表占位
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;