"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageService = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
class PackageService {
    constructor() {
        this.packagesDir = path_1.default.join(process.cwd(), 'packages');
        this.metadataDir = path_1.default.join(process.cwd(), 'metadata');
        this.initDirectories();
    }
    async initDirectories() {
        await fs_extra_1.default.ensureDir(this.packagesDir);
        await fs_extra_1.default.ensureDir(this.metadataDir);
    }
    async checkForUpdates(packageId, currentVersion, platform, appVersion) {
        const metadataPath = path_1.default.join(this.metadataDir, `${packageId}.json`);
        if (!await fs_extra_1.default.pathExists(metadataPath)) {
            throw new Error('Package not found');
        }
        const metadata = await fs_extra_1.default.readJson(metadataPath);
        const latestVersion = metadata.latestVersion;
        const hasUpdate = currentVersion ? currentVersion !== latestVersion : true;
        return {
            hasUpdate,
            latestVersion,
            latestVersionCode: metadata.versions[latestVersion]?.versionCode || 0,
            downloadUrl: `${process.env.CDN_BASE_URL || 'http://localhost:3001'}/api/v1/packages/${packageId}/${latestVersion}/download`,
            incrementalUrl: currentVersion ?
                `${process.env.CDN_BASE_URL || 'http://localhost:3001'}/api/v1/packages/${packageId}/incremental/${currentVersion}/${latestVersion}/download` :
                undefined,
            size: metadata.versions[latestVersion]?.size || 0,
            incrementalSize: currentVersion ? metadata.versions[latestVersion]?.incrementalSizes?.[currentVersion] : undefined,
            forceUpdate: metadata.versions[latestVersion]?.forceUpdate || false,
            description: metadata.versions[latestVersion]?.description || '',
            updateInfo: {
                releaseNotes: metadata.versions[latestVersion]?.releaseNotes || '',
                features: metadata.versions[latestVersion]?.features || [],
                bugFixes: metadata.versions[latestVersion]?.bugFixes || [],
                publishTime: metadata.versions[latestVersion]?.publishTime || new Date().toISOString(),
                compatibility: {
                    minAppVersion: metadata.versions[latestVersion]?.minAppVersion || '1.0.0',
                    maxAppVersion: metadata.versions[latestVersion]?.maxAppVersion || '2.0.0'
                }
            }
        };
    }
    async getPackageInfo(packageId, version) {
        const metadataPath = path_1.default.join(this.metadataDir, `${packageId}.json`);
        if (!await fs_extra_1.default.pathExists(metadataPath)) {
            throw new Error('Package not found');
        }
        const metadata = await fs_extra_1.default.readJson(metadataPath);
        const versionData = metadata.versions[version];
        if (!versionData) {
            throw new Error('Version not found');
        }
        return {
            packageId,
            version,
            versionCode: versionData.versionCode,
            downloadUrl: `${process.env.CDN_BASE_URL || 'http://localhost:3001'}/api/v1/packages/${packageId}/${version}/download`,
            size: versionData.size,
            checksum: versionData.checksum,
            publishTime: versionData.publishTime,
            downloadMirrors: versionData.mirrors || [],
            metadata: {
                compressionType: 'zip',
                encryption: false,
                signature: versionData.signature || ''
            }
        };
    }
    async downloadPackage(packageId, version, token, mirror) {
        const packagePath = path_1.default.join(this.packagesDir, packageId, version, 'package.zip');
        if (!await fs_extra_1.default.pathExists(packagePath)) {
            throw new Error('Package file not found');
        }
        return fs_extra_1.default.createReadStream(packagePath);
    }
    async getIncrementalUpdate(packageId, fromVersion, toVersion) {
        const patchPath = path_1.default.join(this.packagesDir, packageId, 'patches', `${fromVersion}_to_${toVersion}.patch`);
        if (!await fs_extra_1.default.pathExists(patchPath)) {
            throw new Error('Incremental update not available');
        }
        const stats = await fs_extra_1.default.stat(patchPath);
        const checksum = await this.calculateFileChecksum(patchPath);
        return {
            packageId,
            fromVersion,
            toVersion,
            patchUrl: `${process.env.CDN_BASE_URL || 'http://localhost:3001'}/api/v1/packages/${packageId}/incremental/${fromVersion}/${toVersion}/download`,
            size: stats.size,
            checksum: `md5:${checksum}`,
            algorithm: 'bsdiff',
            compatibility: true,
            estimatedApplyTime: 30000,
            rollbackSupported: true
        };
    }
    async downloadIncrementalPatch(packageId, fromVersion, toVersion) {
        const patchPath = path_1.default.join(this.packagesDir, packageId, 'patches', `${fromVersion}_to_${toVersion}.patch`);
        if (!await fs_extra_1.default.pathExists(patchPath)) {
            throw new Error('Patch file not found');
        }
        return fs_extra_1.default.createReadStream(patchPath);
    }
    async getPackageVersions(packageId, limit, offset, order) {
        const metadataPath = path_1.default.join(this.metadataDir, `${packageId}.json`);
        if (!await fs_extra_1.default.pathExists(metadataPath)) {
            throw new Error('Package not found');
        }
        const metadata = await fs_extra_1.default.readJson(metadataPath);
        const versions = Object.entries(metadata.versions)
            .map(([version, data]) => ({
            version,
            versionCode: data.versionCode,
            publishTime: data.publishTime,
            size: data.size,
            status: data.status || 'active',
            downloadCount: data.downloadCount || 0
        }))
            .sort((a, b) => {
            const comparison = a.versionCode - b.versionCode;
            return order === 'desc' ? -comparison : comparison;
        });
        const total = versions.length;
        const paginatedVersions = versions.slice(offset, offset + limit);
        return { total, versions: paginatedVersions };
    }
    async uploadPackage(packageId, version, packageFile, manifestFile, description) {
        const packageDir = path_1.default.join(this.packagesDir, packageId, version);
        await fs_extra_1.default.ensureDir(packageDir);
        // Move files to permanent location
        const packagePath = path_1.default.join(packageDir, 'package.zip');
        const manifestPath = path_1.default.join(packageDir, 'manifest.json');
        await fs_extra_1.default.move(packageFile.path, packagePath);
        await fs_extra_1.default.move(manifestFile.path, manifestPath);
        // Calculate checksum
        const checksum = await this.calculateFileChecksum(packagePath);
        // Update metadata
        const metadataPath = path_1.default.join(this.metadataDir, `${packageId}.json`);
        let metadata = {};
        if (await fs_extra_1.default.pathExists(metadataPath)) {
            metadata = await fs_extra_1.default.readJson(metadataPath);
        }
        const versionData = {
            versionCode: parseInt(version.replace(/\./g, '')),
            size: packageFile.size,
            checksum,
            publishTime: new Date().toISOString(),
            status: 'processing',
            description: description || '',
            downloadCount: 0
        };
        metadata.versions = metadata.versions || {};
        metadata.versions[version] = versionData;
        metadata.latestVersion = version;
        await fs_extra_1.default.writeJson(metadataPath, metadata, { spaces: 2 });
        return {
            packageId,
            version,
            uploadId: `upload_${Date.now()}`,
            status: 'processing',
            estimatedProcessTime: 300000
        };
    }
    async getPackageStatus(packageId, version) {
        const metadataPath = path_1.default.join(this.metadataDir, `${packageId}.json`);
        if (!await fs_extra_1.default.pathExists(metadataPath)) {
            throw new Error('Package not found');
        }
        const metadata = await fs_extra_1.default.readJson(metadataPath);
        const versionData = metadata.versions[version];
        if (!versionData) {
            throw new Error('Version not found');
        }
        return {
            packageId,
            version,
            status: versionData.status,
            progress: versionData.status === 'ready' ? 100 : 50,
            downloadUrl: versionData.status === 'ready' ?
                `${process.env.CDN_BASE_URL || 'http://localhost:3001'}/api/v1/packages/${packageId}/${version}/download` :
                undefined,
            processLogs: [
                {
                    timestamp: versionData.publishTime,
                    message: 'Package validation completed'
                },
                {
                    timestamp: new Date().toISOString(),
                    message: 'CDN distribution completed'
                }
            ]
        };
    }
    async calculateFileChecksum(filePath) {
        const hash = (0, crypto_1.createHash)('md5');
        const stream = fs_extra_1.default.createReadStream(filePath);
        return new Promise((resolve, reject) => {
            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }
}
exports.PackageService = PackageService;
//# sourceMappingURL=packageService.js.map