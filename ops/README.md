# 离线包管理平台

基于 Express + React + TypeScript 构建的离线包管理平台，支持 Android WebView 离线资源包的上传、管理、分发和统计分析。

## 项目结构

```
ops/
├── backend/          # Express.js 后端服务
├── frontend/         # React.js 前端应用  
├── shared/          # 共享类型和工具
├── docker-compose.yml # Docker 编排配置
├── nginx.conf       # Nginx 配置
└── README.md        # 项目说明
```

## 功能特性

### 后端功能
- ✅ RESTful API 接口（基于 OFFLINE_API.md 规范）
- ✅ 文件上传和存储管理
- ✅ 版本检查和增量更新
- ✅ 数字签名验证和安全认证
- ✅ 下载统计和分析
- ✅ 错误处理和日志记录

### 前端功能
- ✅ 仪表盘总览
- ✅ 离线包列表和详情查看
- ✅ 文件上传界面
- ✅ 统计分析图表
- ✅ 响应式设计

## 技术栈

- **后端**: Node.js + Express.js + TypeScript
- **前端**: React.js + Vite + Antd + TypeScript
- **包管理**: pnpm workspace
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx

## 快速开始

### 使用 Docker (推荐)

1. 克隆项目并进入目录
```bash
cd ops
```

2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件设置必要的环境变量
```

3. 启动服务
```bash
pnpm docker:build
pnpm docker:up
```

4. 访问应用
- 前端管理界面: http://localhost:3000
- 后端API: http://localhost:3001
- Nginx (生产): http://localhost

### 本地开发

1. 安装依赖
```bash
pnpm install
```

2. 启动开发服务
```bash
pnpm dev
```

3. 构建项目
```bash
pnpm build
```

## API 接口

### 核心接口

- `GET /api/v1/packages/check-version` - 检查版本更新
- `GET /api/v1/packages/{id}/{version}/info` - 获取包信息
- `GET /api/v1/packages/{id}/{version}/download` - 下载离线包
- `POST /api/v1/packages/{id}/upload` - 上传离线包
- `GET /api/v1/analytics/{id}/downloads` - 下载统计

详细 API 文档请参考 [OFFLINE_API.md](../OFFLINE_API.md)

## 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `API_SECRET` | API 签名密钥 | `default-secret-key` |
| `CDN_BASE_URL` | CDN 基础URL | `http://localhost:3001` |
| `MAX_PACKAGE_SIZE` | 最大包大小 | `100MB` |

### 认证机制

使用 HMAC-SHA256 签名认证：

```javascript
const signature = HMAC-SHA256(api_secret, method + url + timestamp + body);
```

请求头：
```
X-API-Key: your_api_key
X-Timestamp: 1642608000
X-Signature: generated_signature
```

## 部署指南

### Docker 部署

1. 构建镜像
```bash
docker-compose build
```

2. 启动服务
```bash
docker-compose up -d
```

3. 查看状态
```bash
docker-compose ps
docker-compose logs
```

### 数据持久化

重要目录映射：
- `./data/packages` - 离线包文件存储
- `./data/metadata` - 包元数据
- `./data/analytics` - 统计数据
- `./data/uploads` - 临时上传文件

## 监控和日志

- 健康检查：`GET /health`
- 应用日志：`docker-compose logs -f backend`
- Nginx 日志：`docker-compose logs -f nginx`

## 开发指南

### 项目结构

```
backend/
├── src/
│   ├── routes/          # 路由定义
│   ├── services/        # 业务逻辑
│   ├── middleware/      # 中间件
│   ├── types/          # 类型定义
│   └── utils/          # 工具函数
├── Dockerfile
└── package.json

frontend/
├── src/
│   ├── components/      # 组件
│   ├── pages/          # 页面
│   ├── services/       # API 服务
│   ├── types/          # 类型定义
│   └── hooks/          # 自定义钩子
├── Dockerfile
└── package.json
```

### 开发规范

- 使用 TypeScript 进行类型检查
- 遵循 ESLint 代码规范
- 编写单元测试覆盖核心逻辑
- 使用 Prettier 格式化代码

## 安全考虑

- 文件类型验证和大小限制
- API 签名验证和频率限制
- 输入参数验证和 SQL 注入防护
- 文件完整性校验和数字签名

## 性能优化

- Nginx 反向代理和负载均衡
- 静态文件 CDN 分发
- API 响应缓存
- 数据库连接池

## 故障排除

### 常见问题

1. **上传失败**
   - 检查文件大小是否超限
   - 确认 API 密钥配置正确

2. **下载缓慢**
   - 配置 CDN 镜像
   - 检查网络带宽

3. **容器启动失败**
   - 查看容器日志：`docker-compose logs`
   - 检查端口占用情况

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交代码更改
4. 创建 Pull Request

## 许可证

MIT License