export declare class AnalyticsService {
    private analyticsDir;
    constructor();
    private initDirectories;
    getDownloadStats(packageId: string, startDate: string, endDate: string, granularity: 'day' | 'hour'): Promise<any>;
    recordDownload(packageId: string, version: string, downloadType: 'full' | 'incremental', userAgent?: string, ip?: string): Promise<void>;
}
//# sourceMappingURL=analyticsService.d.ts.map