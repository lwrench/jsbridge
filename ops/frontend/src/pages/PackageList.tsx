import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Typography, Card, Input, DatePicker, Select } from 'antd';
import { Link } from 'react-router-dom';
import { DownloadOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { PackageVersion } from '../types/api';
import apiService from '../services/api';

const { Title } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

const PackageList: React.FC = () => {
  const [packages] = useState([
    { packageId: 'com.example.webapp', name: '移动端WebApp' },
    { packageId: 'com.example.shop', name: '电商应用' },
  ]);
  const [versions, setVersions] = useState<PackageVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState('com.example.webapp');

  useEffect(() => {
    loadVersions();
  }, [selectedPackage]);

  const loadVersions = async () => {
    if (!selectedPackage) return;
    
    setLoading(true);
    try {
      const result = await apiService.getPackageVersions(selectedPackage);
      setVersions(result.versions);
    } catch (error) {
      console.error('Failed to load versions:', error);
      // Mock data for demo
      setVersions([
        {
          version: '1.3.0',
          versionCode: 130,
          publishTime: '2025-01-19T12:00:00Z',
          size: 2048576,
          status: 'active',
          downloadCount: 5000,
        },
        {
          version: '1.2.0',
          versionCode: 120,
          publishTime: '2025-01-15T10:00:00Z',
          size: 1948576,
          status: 'deprecated',
          downloadCount: 3500,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (packageId: string, version: string) => {
    apiService.downloadPackage(packageId, version);
  };

  const columns = [
    {
      title: '版本号',
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: '版本代码',
      dataIndex: 'versionCode',
      key: 'versionCode',
    },
    {
      title: '发布时间',
      dataIndex: 'publishTime',
      key: 'publishTime',
      render: (time: string) => new Date(time).toLocaleDateString('zh-CN'),
    },
    {
      title: '文件大小',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => `${(size / 1024 / 1024).toFixed(2)} MB`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap = {
          active: 'green',
          deprecated: 'orange',
          draft: 'gray',
        };
        const textMap = {
          active: '活跃',
          deprecated: '已弃用',
          draft: '草稿',
        };
        return <Tag color={colorMap[status as keyof typeof colorMap]}>{textMap[status as keyof typeof textMap]}</Tag>;
      },
    },
    {
      title: '下载次数',
      dataIndex: 'downloadCount',
      key: 'downloadCount',
    },
    {
      title: '操作',
      key: 'action',
      render: (record: PackageVersion) => (
        <Space>
          <Link to={`/packages/${selectedPackage}?version=${record.version}`}>
            <Button icon={<EyeOutlined />} size="small">
              查看详情
            </Button>
          </Link>
          <Button
            icon={<DownloadOutlined />}
            size="small"
            onClick={() => handleDownload(selectedPackage, record.version)}
          >
            下载
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>离线包管理</Title>
      
      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Space>
              <span>选择应用:</span>
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
              <Search
                placeholder="搜索版本"
                prefix={<SearchOutlined />}
                style={{ width: 200 }}
              />
              <RangePicker placeholder={['开始日期', '结束日期']} />
            </Space>
          </div>
          
          <Table
            columns={columns}
            dataSource={versions}
            loading={loading}
            rowKey="version"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        </Space>
      </Card>
    </div>
  );
};

export default PackageList;