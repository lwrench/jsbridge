import React, { useState, useEffect } from 'react';
import { Card, Row, Col, DatePicker, Select, Typography, Table } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AnalyticsData } from '../types/api';
import apiService from '../services/api';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const Analytics: React.FC = () => {
  const [selectedPackage, setSelectedPackage] = useState('com.example.webapp');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  const packages = [
    { packageId: 'com.example.webapp', name: '移动端WebApp' },
    { packageId: 'com.example.shop', name: '电商应用' },
  ];

  useEffect(() => {
    loadAnalytics();
  }, [selectedPackage]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();
      
      const data = await apiService.getDownloadStats(
        selectedPackage,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      // Mock data for demo
      setAnalyticsData({
        totalDownloads: 12500,
        fullPackageDownloads: 8500,
        incrementalDownloads: 4000,
        timeline: [
          { date: '2025-01-15', downloads: 850, uniqueDevices: 600 },
          { date: '2025-01-16', downloads: 920, uniqueDevices: 650 },
          { date: '2025-01-17', downloads: 780, uniqueDevices: 580 },
          { date: '2025-01-18', downloads: 1100, uniqueDevices: 750 },
          { date: '2025-01-19', downloads: 1250, uniqueDevices: 800 },
        ],
        topVersions: [
          { version: '1.3.0', downloads: 5000, percentage: 40.0 },
          { version: '1.2.0', downloads: 3500, percentage: 28.0 },
          { version: '1.1.0', downloads: 2500, percentage: 20.0 },
          { version: '1.0.0', downloads: 1500, percentage: 12.0 },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const columns = [
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: '下载次数',
      dataIndex: 'downloads',
      key: 'downloads',
    },
    {
      title: '占比',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (value: number) => `${value}%`,
    },
  ];

  return (
    <div>
      <Title level={2}>统计分析</Title>
      
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <span>选择应用:</span>
          </Col>
          <Col>
            <Select
              value={selectedPackage}
              onChange={setSelectedPackage}
              style={{ width: 200 }}
            >
              {packages.map(pkg => (
                <Option key={pkg.packageId} value={pkg.packageId}>
                  {pkg.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col>
            <span>时间范围:</span>
          </Col>
          <Col>
            <RangePicker />
          </Col>
        </Row>
      </Card>

      {analyticsData && (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Card title="下载趋势" loading={loading}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.timeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="downloads"
                      stroke="#1890ff"
                      strokeWidth={2}
                      name="下载次数"
                    />
                    <Line
                      type="monotone"
                      dataKey="uniqueDevices"
                      stroke="#52c41a"
                      strokeWidth={2}
                      name="独立设备"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="版本分布" loading={loading}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.topVersions}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ version, percentage }) => `${version} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="downloads"
                    >
                      {analyticsData.topVersions.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card title="下载类型统计" loading={loading}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                      {analyticsData.fullPackageDownloads}
                    </div>
                    <div>完整包下载</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                      {analyticsData.incrementalDownloads}
                    </div>
                    <div>增量包下载</div>
                  </div>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="版本下载排行" loading={loading}>
                <Table
                  columns={columns}
                  dataSource={analyticsData.topVersions}
                  size="small"
                  pagination={false}
                  rowKey="version"
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default Analytics;