import { Readable } from 'stream';
import { UpdateInfo, PackageInfo, IncrementalUpdate, PackageVersion } from '../types/api';
export declare class PackageService {
    private packagesDir;
    private metadataDir;
    constructor();
    private initDirectories;
    checkForUpdates(packageId: string, currentVersion?: string, platform?: string, appVersion?: string): Promise<UpdateInfo>;
    getPackageInfo(packageId: string, version: string): Promise<PackageInfo>;
    downloadPackage(packageId: string, version: string, token?: string, mirror?: string): Promise<Readable>;
    getIncrementalUpdate(packageId: string, fromVersion: string, toVersion: string): Promise<IncrementalUpdate>;
    downloadIncrementalPatch(packageId: string, fromVersion: string, toVersion: string): Promise<Readable>;
    getPackageVersions(packageId: string, limit: number, offset: number, order: 'asc' | 'desc'): Promise<{
        total: number;
        versions: PackageVersion[];
    }>;
    uploadPackage(packageId: string, version: string, packageFile: Express.Multer.File, manifestFile: Express.Multer.File, description?: string): Promise<any>;
    getPackageStatus(packageId: string, version: string): Promise<any>;
    private calculateFileChecksum;
}
//# sourceMappingURL=packageService.d.ts.map