# 实时翻译应用

一个现代化的实时多语言即时通讯应用，具备先进的AI翻译功能。

## 概述

本应用结合即时通讯功能与AI翻译、语音克隆和协作聊天室功能，提供跨越语言障碍的无缝实时沟通体验。

## 主要功能

### 核心功能
- 基于WebSocket的实时即时通讯
- AI智能翻译（支持50+种语言）
- 带语音克隆的语音消息翻译
- 照片/图片翻译与解读
- 多用户聊天室支持

### 用户体验
- 快速访问的访客模式
- 私密和公开聊天室
- 二维码房间分享
- 可自定义语言偏好
- 基于代币的使用系统

### 高级功能
- 语音转文字
- 翻译音频的语音克隆
- 基于位置的功能
- 用户好友系统
- Stripe订阅管理
- 企业推荐码

## 技术栈

### 前端
- React 18
- Socket.IO Client
- Material Icons
- React Router
- i18next（国际化）
- Stripe.js（支付）
- Chart.js（分析）

### 后端
- Python Flask
- Socket.IO
- SQLAlchemy（ORM）
- MySQL 8
- JWT认证
- OpenAI API
- ElevenLabs API

### 基础设施
- Docker & Docker Compose
- Nginx（反向代理）
- Eventlet（异步支持）
- Gunicorn（生产服务器）

## 快速开始

### 前置要求
- Docker 和 Docker Compose
- Node.js 14+（本地开发）
- Python 3.9+（本地开发）

### 环境配置

1. 克隆仓库
```bash
git clone <your-repo-url>
cd stealth-translation-git
```

2. 配置环境变量

后端（server目录下的.env）:
```bash
cp server/.env.example server/.env
# 编辑 server/.env 填入实际值
```

前端（根目录下的.env）:
```bash
cp .env.frontend.example .env
# 编辑 .env 填入实际值
```

3. 使用Docker Compose启动
```bash
docker-compose up --build
```

应用将在以下地址可用:
- 前端: http://localhost:3000
- 后端API: http://localhost:5002

## 配置说明

### 必需的环境变量

#### 后端配置
- `SECRET_KEY`: Flask密钥
- `JWT_SECRET_KEY`: JWT令牌签名密钥
- `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_NAME`: 数据库凭证
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth
- `STRIPE_SECRET_KEY`: Stripe支付处理
- `OPENAI_API_KEY`: OpenAI翻译API
- `ELEVENLABS_API_KEY`: ElevenLabs语音克隆

#### 前端配置
- `REACT_APP_API_URL`: 后端API地址
- `REACT_APP_STRIPE_PUBLISHABLE_KEY`: Stripe公钥

## 架构说明

### 系统组件

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   React     │◄───────►│   Flask     │◄───────►│   MySQL     │
│   前端      │         │   后端      │         │   数据库    │
└─────────────┘         └─────────────┘         └─────────────┘
      │                       │
      │                       ├──────────► OpenAI API
      │                       │
      └───────────────────────├──────────► ElevenLabs API
            Socket.IO         │
                             └──────────► Stripe API
```

### 数据库模式

- **Users**: 用户资料、认证、代币
- **Chatrooms**: 房间设置、隐私、成员
- **Messages**: 文字、语音、图片消息
- **Friendships**: 用户连接
- **Notifications**: 系统通知
- **Metrics**: 使用分析

## 开发

### 本地开发配置

#### 前端
```bash
npm install
npm start
```

#### 后端
```bash
cd server
pip install -r requirements.txt
python app.py
```

### 生产构建

```bash
npm run build
docker-compose build
docker-compose up -d
```

## API文档

详细的API文档请查看 [docs/api-documentation.md](docs/api-documentation.md)。

## 安全性

- 所有API密钥必须通过环境变量配置
- 基于JWT的认证
- 使用bcrypt加密密码
- 生产环境需要HTTPS
- API安全的CORS配置

## 许可证

保留所有权利。

## 联系方式

如有问题和需要支持，请在仓库中提交issue。

