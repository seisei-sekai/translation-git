# Server 后端服务说明文档

## 📁 项目结构

```
server/
├── app.py                              # Flask应用主入口
├── app_legacy.py                       # 旧版本应用（仅供参考）
├── extensions.py                       # Flask扩展初始化
├── requirements.txt                    # Python依赖包列表
├── Dockerfile                          # Docker容器配置
├── gunicorn_config.py                  # Gunicorn生产服务器配置
├── init-db.sql                         # 数据库初始化SQL脚本
├── config/                             # 配置文件目录
│   ├── __init__.py
│   ├── constants.py                    # 应用常量定义
│   └── config.py                       # 应用配置
├── routes/                             # API路由蓝图
│   ├── __init__.py
│   ├── auth.py                         # 认证相关路由（登录、注册、Google OAuth）
│   ├── user.py                         # 用户管理路由
│   ├── chatroom.py                     # 聊天室管理路由
│   ├── payment.py                      # 支付相关路由（Stripe集成）
│   ├── audio.py                        # 音频处理路由
│   ├── translation.py                  # 翻译服务路由
│   └── misc.py                         # 其他杂项路由
├── socket_handlers/                    # WebSocket事件处理
│   ├── __init__.py
│   └── events.py                       # Socket.IO事件处理器
├── services/                           # 业务逻辑服务
│   ├── __init__.py
│   ├── metrics_service.py              # 指标监控服务
│   └── debug_logging.py                # 调试日志服务
├── models/                             # 数据库模型
│   ├── __init__.py
│   ├── user.py                         # 用户模型
│   ├── chatroom.py                     # 聊天室模型
│   ├── message.py                      # 消息模型
│   ├── metrics.py                      # 指标模型
│   └── debug_log.py                    # 调试日志模型
├── utils/                              # 工具函数
├── uploads/                            # 文件上传目录
│   ├── avatars/                        # 用户头像
│   ├── chatroom_audio/                 # 聊天室音频
│   ├── chatroom_photo/                 # 聊天室照片
│   ├── clonedTranslatedVoice/          # 克隆翻译语音
│   └── voice_clone_reference/          # 语音克隆参考音频
├── instance/                           # 实例文件夹（数据库等）
└── legacy/                             # 旧代码存档

# 其他独立脚本
├── elevenlabs_tts.py                   # ElevenLabs文字转语音
├── gpt_api_parrallel_processor.py      # GPT API并行处理器
├── spatial_search.py                   # 空间搜索功能
├── streaming.py                        # 流式处理
├── stripe_payment.py                   # Stripe支付处理
└── translation_queue.py                # 翻译队列管理
```

## 🚀 核心功能

### 1. 认证系统
- **常规注册/登录**：邮箱密码方式
- **Google OAuth**：第三方登录
- **访客模式**：无需注册即可使用
- **JWT令牌**：基于Token的身份验证

### 2. 聊天室功能
- **公共聊天室**：所有用户可见
- **私有聊天室**：需要密码或邀请
- **实时通信**：基于WebSocket的即时消息
- **用户管理**：创建者可管理成员

### 3. 音频处理
- **语音转文字**：实时语音识别
- **文字转语音**：AI语音合成
- **语音克隆**：个性化语音
- **音频上传**：支持多种音频格式

### 4. 翻译服务
- **实时翻译**：多语言即时翻译
- **翻译队列**：异步处理翻译任务
- **语言检测**：自动识别源语言

### 5. 支付系统
- **Stripe集成**：安全的支付处理
- **订阅管理**：月度/年度订阅计划
- **支付验证**：确保支付状态同步

## 🛠️ 技术栈

- **Web框架**: Flask 3.0.0
- **实时通信**: Flask-SocketIO
- **数据库**: SQLAlchemy (支持SQLite/PostgreSQL/MySQL)
- **身份验证**: Flask-JWT-Extended
- **支付系统**: Stripe
- **AI服务**: OpenAI GPT-4, ElevenLabs
- **生产服务器**: Gunicorn
- **容器化**: Docker

## 📋 环境变量配置

在运行前，需要配置以下环境变量（在`.env`文件中）：

```bash
# Flask配置
FLASK_ENV=production
SECRET_KEY=your-secret-key-here

# 数据库配置
DATABASE_URL=sqlite:///app.db

# JWT配置
JWT_SECRET_KEY=your-jwt-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Stripe配置
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key

# OpenAI配置
OPENAI_API_KEY=your-openai-api-key

# ElevenLabs配置
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# 服务器配置
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

## 🚀 启动方式

### 开发环境

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 初始化数据库
flask db upgrade

# 3. 启动开发服务器
python app.py
```

### 生产环境

```bash
# 使用Gunicorn启动
gunicorn -c gunicorn_config.py app:app
```

### Docker部署

```bash
# 构建镜像
docker build -t realtime-transcription-server .

# 运行容器
docker run -p 5000:5000 --env-file .env realtime-transcription-server
```

## 📡 API端点说明

### 认证相关 (`/api/auth/*`)
- `POST /api/register` - 用户注册
- `POST /api/login` - 用户登录
- `POST /api/logout` - 用户登出
- `GET /api/auth/google` - Google OAuth登录
- `GET /api/auth/google/callback` - Google OAuth回调

### 用户管理 (`/api/user/*`)
- `POST /api/delete-account` - 删除账户
- `POST /api/update-username` - 更新用户名
- `POST /api/change-password` - 修改密码
- `POST /api/upload-avatar` - 上传头像
- `GET /api/user-chatrooms/<user_id>` - 获取用户聊天室列表

### 聊天室管理 (`/api/chatroom/*`)
- `POST /api/create-chatroom` - 创建聊天室
- `POST /api/join-chatroom` - 加入聊天室
- `POST /api/leave-chatroom` - 离开聊天室
- `POST /api/get-chatroom-messages` - 获取聊天室消息

### 支付相关 (`/api/payment/*`)
- `POST /api/create-checkout-session` - 创建支付会话
- `POST /api/verify-payment` - 验证支付状态
- `POST /api/check-subscription-status` - 检查订阅状态
- `POST /api/cancel-subscription` - 取消订阅

## 🔌 WebSocket事件

### 客户端发送事件
- `join_room` - 加入聊天室
- `leave_room` - 离开聊天室
- `send_message` - 发送消息
- `audio_stream` - 音频流数据
- `request_translation` - 请求翻译

### 服务器发送事件
- `user_joined` - 用户加入通知
- `user_left` - 用户离开通知
- `new_message` - 新消息通知
- `translation_result` - 翻译结果
- `audio_transcription` - 音频转文字结果

## 🔒 安全特性

1. **JWT认证**: 所有需要认证的API都使用JWT令牌
2. **密码加密**: 使用bcrypt加密存储密码
3. **CORS配置**: 限制跨域请求来源
4. **输入验证**: 严格的输入数据验证
5. **速率限制**: 防止API滥用

## 📊 数据库模型

### User（用户表）
- 用户基本信息（ID、用户名、邮箱、密码）
- 订阅信息（订阅计划、状态）
- 访客标记（is_guest）

### ChatRoom（聊天室表）
- 聊天室信息（ID、名称、创建者）
- 隐私设置（is_private、密码）
- 成员管理

### Message（消息表）
- 消息内容（文字、音频）
- 发送者信息
- 时间戳

### Metrics（指标表）
- 系统性能指标
- 用户使用统计
- 时间序列数据

## 🐛 调试

启用调试日志：

```python
# 在app.py中设置
app.config['DEBUG'] = True
app.config['LOG_LEVEL'] = 'DEBUG'
```

查看日志：
- 应用日志会记录在控制台
- 调试日志存储在`DebugLog`数据库表中

## 📝 注意事项

1. **数据库迁移**: 修改模型后记得执行数据库迁移
2. **环境变量**: 生产环境必须正确配置所有环境变量
3. **文件上传**: 确保`uploads/`目录有写权限
4. **WebSocket**: 生产环境需要配置消息队列（如Redis）
5. **API密钥**: 妥善保管所有第三方服务的API密钥

## 🔄 版本说明

- **app.py**: 当前生产版本，采用模块化架构
- **app_legacy.py**: 旧版本，仅供参考，不建议使用

## 📞 联系支持

如有问题，请查看日志文件或联系开发团队。

