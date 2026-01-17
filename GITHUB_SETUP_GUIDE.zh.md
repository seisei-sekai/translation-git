# GitHub 仓库设置指南（中文版）

本指南将帮助你将项目从私有仓库迁移到新的公开仓库，并配置 GitHub Pages。

## 步骤 1：在 GitHub 创建新的公开仓库

1. 访问 https://github.com/new
2. 填写仓库信息：
   - Repository name: 选择合适的名字
   - Description: "Modern real-time multilingual instant messaging with AI-powered translation"
   - Visibility: 选择 **Public**（公开）
   - ⚠️ **不要**勾选 "Initialize this repository with a README"
3. 点击 "Create repository"
4. 记下新仓库的 URL：`https://github.com/your-username/your-repo-name.git`

## 步骤 2：切换 Git 远程仓库

```bash
cd /Users/benz/Desktop/AItravel/QRCode_translation/stealth-translation-git

# 查看当前远程仓库
git remote -v

# 移除旧的远程仓库
git remote remove origin

# 清理 Git 历史（推荐）
rm -rf .git
git init
git add .
git commit -m "Initial commit: Real-time translation app"

# 添加新的远程仓库
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git

# 推送
git branch -M main
git push -u origin main
```

## 步骤 3：配置 GitHub Pages

1. 进入仓库 Settings（设置）
2. 在左侧菜单找到 Pages
3. Source 部分：
   - 选择 "Deploy from a branch"
   - Branch: 选择 `main`
   - Folder: 选择 `/docs`
4. 点击 "Save"

部署完成后（2-5分钟），文档将在以下地址可用：
```
https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/
```

## 步骤 4：创建本地环境变量文件

```bash
# 后端配置
cp server/.env.example server/.env
# 编辑 server/.env 填入实际值

# 前端配置
cp .env.frontend.example .env
# 编辑 .env 填入实际值
```

⚠️ **重要**：不要将 `.env` 文件提交到 Git！

## 推送前检查清单

- [ ] 运行 `git status` 确认没有 `.env` 文件
- [ ] 确认代码中没有硬编码的密钥
- [ ] 确认数据库密码已移除

## 验证命令

```bash
# 检查 Stripe keys
grep -r "sk_live_\|pk_live_" . --exclude-dir={node_modules,build,.git}

# 检查硬编码密码
grep -r "password.*=.*['\"]" server/ --exclude-dir={__pycache__,instance}
```

详细步骤请参考 `GITHUB_SETUP_GUIDE.md`（英文完整版）。

