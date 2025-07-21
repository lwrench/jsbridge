import React, { useState } from 'react';
import { Card, Form, Input, Select, Upload, Button, message, Progress, Typography, Steps } from 'antd';
import { InboxOutlined, UploadOutlined } from '@ant-design/icons';
import { UploadPackageData } from '../types/api';
import apiService from '../services/api';

const { Title, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;
const { Step } = Steps;

const UploadPage: React.FC = () => {
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSubmit = async (values: any) => {
    if (!values.packageFile || !values.manifestFile) {
      message.error('请选择离线包文件和清单文件');
      return;
    }

    setUploading(true);
    setCurrentStep(1);

    try {
      const uploadData: UploadPackageData = {
        packageId: values.packageId,
        version: values.version,
        description: values.description,
        file: values.packageFile.file,
        manifest: values.manifestFile.file,
      };

      // Simulate progress
      const progressTimer = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressTimer);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await apiService.uploadPackage(uploadData);
      
      clearInterval(progressTimer);
      setUploadProgress(100);
      setCurrentStep(2);
      
      message.success('离线包上传成功！');
      form.resetFields();
    } catch (error) {
      message.error('上传失败：' + (error as Error).message);
      setCurrentStep(0);
    } finally {
      setUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
        setCurrentStep(0);
      }, 3000);
    }
  };

  const packageFileProps = {
    name: 'file',
    multiple: false,
    accept: '.zip',
    beforeUpload: () => false, // Prevent auto upload
    onChange(info: any) {
      const { status } = info.file;
      if (status === 'done') {
        message.success(`${info.file.name} 文件上传成功`);
      } else if (status === 'error') {
        message.error(`${info.file.name} 文件上传失败`);
      }
    },
  };

  const manifestFileProps = {
    name: 'file',
    multiple: false,
    accept: '.json',
    beforeUpload: () => false,
    onChange(info: any) {
      const { status } = info.file;
      if (status === 'done') {
        message.success(`${info.file.name} 清单文件上传成功`);
      } else if (status === 'error') {
        message.error(`${info.file.name} 清单文件上传失败`);
      }
    },
  };

  return (
    <div>
      <Title level={2}>上传离线包</Title>
      
      <Card>
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          <Step title="填写信息" description="输入包信息并选择文件" />
          <Step title="上传中" description="正在上传文件到服务器" />
          <Step title="完成" description="上传完成并验证" />
        </Steps>

        {currentStep === 1 && (
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Progress
              type="circle"
              percent={uploadProgress}
              status={uploadProgress === 100 ? 'success' : 'active'}
            />
            <Paragraph style={{ marginTop: 16 }}>
              正在上传离线包，请耐心等待...
            </Paragraph>
          </div>
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={uploading}
        >
          <Form.Item
            name="packageId"
            label="包ID"
            rules={[{ required: true, message: '请输入包ID' }]}
          >
            <Input placeholder="例如：com.example.webapp" />
          </Form.Item>

          <Form.Item
            name="version"
            label="版本号"
            rules={[{ required: true, message: '请输入版本号' }]}
          >
            <Input placeholder="例如：1.0.0" />
          </Form.Item>

          <Form.Item name="description" label="版本说明">
            <TextArea rows={3} placeholder="描述此版本的更新内容..." />
          </Form.Item>

          <Form.Item
            name="packageFile"
            label="离线包文件"
            rules={[{ required: true, message: '请选择离线包文件' }]}
          >
            <Dragger {...packageFileProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽ZIP文件到此区域上传</p>
              <p className="ant-upload-hint">
                仅支持ZIP格式的离线包文件，文件大小不超过100MB
              </p>
            </Dragger>
          </Form.Item>

          <Form.Item
            name="manifestFile"
            label="清单文件"
            rules={[{ required: true, message: '请选择清单文件' }]}
          >
            <Upload {...manifestFileProps}>
              <Button icon={<UploadOutlined />}>选择manifest.json文件</Button>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={uploading}
              size="large"
              style={{ width: '100%' }}
            >
              {uploading ? '上传中...' : '上传离线包'}
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="上传说明" style={{ marginTop: 16 }}>
        <Paragraph>
          <ul>
            <li>离线包文件必须是ZIP格式，包含完整的Web资源</li>
            <li>清单文件（manifest.json）必须包含包的详细信息</li>
            <li>版本号建议使用语义化版本控制（如：1.0.0）</li>
            <li>上传后系统将自动进行文件验证和校验</li>
          </ul>
        </Paragraph>
      </Card>
    </div>
  );
};

export default UploadPage;