import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, UpdateInfo, PackageInfo, PackageVersion, UploadPackageData, AnalyticsData } from '../types/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: '/api/v1',
      timeout: 30000,
    });

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Package management APIs
  async checkVersion(packageId: string, currentVersion?: string): Promise<UpdateInfo> {
    const params = new URLSearchParams({ packageId });
    if (currentVersion) {
      params.append('currentVersion', currentVersion);
    }
    
    const response: AxiosResponse<ApiResponse<UpdateInfo>> = await this.api.get(
      `/packages/check-version?${params.toString()}`
    );
    return response.data.data!;
  }

  async getPackageInfo(packageId: string, version: string): Promise<PackageInfo> {
    const response: AxiosResponse<ApiResponse<PackageInfo>> = await this.api.get(
      `/packages/${packageId}/${version}/info`
    );
    return response.data.data!;
  }

  async getPackageVersions(
    packageId: string,
    limit: number = 20,
    offset: number = 0,
    order: 'asc' | 'desc' = 'desc'
  ): Promise<{ total: number; versions: PackageVersion[] }> {
    const response: AxiosResponse<ApiResponse<{ total: number; versions: PackageVersion[] }>> = 
      await this.api.get(`/packages/${packageId}/versions`, {
        params: { limit, offset, order }
      });
    return response.data.data!;
  }

  async uploadPackage(data: UploadPackageData): Promise<any> {
    const formData = new FormData();
    formData.append('version', data.version);
    formData.append('file', data.file);
    formData.append('manifest', data.manifest);
    if (data.description) {
      formData.append('description', data.description);
    }

    const response = await this.api.post(`/packages/${data.packageId}/test-upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': 'Bearer test-token',
      },
    });
    return response.data.data;
  }

  async getPackageStatus(packageId: string, version: string): Promise<any> {
    const response = await this.api.get(`/packages/${packageId}/${version}/status`);
    return response.data.data;
  }

  async downloadPackage(packageId: string, version: string): Promise<void> {
    window.open(`/api/v1/packages/${packageId}/${version}/download`, '_blank');
  }

  // Analytics APIs
  async getDownloadStats(
    packageId: string,
    startDate: string,
    endDate: string,
    granularity: 'day' | 'hour' = 'day'
  ): Promise<AnalyticsData> {
    const response: AxiosResponse<ApiResponse<AnalyticsData>> = await this.api.get(
      `/analytics/${packageId}/downloads`,
      {
        params: { startDate, endDate, granularity }
      }
    );
    return response.data.data!;
  }
}

export default new ApiService();