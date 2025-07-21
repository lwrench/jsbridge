import { createHmac, createHash } from 'crypto';

export class SecurityUtils {
  static generateSignature(
    method: string,
    url: string,
    timestamp: string,
    body: string,
    secret: string
  ): string {
    const signString = method + url + timestamp + body;
    return createHmac('sha256', secret).update(signString).digest('hex');
  }

  static verifySignature(
    signature: string,
    method: string,
    url: string,
    timestamp: string,
    body: string,
    secret: string
  ): boolean {
    const expectedSignature = this.generateSignature(method, url, timestamp, body, secret);
    return signature === expectedSignature;
  }

  static calculateMD5(data: Buffer | string): string {
    return createHash('md5').update(data).digest('hex');
  }

  static calculateSHA256(data: Buffer | string): string {
    return createHash('sha256').update(data).digest('hex');
  }
}

export class ValidationUtils {
  static isValidPackageId(packageId: string): boolean {
    const regex = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
    return regex.test(packageId);
  }

  static isValidVersion(version: string): boolean {
    const regex = /^\d+\.\d+\.\d+(-[\w\.-]+)?$/;
    return regex.test(version);
  }

  static isValidChecksum(checksum: string): boolean {
    const regex = /^(md5|sha256):[a-f0-9]+$/;
    return regex.test(checksum);
  }
}

export class FileUtils {
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static getFileExtension(filename: string): string {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  }
}