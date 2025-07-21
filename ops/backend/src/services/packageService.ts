import fs from 'fs-extra';
import path from 'path';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import { UpdateInfo, PackageInfo, IncrementalUpdate, PackageVersion } from '../types/api';

export class PackageService {
  private packagesDir = path.join(process.cwd(), 'packages');
  private metadataDir = path.join(process.cwd(), 'metadata');

  constructor() {
    this.initDirectories();
  }

  private async initDirectories() {
    await fs.ensureDir(this.packagesDir);
    await fs.ensureDir(this.metadataDir);
  }

  async checkForUpdates(
    packageId: string,
    currentVersion?: string,
    platform?: string,
    appVersion?: string
  ): Promise<UpdateInfo> {
    const metadataPath = path.join(this.metadataDir, `${packageId}.json`);
    
    if (!await fs.pathExists(metadataPath)) {
      throw new Error('Package not found');
    }

    const metadata = await fs.readJson(metadataPath);
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

  async getPackageInfo(packageId: string, version: string): Promise<PackageInfo> {
    const metadataPath = path.join(this.metadataDir, `${packageId}.json`);
    
    if (!await fs.pathExists(metadataPath)) {
      throw new Error('Package not found');
    }

    const metadata = await fs.readJson(metadataPath);
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

  async downloadPackage(
    packageId: string,
    version: string,
    token?: string,
    mirror?: string
  ): Promise<Readable> {
    const packagePath = path.join(this.packagesDir, packageId, version, 'package.zip');
    
    if (!await fs.pathExists(packagePath)) {
      throw new Error('Package file not found');
    }

    return fs.createReadStream(packagePath);
  }

  async getIncrementalUpdate(
    packageId: string,
    fromVersion: string,
    toVersion: string
  ): Promise<IncrementalUpdate> {
    const patchPath = path.join(this.packagesDir, packageId, 'patches', `${fromVersion}_to_${toVersion}.patch`);
    
    if (!await fs.pathExists(patchPath)) {
      throw new Error('Incremental update not available');
    }

    const stats = await fs.stat(patchPath);
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

  async downloadIncrementalPatch(
    packageId: string,
    fromVersion: string,
    toVersion: string
  ): Promise<Readable> {
    const patchPath = path.join(this.packagesDir, packageId, 'patches', `${fromVersion}_to_${toVersion}.patch`);
    
    if (!await fs.pathExists(patchPath)) {
      throw new Error('Patch file not found');
    }

    return fs.createReadStream(patchPath);
  }

  async getPackageVersions(
    packageId: string,
    limit: number,
    offset: number,
    order: 'asc' | 'desc'
  ): Promise<{ total: number; versions: PackageVersion[] }> {
    const metadataPath = path.join(this.metadataDir, `${packageId}.json`);
    
    if (!await fs.pathExists(metadataPath)) {
      throw new Error('Package not found');
    }

    const metadata = await fs.readJson(metadataPath);
    const versions = Object.entries(metadata.versions)
      .map(([version, data]: [string, any]) => ({
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

  async uploadPackage(
    packageId: string,
    version: string,
    packageFile: Express.Multer.File,
    manifestFile: Express.Multer.File,
    description?: string
  ): Promise<any> {
    const packageDir = path.join(this.packagesDir, packageId, version);
    await fs.ensureDir(packageDir);

    // Move files to permanent location
    const packagePath = path.join(packageDir, 'package.zip');
    const manifestPath = path.join(packageDir, 'manifest.json');
    
    await fs.move(packageFile.path, packagePath);
    await fs.move(manifestFile.path, manifestPath);

    // Calculate checksum
    const checksum = await this.calculateFileChecksum(packagePath);

    // Update metadata
    const metadataPath = path.join(this.metadataDir, `${packageId}.json`);
    let metadata = {};
    
    if (await fs.pathExists(metadataPath)) {
      metadata = await fs.readJson(metadataPath);
    }

    const versionData = {
      versionCode: parseInt(version.replace(/\./g, '')),
      size: packageFile.size,
      checksum,
      publishTime: new Date().toISOString(),
      status: 'active',
      description: description || '',
      downloadCount: 0
    };

    (metadata as any).versions = (metadata as any).versions || {};
    (metadata as any).versions[version] = versionData;
    (metadata as any).latestVersion = version;

    await fs.writeJson(metadataPath, metadata, { spaces: 2 });

    return {
      packageId,
      version,
      uploadId: `upload_${Date.now()}`,
      status: 'processing',
      estimatedProcessTime: 300000
    };
  }

  async getPackageStatus(packageId: string, version: string): Promise<any> {
    const metadataPath = path.join(this.metadataDir, `${packageId}.json`);
    
    if (!await fs.pathExists(metadataPath)) {
      throw new Error('Package not found');
    }

    const metadata = await fs.readJson(metadataPath);
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

  private async calculateFileChecksum(filePath: string): Promise<string> {
    const hash = createHash('md5');
    const stream = fs.createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
}