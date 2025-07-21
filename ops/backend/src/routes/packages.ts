import express, { Router } from 'express';
import multer from 'multer';
import { authMiddleware, simpleAuthMiddleware } from '../middleware/auth';
import { PackageService } from '../services/packageService';
import { ApiResponse, UpdateInfo, PackageInfo, IncrementalUpdate, PackageVersion } from '../types/api';

const router: Router = express.Router();
const packageService = new PackageService();

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Check version updates
router.get('/check-version', async (req, res) => {
  try {
    const { packageId, currentVersion, platform, appVersion } = req.query;
    
    if (!packageId) {
      return res.status(400).json({
        code: 1001,
        message: 'Package ID is required',
        data: null,
        timestamp: Date.now(),
        requestId: (req.headers['x-request-id'] as string) || 'unknown'
      });
    }

    const updateInfo = await packageService.checkForUpdates(
      packageId as string,
      currentVersion as string || undefined,
      platform as string || undefined,
      appVersion as string || undefined
    );

    const response: ApiResponse<UpdateInfo> = {
      code: 0,
      message: 'success',
      data: updateInfo,
      timestamp: Date.now(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown'
    };

    res.json(response);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      code: 2001,
      message: err.message,
      data: null,
      timestamp: Date.now(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown'
    });
  }
});

// Get package info
router.get('/:packageId/:version/info', async (req, res) => {
  try {
    const { packageId, version } = req.params;
    const packageInfo = await packageService.getPackageInfo(packageId, version);

    const response: ApiResponse<PackageInfo> = {
      code: 0,
      message: 'success',
      data: packageInfo,
      timestamp: Date.now(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown'
    };

    res.json(response);
  } catch (error) {
    const err = error as Error;
    res.status(404).json({
      code: 1001,
      message: err.message,
      data: null,
      timestamp: Date.now(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown'
    });
  }
});

// Download package
router.get('/:packageId/:version/download', async (req, res) => {
  try {
    const { packageId, version } = req.params;
    const { token, mirror } = req.query;

    const fileStream = await packageService.downloadPackage(
      packageId,
      version,
      (token as string) || undefined,
      (mirror as string) || undefined
    );

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${packageId}_${version}.zip"`);
    
    fileStream.pipe(res);
  } catch (error) {
    const err = error as Error;
    res.status(404).json({
      code: 1001,
      message: err.message,
      data: null,
      timestamp: Date.now(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown'
    });
  }
});

// Get incremental update info
router.get('/:packageId/incremental/:fromVersion/:toVersion', async (req, res) => {
  try {
    const { packageId, fromVersion, toVersion } = req.params;
    const incrementalInfo = await packageService.getIncrementalUpdate(packageId, fromVersion, toVersion);

    const response: ApiResponse<IncrementalUpdate> = {
      code: 0,
      message: 'success',
      data: incrementalInfo,
      timestamp: Date.now(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown'
    };

    res.json(response);
  } catch (error) {
    const err = error as Error;
    res.status(404).json({
      code: 1002,
      message: err.message,
      data: null,
      timestamp: Date.now(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown'
    });
  }
});

// Download incremental update
router.get('/:packageId/incremental/:fromVersion/:toVersion/download', async (req, res) => {
  try {
    const { packageId, fromVersion, toVersion } = req.params;
    const patchStream = await packageService.downloadIncrementalPatch(packageId, fromVersion, toVersion);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${packageId}_${fromVersion}_to_${toVersion}.patch"`);
    
    patchStream.pipe(res);
  } catch (error) {
    const err = error as Error;
    res.status(404).json({
      code: 1002,
      message: err.message,
      data: null,
      timestamp: Date.now(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown'
    });
  }
});

// Get package versions list
router.get('/:packageId/versions', async (req, res) => {
  try {
    const { packageId } = req.params;
    const { limit = 20, offset = 0, order = 'desc' } = req.query;
    
    const versions = await packageService.getPackageVersions(
      packageId,
      parseInt((limit as string) || '20'),
      parseInt((offset as string) || '0'),
      (order as 'asc' | 'desc') || 'desc'
    );

    const response: ApiResponse<{ total: number; versions: PackageVersion[] }> = {
      code: 0,
      message: 'success',
      data: versions,
      timestamp: Date.now(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown'
    };

    res.json(response);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      code: 2001,
      message: err.message,
      data: null,
      timestamp: Date.now(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown'
    });
  }
});

// Simplified upload for testing (uses simple auth)
router.post('/:packageId/test-upload', simpleAuthMiddleware, upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'manifest', maxCount: 1 }
]), async (req, res) => {
  try {
    const { packageId } = req.params;
    const { version, description } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files.file || !files.manifest) {
      return res.status(400).json({
        code: 1001,
        message: 'Package file and manifest are required',
        data: null,
        timestamp: Date.now(),
        requestId: (req.headers['x-request-id'] as string) || 'unknown'
      });
    }

    const result = await packageService.uploadPackage(
      packageId,
      version,
      files.file[0],
      files.manifest[0],
      description
    );

    const response: ApiResponse = {
      code: 0,
      message: 'Package uploaded successfully',
      data: result,
      timestamp: Date.now(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown'
    };

    res.json(response);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      code: 2002,
      message: err.message,
      data: null,
      timestamp: Date.now(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown'
    });
  }
});

// Upload package (requires auth)
router.post('/:packageId/upload', authMiddleware, upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'manifest', maxCount: 1 }
]), async (req, res) => {
  try {
    const { packageId } = req.params;
    const { version, description } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files.file || !files.manifest) {
      return res.status(400).json({
        code: 1001,
        message: 'Package file and manifest are required',
        data: null,
        timestamp: Date.now(),
        requestId: (req.headers['x-request-id'] as string) || 'unknown'
      });
    }

    const result = await packageService.uploadPackage(
      packageId,
      version,
      files.file[0],
      files.manifest[0],
      description
    );

    const response: ApiResponse = {
      code: 0,
      message: 'Package uploaded successfully',
      data: result,
      timestamp: Date.now(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown'
    };

    res.json(response);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      code: 2002,
      message: err.message,
      data: null,
      timestamp: Date.now(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown'
    });
  }
});

// Get package status
router.get('/:packageId/:version/status', async (req, res) => {
  try {
    const { packageId, version } = req.params;
    const status = await packageService.getPackageStatus(packageId, version);

    const response: ApiResponse = {
      code: 0,
      message: 'success',
      data: status,
      timestamp: Date.now(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown'
    };

    res.json(response);
  } catch (error) {
    const err = error as Error;
    res.status(404).json({
      code: 1001,
      message: err.message,
      data: null,
      timestamp: Date.now(),
      requestId: (req.headers['x-request-id'] as string) || 'unknown'
    });
  }
});

export default router;