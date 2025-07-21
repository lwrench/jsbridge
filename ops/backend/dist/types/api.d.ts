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
export interface IncrementalUpdate {
    packageId: string;
    fromVersion: string;
    toVersion: string;
    patchUrl: string;
    size: number;
    checksum: string;
    algorithm: string;
    compatibility: boolean;
    estimatedApplyTime: number;
    rollbackSupported: boolean;
}
export interface PackageVersion {
    version: string;
    versionCode: number;
    publishTime: string;
    size: number;
    status: 'active' | 'deprecated' | 'draft';
    downloadCount: number;
}
//# sourceMappingURL=api.d.ts.map