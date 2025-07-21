export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T | null;
  timestamp: number;
  requestId: string;
}

export interface PackageInfo {
  packageId: string;
  version: string;
  versionCode: number;
  downloadUrl: string;
  size: number;
  checksum: string;
  publishTime: string;
  downloadMirrors?: string[];
  metadata?: {
    compressionType: string;
    encryption: boolean;
    signature: string;
  };
}

export interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  latestVersionCode: number;
  downloadUrl: string;
  incrementalUrl?: string;
  size: number;
  incrementalSize?: number;
  forceUpdate: boolean;
  description: string;
  updateInfo: {
    releaseNotes: string;
    features: string[];
    bugFixes: string[];
    publishTime: string;
    compatibility: {
      minAppVersion: string;
      maxAppVersion: string;
    };
  };
}

export interface PackageVersion {
  version: string;
  versionCode: number;
  publishTime: string;
  size: number;
  status: 'active' | 'deprecated' | 'draft';
  downloadCount: number;
}

export interface UploadPackageData {
  packageId: string;
  version: string;
  description?: string;
  file: File;
  manifest: File;
}

export interface AnalyticsData {
  totalDownloads: number;
  fullPackageDownloads: number;
  incrementalDownloads: number;
  timeline: {
    date: string;
    downloads: number;
    uniqueDevices: number;
  }[];
  topVersions: {
    version: string;
    downloads: number;
    percentage: number;
  }[];
}