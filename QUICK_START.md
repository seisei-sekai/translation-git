# 如何将这个项目上传到 GitHub

## 快速开始（3 步）

### 1. 创建 GitHub 公开仓库

访问 https://github.com/new，创建公开仓库，**不要**初始化 README

### 2. 切换远程仓库

```bash
cd /Users/benz/Desktop/AItravel/QRCode_translation/stealth-translation-git
rm -rf .git
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git branch -M main
git push -u origin main
```

### 3. 配置 GitHub Pages

Settings > Pages > Deploy from branch > 选择 `main` 和 `/docs`

## 详细文档

- **完整指南**: `START_HERE.md`
- **设置步骤**: `GITHUB_SETUP_GUIDE.md`
- **English**: `README.md`
- **日本語**: `README.ja.md`
- **中文**: `README.zh.md`

验证工具：运行 `./verify_clean.sh` 确认没有敏感信息
