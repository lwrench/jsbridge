# 离线包加载功能详细设计文档

## 1. 功能概述

离线包加载功能旨在提供高效的本地资源管理方案，通过预下载和缓存机制提升WebView页面加载速度，并支持增量更新减少网络传输量。

## 2. 架构设计

### 2.1 核心组件

```
OfflinePackageManager
├── PackageDownloader      # 离线包下载管理
├── BsdiffPatcher         # 增量更新处理
├── ResourceInterceptor   # 资源拦截器
├── PackageStorage       # 本地存储管理
├── VersionManager       # 版本管理
└── SecurityValidator    # 安全校验
```

### 2.2 数据流程

```
启动应用 → 检查版本 → 下载更新 → 应用增量 → 拦截请求 → 返回本地资源
```

## 3. 离线包结构

### 3.1 包文件格式
```
offline_package_v1.2.3.zip
├── manifest.json         # 包清单文件
├── assets/              # 静态资源
│   ├── js/
│   ├── css/
│   ├── images/
│   └── fonts/
├── pages/               # 页面文件
│   ├── index.html
│   └── detail.html
└── checksum.md5         # 文件完整性校验
```

### 3.2 清单文件格式 (manifest.json)
```json
{
  "packageId": "com.example.webapp",
  "version": "1.2.3",
  "versionCode": 123,
  "minAppVersion": "1.0.0",
  "updateTime": "2025-01-19T12:00:00Z",
  "size": 2048576,
  "checksum": "abc123def456",
  "files": {
    "index.html": {
      "path": "pages/index.html",
      "size": 4096,
      "checksum": "file_hash_123"
    },
    "app.js": {
      "path": "assets/js/app.js",
      "size": 8192,
      "checksum": "file_hash_456"
    }
  },
  "routes": {
    "/": "pages/index.html",
    "/detail": "pages/detail.html"
  }
}
```

## 4. 增量更新机制

### 4.1 bsdiff 算法优势
- 二进制文件差分算法
- 高压缩率，通常可减少70-90%传输量
- 适用于任何文件类型
- 支持回滚操作

### 4.2 增量包结构
```
incremental_v1.2.2_to_v1.2.3.patch
├── patch_manifest.json   # 增量信息
├── patches/             # 差分文件
│   ├── app.js.patch
│   └── style.css.patch
├── new_files/           # 新增文件
│   └── new_feature.js
└── deleted_files.json   # 删除文件列表
```

### 4.3 增量更新流程
```
1. 检查当前版本
2. 获取增量包列表
3. 下载必要的增量包
4. 验证完整性
5. 应用bsdiff补丁
6. 添加新文件
7. 删除废弃文件
8. 更新版本信息
```

## 5. 资源拦截策略

### 5.1 拦截规则
```kotlin
val interceptRules = mapOf(
    "*.html" to InterceptType.LOCAL_FIRST,
    "*.js" to InterceptType.LOCAL_FIRST,
    "*.css" to InterceptType.LOCAL_FIRST,
    "*.png" to InterceptType.LOCAL_ONLY,
    "*.jpg" to InterceptType.LOCAL_ONLY,
    "api/*" to InterceptType.NETWORK_ONLY
)
```

### 5.2 缓存策略
- **LOCAL_FIRST**: 优先使用本地资源，失败时回退到网络
- **LOCAL_ONLY**: 仅使用本地资源
- **NETWORK_ONLY**: 仅使用网络资源
- **NETWORK_FIRST**: 优先网络，失败时使用本地

## 6. 存储管理

### 6.1 目录结构
```
/data/data/com.example.app/offline_packages/
├── current/              # 当前使用版本
├── versions/            # 历史版本备份
│   ├── v1.2.1/
│   ├── v1.2.2/
│   └── v1.2.3/
├── temp/                # 临时下载目录
├── patches/             # 增量包缓存
└── metadata.json        # 版本元数据
```

### 6.2 版本管理
```json
{
  "currentVersion": "1.2.3",
  "availableVersions": ["1.2.1", "1.2.2", "1.2.3"],
  "downloadHistory": [
    {
      "version": "1.2.3",
      "downloadTime": "2025-01-19T12:00:00Z",
      "size": 2048576,
      "type": "full"
    }
  ],
  "maxVersionsToKeep": 3
}
```

## 7. 安全机制

### 7.1 完整性校验
- MD5/SHA256 文件校验
- 数字签名验证
- 包来源验证
- 防篡改检测

### 7.2 安全策略
```kotlin
class SecurityPolicy {
    val allowedDomains = listOf("cdn.example.com", "assets.example.com")
    val requireSignature = true
    val maxPackageSize = 50 * 1024 * 1024 // 50MB
    val allowedFileTypes = setOf("html", "js", "css", "png", "jpg", "woff")
}
```

## 8. 性能优化

### 8.1 下载策略
- 分片下载支持断点续传
- 并发下载控制
- 网络状态感知
- 电量状态考虑

### 8.2 内存优化
- 按需加载资源
- LRU缓存机制
- 内存压力监控
- 及时释放资源

## 9. 错误处理

### 9.1 异常类型
```kotlin
sealed class OfflinePackageException : Exception() {
    object NetworkError : OfflinePackageException()
    object CorruptedPackage : OfflinePackageException()
    object InsufficientStorage : OfflinePackageException()
    object UnsupportedVersion : OfflinePackageException()
    object SecurityViolation : OfflinePackageException()
}
```

### 9.2 降级策略
- 包损坏时回退到上一版本
- 下载失败时使用已有版本
- 资源不存在时请求网络
- 全部失败时显示错误页面

## 10. 监控与统计

### 10.1 关键指标
- 包下载成功率
- 资源命中率
- 页面加载时间
- 存储空间使用
- 网络流量节省

### 10.2 日志记录
```kotlin
data class OfflinePackageEvent(
    val type: EventType,
    val packageId: String,
    val version: String,
    val timestamp: Long,
    val details: Map<String, Any>
)
```

## 11. API接口规范

### 11.1 版本检查接口
```
GET /api/offline-packages/check-version
```

### 11.2 包下载接口
```
GET /api/offline-packages/download/{packageId}/{version}
```

### 11.3 增量更新接口
```
GET /api/offline-packages/incremental/{packageId}/{fromVersion}/{toVersion}
```

## 12. 使用示例

### 12.1 初始化
```kotlin
val offlineManager = OfflinePackageManager.Builder()
    .setContext(context)
    .setPackageId("com.example.webapp")
    .setDownloadUrl("https://cdn.example.com/packages/")
    .setMaxCacheSize(100 * 1024 * 1024)
    .build()

offlineManager.initialize()
```

### 12.2 更新检查
```kotlin
offlineManager.checkForUpdates { result ->
    when (result) {
        is UpdateResult.Available -> {
            offlineManager.downloadUpdate(result.updateInfo)
        }
        is UpdateResult.UpToDate -> {
            // 已是最新版本
        }
        is UpdateResult.Error -> {
            // 处理错误
        }
    }
}
```

### 12.3 资源拦截
```kotlin
webView.webViewClient = object : WebViewClient() {
    override fun shouldInterceptRequest(
        view: WebView?,
        request: WebResourceRequest
    ): WebResourceResponse? {
        return offlineManager.interceptRequest(request.url.toString())
    }
}
```

## 13. 测试策略

### 13.1 单元测试
- 包下载逻辑
- 增量更新算法
- 资源拦截机制
- 版本管理功能

### 13.2 集成测试
- 完整更新流程
- 网络异常处理
- 存储空间限制
- 并发操作安全

### 13.3 性能测试
- 大包下载性能
- 内存使用峰值
- 页面加载速度
- 电量消耗测试