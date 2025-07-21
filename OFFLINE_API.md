# 离线包下载平台 API 接口文档

## 1. 接口概述

离线包下载平台提供 RESTful API 接口，用于管理和分发移动应用的离线资源包。支持版本检查、完整包下载、增量更新等功能。

## 2. 基础信息

**Base URL**: `https://api.offline-packages.example.com/v1/`

**认证方式**: API Key + HMAC-SHA256 签名

**数据格式**: JSON

**字符编码**: UTF-8

## 3. 通用响应格式

### 3.1 成功响应
```json
{
  "code": 0,
  "message": "success",
  "data": {
    // 具体业务数据
  },
  "timestamp": 1642608000000,
  "requestId": "req_123456789"
}
```

### 3.2 错误响应
```json
{
  "code": 1001,
  "message": "Package not found",
  "data": null,
  "timestamp": 1642608000000,
  "requestId": "req_123456789"
}
```

### 3.3 错误码表
| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 1001 | 包不存在 |
| 1002 | 版本不存在 |
| 1003 | 认证失败 |
| 1004 | 签名验证失败 |
| 1005 | 请求频率超限 |
| 2001 | 服务器内部错误 |
| 2002 | 文件存储错误 |

## 4. 认证机制

### 4.1 请求头
```
X-API-Key: your_api_key
X-Timestamp: 1642608000
X-Signature: generated_signature
```

### 4.2 签名生成
```
signature = HMAC-SHA256(api_secret, method + url + timestamp + body)
```

**示例**:
```javascript
const method = "GET";
const url = "/api/v1/packages/check-version?packageId=com.example.app";
const timestamp = "1642608000";
const body = "";
const signString = method + url + timestamp + body;
const signature = CryptoJS.HmacSHA256(signString, apiSecret).toString();
```

## 5. API 接口详情

### 5.1 版本检查

**接口**: `GET /packages/check-version`

**描述**: 检查指定包是否有新版本更新

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| packageId | string | 是 | 包标识符 |
| currentVersion | string | 否 | 当前版本号 |
| platform | string | 否 | 平台标识 (android/ios) |
| appVersion | string | 否 | 应用版本号 |

**请求示例**:
```
GET /packages/check-version?packageId=com.example.webapp&currentVersion=1.2.0
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "hasUpdate": true,
    "latestVersion": "1.3.0",
    "latestVersionCode": 130,
    "downloadUrl": "https://cdn.example.com/packages/com.example.webapp/1.3.0/package.zip",
    "incrementalUrl": "https://cdn.example.com/packages/com.example.webapp/patches/1.2.0_to_1.3.0.patch",
    "size": 2048576,
    "incrementalSize": 512000,
    "forceUpdate": false,
    "description": "新增功能和性能优化",
    "updateInfo": {
      "releaseNotes": "1. 新增用户中心功能\n2. 修复已知问题\n3. 性能优化",
      "features": ["新功能A", "性能优化B"],
      "bugFixes": ["修复崩溃问题", "修复内存泄露"],
      "publishTime": "2025-01-19T12:00:00Z",
      "compatibility": {
        "minAppVersion": "1.0.0",
        "maxAppVersion": "2.0.0"
      }
    }
  }
}
```

### 5.2 获取下载信息

**接口**: `GET /packages/{packageId}/{version}/info`

**描述**: 获取指定版本包的详细下载信息

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| packageId | string | 包标识符 |
| version | string | 版本号 |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "packageId": "com.example.webapp",
    "version": "1.3.0",
    "versionCode": 130,
    "downloadUrl": "https://cdn.example.com/packages/com.example.webapp/1.3.0/package.zip",
    "size": 2048576,
    "checksum": "md5:abc123def456789",
    "publishTime": "2025-01-19T12:00:00Z",
    "downloadMirrors": [
      "https://cdn1.example.com/packages/com.example.webapp/1.3.0/package.zip",
      "https://cdn2.example.com/packages/com.example.webapp/1.3.0/package.zip"
    ],
    "metadata": {
      "compressionType": "zip",
      "encryption": false,
      "signature": "rsa_sha256:signature_string"
    }
  }
}
```

### 5.3 包下载

**接口**: `GET /packages/{packageId}/{version}/download`

**描述**: 下载指定版本的完整包

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| packageId | string | 包标识符 |
| version | string | 版本号 |

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| token | string | 否 | 下载令牌 |
| mirror | string | 否 | 镜像选择 |

**响应**: 直接返回文件流 (application/zip)

**响应头**:
```
Content-Type: application/zip
Content-Length: 2048576
Content-Disposition: attachment; filename="com.example.webapp_1.3.0.zip"
ETag: "abc123def456"
Last-Modified: Sat, 19 Jan 2025 12:00:00 GMT
```

### 5.4 增量更新包

**接口**: `GET /packages/{packageId}/incremental/{fromVersion}/{toVersion}`

**描述**: 获取两个版本之间的增量更新包

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| packageId | string | 包标识符 |
| fromVersion | string | 源版本号 |
| toVersion | string | 目标版本号 |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "packageId": "com.example.webapp",
    "fromVersion": "1.2.0",
    "toVersion": "1.3.0",
    "patchUrl": "https://cdn.example.com/packages/com.example.webapp/patches/1.2.0_to_1.3.0.patch",
    "size": 512000,
    "checksum": "md5:patch_checksum",
    "algorithm": "bsdiff",
    "compatibility": true,
    "estimatedApplyTime": 30000,
    "rollbackSupported": true
  }
}
```

### 5.5 增量包下载

**接口**: `GET /packages/{packageId}/incremental/{fromVersion}/{toVersion}/download`

**描述**: 下载增量更新包

**响应**: 直接返回补丁文件流 (application/octet-stream)

### 5.6 包版本列表

**接口**: `GET /packages/{packageId}/versions`

**描述**: 获取包的所有可用版本列表

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| limit | integer | 否 | 返回数量限制 (默认20) |
| offset | integer | 否 | 偏移量 (默认0) |
| order | string | 否 | 排序方式 (asc/desc, 默认desc) |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "total": 15,
    "versions": [
      {
        "version": "1.3.0",
        "versionCode": 130,
        "publishTime": "2025-01-19T12:00:00Z",
        "size": 2048576,
        "status": "active",
        "downloadCount": 1250
      },
      {
        "version": "1.2.0",
        "versionCode": 120,
        "publishTime": "2025-01-15T10:00:00Z",
        "size": 1948576,
        "status": "deprecated",
        "downloadCount": 5680
      }
    ]
  }
}
```

### 5.7 上传包 (管理接口)

**接口**: `POST /packages/{packageId}/upload`

**描述**: 上传新版本包 (需要管理员权限)

**请求**: multipart/form-data

**表单字段**:
| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| version | string | 是 | 版本号 |
| file | file | 是 | 包文件 |
| manifest | file | 是 | 清单文件 |
| description | string | 否 | 版本说明 |

**响应示例**:
```json
{
  "code": 0,
  "message": "Package uploaded successfully",
  "data": {
    "packageId": "com.example.webapp",
    "version": "1.4.0",
    "uploadId": "upload_123456",
    "status": "processing",
    "estimatedProcessTime": 300000
  }
}
```

### 5.8 包状态查询

**接口**: `GET /packages/{packageId}/{version}/status`

**描述**: 查询包的处理状态

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "packageId": "com.example.webapp",
    "version": "1.4.0",
    "status": "ready",
    "progress": 100,
    "downloadUrl": "https://cdn.example.com/packages/com.example.webapp/1.4.0/package.zip",
    "processLogs": [
      {
        "timestamp": "2025-01-19T12:05:00Z",
        "message": "Package validation completed"
      },
      {
        "timestamp": "2025-01-19T12:06:00Z",
        "message": "CDN distribution started"
      }
    ]
  }
}
```

## 6. 统计分析接口

### 6.1 下载统计

**接口**: `GET /packages/{packageId}/analytics/downloads`

**请求参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| startDate | string | 是 | 开始日期 (YYYY-MM-DD) |
| endDate | string | 是 | 结束日期 (YYYY-MM-DD) |
| granularity | string | 否 | 粒度 (day/hour) |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "totalDownloads": 12500,
    "fullPackageDownloads": 8500,
    "incrementalDownloads": 4000,
    "timeline": [
      {
        "date": "2025-01-19",
        "downloads": 1250,
        "uniqueDevices": 800
      }
    ],
    "topVersions": [
      {
        "version": "1.3.0",
        "downloads": 5000,
        "percentage": 40.0
      }
    ]
  }
}
```

## 7. Webhook 通知

### 7.1 事件类型
- `package.uploaded` - 包上传完成
- `package.published` - 包发布成功
- `package.download` - 包被下载
- `package.error` - 包处理错误

### 7.2 Webhook 格式
```json
{
  "event": "package.published",
  "timestamp": 1642608000000,
  "data": {
    "packageId": "com.example.webapp",
    "version": "1.4.0",
    "downloadUrl": "https://cdn.example.com/packages/com.example.webapp/1.4.0/package.zip"
  },
  "signature": "webhook_signature"
}
```

## 8. SDK 集成示例

### 8.1 Android 集成
```kotlin
val config = OfflinePackageConfig.Builder()
    .setApiKey("your_api_key")
    .setApiSecret("your_api_secret")
    .setBaseUrl("https://api.offline-packages.example.com/v1/")
    .build()

val manager = OfflinePackageManager.Builder()
    .setContext(context)
    .setConfig(config)
    .setPackageId("com.example.webapp")
    .build()

manager.checkForUpdates { result ->
    when (result) {
        is UpdateResult.Available -> {
            manager.downloadUpdate(result.updateInfo) { progress ->
                // Handle progress
            }
        }
    }
}
```

### 8.2 JavaScript 调用
```javascript
// 通过 JSBridge 调用
AndroidBridge.call('checkOfflineUpdate', {
    packageId: 'com.example.webapp'
}, function(result) {
    if (result.success && result.data.hasUpdate) {
        console.log('New version available:', result.data.latestVersion);
    }
});
```

## 9. 性能优化建议

### 9.1 缓存策略
- 使用 CDN 加速下载
- 实现客户端缓存
- 支持断点续传

### 9.2 网络优化
- 启用 HTTP/2
- 使用压缩传输
- 支持多线程下载

### 9.3 安全建议
- 实现包签名验证
- 使用 HTTPS 传输
- 定期轮换 API 密钥

## 10. 监控与告警

### 10.1 关键指标
- 下载成功率
- 平均下载时间
- 服务可用性
- 存储使用率

### 10.2 告警规则
- 下载失败率 > 5%
- 平均响应时间 > 2s
- 存储使用率 > 80%
- CDN 流量异常

## 11. 更新日志

### v1.0.0 (2025-01-19)
- 初始版本发布
- 支持基础的包管理功能
- 实现增量更新机制

### v1.1.0 (计划中)
- 支持多平台包管理
- 增加灰度发布功能
- 优化下载性能