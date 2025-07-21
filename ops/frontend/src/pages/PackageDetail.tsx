import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, Descriptions, Button, Space, Tag, Divider, Typography, Alert, Progress } from 'antd';
import { DownloadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { PackageInfo } from '../types/api';
import apiService from '../services/api';

const { Title, Paragraph } = Typography;

const PackageDetail: React.FC = () => {
  const { packageId } = useParams<{ packageId: string }>();
  const [searchParams] = useSearchParams();
  const version = searchParams.get('version') || 'latest';
  
  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackageInfo();
  }, [packageId, version]);

  const loadPackageInfo = async () => {
    if (!packageId) return;
    
    setLoading(true);
    try {
      const info = await apiService.getPackageInfo(packageId, version);
      setPackageInfo(info);
    } catch (error) {
      console.error('Failed to load package info:', error);
      // Mock data for demo
      setPackageInfo({
        packageId: packageId!,
        version: '1.3.0',
        versionCode: 130,
        downloadUrl: 'https://example.com/package.zip',
        size: 2048576,
        checksum: 'abc123def456789',
        publishTime: '2025-01-19T12:00:00Z',
        downloadMirrors: [
          'https://cdn1.example.com/package.zip',
          'https://cdn2.example.com/package.zip',
        ],
        metadata: {
          compressionType: 'zip',
          encryption: false,
          signature: 'rsa_sha256:signature_string',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (packageInfo) {
      apiService.downloadPackage(packageInfo.packageId, packageInfo.version);
    }
  };

  if (loading) {
    return <div>加载中...</div>;
  }

  if (!packageInfo) {
    return (
      <Alert
        message="离线包不存在"
        description="请检查包ID和版本号是否正确"
        type="error"
        showIcon
      />
    );
  }

  return (
    <div>
      <Space>
        <Button icon={<ArrowLeftOutlined />} onClick={() => window.history.back()}>
          返回
        </Button>
        <Title level={2}>{packageInfo.packageId}</Title>
      </Space>

      <Card title="基本信息" style={{ marginTop: 16 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="包ID">{packageInfo.packageId}</Descriptions.Item>
          <Descriptions.Item label="版本号">{packageInfo.version}</Descriptions.Item>
          <Descriptions.Item label="版本代码">{packageInfo.versionCode}</Descriptions.Item>
          <Descriptions.Item label="文件大小">
            {(packageInfo.size / 1024 / 1024).toFixed(2)} MB
          </Descriptions.Item>
          <Descriptions.Item label="发布时间">
            {new Date(packageInfo.publishTime).toLocaleString('zh-CN')}
          </Descriptions.Item>
          <Descriptions.Item label="校验值">
            <code>{packageInfo.checksum}</code>
          </Descriptions.Item>
          <Descriptions.Item label="压缩格式">
            <Tag>{packageInfo.metadata?.compressionType}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="加密状态">
            <Tag color={packageInfo.metadata?.encryption ? 'red' : 'green'}>
              {packageInfo.metadata?.encryption ? '已加密' : '未加密'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>

        <Divider />

        <Space>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
            下载离线包
          </Button>
        </Space>
      </Card>

      <Card title="下载镜像" style={{ marginTop: 16 }}>
        {packageInfo.downloadMirrors?.map((mirror, index) => (
          <div key={index} style={{ marginBottom: 8 }}>
            <Space>
              <span>镜像 {index + 1}:</span>
              <code>{mirror}</code>
              <Button
                size="small"
                onClick={() => window.open(mirror, '_blank')}
              >
                使用此镜像下载
              </Button>
            </Space>
          </div>
        ))}
      </Card>

      <Card title="数字签名" style={{ marginTop: 16 }}>
        <Paragraph>
          <pre>{packageInfo.metadata?.signature}</pre>
        </Paragraph>
      </Card>

      <Card title="下载统计" style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>今日下载：125 次</span>
            <span>25%</span>
          </div>
          <Progress percent={25} strokeColor="#52c41a" />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>总下载：5,000 次</span>
            <span>80%</span>
          </div>
          <Progress percent={80} strokeColor="#1890ff" />
        </div>
      </Card>
    </div>
  );
};

export default PackageDetail;