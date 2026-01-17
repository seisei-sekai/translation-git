# GitHub 仓库设置指南

本指南将帮助你将项目从私有仓库迁移到新的公开仓库，并配置 GitHub Pages。

## 第一步：在 GitHub 创建新的公开仓库

1. 访问 https://github.com/new
2. 填写仓库信息：
   - Repository name: 选择一个合适的名字（例如：`real-time-translation-app`）
   - Description: "Modern real-time multilingual instant messaging with AI-powered translation"
   - Visibility: **Public**（选择公开）
   - ⚠️ **不要**勾选 "Initialize this repository with a README"
   - ⚠️ **不要**添加 .gitignore 或 license（我们已经有了）
3. 点击 "Create repository"
4. 记下新仓库的 URL，格式为：`https://github.com/your-username/your-repo-name.git`

## 第二步：切换 Git 远程仓库

在项目目录中执行以下命令：

```bash
cd /Users/benz/Desktop/AItravel/QRCode_translation/stealth-translation-git

# 查看当前的远程仓库
git remote -v

# 移除旧的远程仓库
git remote remove origin

# 添加新的远程仓库（替换为你的新仓库 URL）
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git

# 验证新的远程仓库
git remote -v
```

## 第三步：清理 Git 历史（可选但推荐）

由于要上传到公开仓库，建议清理历史记录中可能包含的敏感信息：

### 方法一：完全重置（推荐 - 最干净）

```bash
# 删除 .git 目录
rm -rf .git

# 重新初始化 Git
git init

# 添加所有文件
git add .

# 创建初始提交
git commit -m "Initial commit: Real-time translation app"

# 添加远程仓库
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git

# 推送到远程仓库
git branch -M main
git push -u origin main --force
```

### 方法二：保留历史但清理敏感文件

如果你想保留 commit 历史但确保敏感文件被完全移除：

```bash
# 使用 git filter-repo（需要先安装）
# macOS: brew install git-filter-repo
# 或使用 pip: pip install git-filter-repo

# 从历史中移除敏感文件
git filter-repo --path README --invert-paths
git filter-repo --path setup_gcp_mysql.sh --invert-paths
git filter-repo --path final_deploy.sh --invert-paths

# 重新添加远程仓库（filter-repo 会移除 remote）
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git

# 推送
git push -u origin main --force
```

## 第四步：推送代码到新仓库

```bash
# 确保在正确的分支（通常是 main 或 master）
git branch

# 如果需要，切换到主分支
git checkout main

# 推送代码
git push -u origin main
```

## 第五步：配置 GitHub Pages

### 在 GitHub 网站上配置：

1. 进入你的仓库页面
2. 点击 "Settings"（设置）
3. 在左侧菜单找到 "Pages"
4. 在 "Source" 部分：
   - 选择 "Deploy from a branch"
   - Branch: 选择 `main`（或你的主分支）
   - Folder: 选择 `/docs`
5. 点击 "Save"

### 等待部署：

- GitHub 会自动构建和部署你的文档
- 部署完成后，你会看到一个绿色提示框显示网站 URL
- URL 格式：`https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`
- 首次部署可能需要 2-5 分钟

### 验证部署：

访问以下 URL 确认文档已上线：
- 主页：`https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`
- 架构文档：`https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/architecture.html`
- API 文档：`https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/api-documentation.html`

## 第六步：更新文档链接

编辑 `docs/index.html`，将 GitHub 仓库链接更新为你的实际链接：

```html
<a href="https://github.com/YOUR-USERNAME/YOUR-REPO-NAME" target="_blank">GitHub Repository</a>
```

然后提交并推送：

```bash
git add docs/index.html
git commit -m "Update GitHub repository link"
git push
```

## 第七步：验证没有敏感信息

在推送前，请确认以下文件不包含敏感信息：

```bash
# 搜索可能的 API keys
grep -r "sk_live_" . --exclude-dir={node_modules,build,.git}
grep -r "pk_live_" . --exclude-dir={node_modules,build,.git}

# 搜索可能的密码
grep -r "password.*=.*['\"]" server/ --exclude-dir={__pycache__,instance}

# 确认 .env 文件被忽略
git status

# 查看将要提交的内容
git diff --cached
```

## 第八步：创建 .env 文件（本地使用）

**重要：** 在本地创建 `.env` 文件用于开发，但**不要**提交到 Git：

### 后端 .env (在 server 目录)：
```bash
cp server/.env.example server/.env
# 然后编辑 server/.env 填入你的实际密钥
```

### 前端 .env (在根目录)：
```bash
cp .env.frontend.example .env
# 然后编辑 .env 填入你的实际配置
```

## 第九步：添加仓库描述和标签

在 GitHub 仓库页面：

1. 点击仓库名称下方的 "⚙️ Edit" 或直接编辑 "About" 部分
2. 添加描述：
   ```
   Modern real-time multilingual instant messaging with AI-powered translation
   ```
3. 添加网站 URL（你的 GitHub Pages URL）
4. 添加标签（Topics）：
   ```
   react, flask, translation, websocket, ai, real-time, chat, multilingual, 
   socketio, mysql, docker, i18n, openai, stripe
   ```
5. 点击 "Save changes"

## 第十步：创建项目 README Badge（可选）

在 `README.md` 顶部添加一些 badges：

```markdown
# Real-Time Translation App

![GitHub](https://img.shields.io/github/license/YOUR-USERNAME/YOUR-REPO-NAME)
![GitHub stars](https://img.shields.io/github/stars/YOUR-USERNAME/YOUR-REPO-NAME)
![GitHub forks](https://img.shields.io/github/forks/YOUR-USERNAME/YOUR-REPO-NAME)

...rest of README...
```

## 检查清单

在完成上述步骤后，请确认：

- [ ] 新仓库已创建且为公开（Public）
- [ ] 代码已推送到新仓库
- [ ] GitHub Pages 已配置并成功部署
- [ ] 文档网站可以访问
- [ ] 所有敏感信息（keys, passwords, IPs, URLs）已移除
- [ ] .gitignore 正确配置
- [ ] .env.example 文件已创建
- [ ] README 链接正确指向新仓库
- [ ] 仓库描述和标签已添加

## 常见问题

### Q: GitHub Pages 显示 404
A: 确保：
1. 在 Settings > Pages 中选择了正确的分支和 `/docs` 文件夹
2. `docs/index.html` 文件存在
3. 等待 2-5 分钟让部署完成

### Q: 如何验证没有敏感信息？
A: 使用以下命令：
```bash
# 检查历史中的敏感信息
git log --all --full-history --source --

