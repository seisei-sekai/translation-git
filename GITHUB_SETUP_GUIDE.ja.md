# GitHubリポジトリ設定ガイド

このガイドは、プロジェクトをプライベートリポジトリから新しいパブリックリポジトリに移行し、GitHub Pagesを設定する手順を説明します。

## ステップ1：GitHubで新しいパブリックリポジトリを作成

1. https://github.com/new にアクセス
2. リポジトリ情報を入力：
   - Repository name: 適切な名前を選択
   - Description: "Modern real-time multilingual instant messaging with AI-powered translation"
   - Visibility: **Public**（パブリックを選択）
   - ⚠️ "Initialize this repository with a README"にチェックを**入れない**
3. "Create repository"をクリック
4. 新しいリポジトリのURLを記録：`https://github.com/your-username/your-repo-name.git`

## ステップ2：Gitリモートリポジトリを切り替え

```bash
cd /Users/benz/Desktop/AItravel/QRCode_translation/stealth-translation-git

# 現在のリモートリポジトリを確認
git remote -v

# 古いリモートリポジトリを削除
git remote remove origin

# Git履歴をクリーンアップ（推奨）
rm -rf .git
git init
git add .
git commit -m "Initial commit: Real-time translation app"

# 新しいリモートリポジトリを追加
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git

# プッシュ
git branch -M main
git push -u origin main
```

## ステップ3：GitHub Pagesを設定

1. リポジトリページで"Settings"をクリック
2. 左メニューから"Pages"を選択
3. Sourceセクション：
   - "Deploy from a branch"を選択
   - Branch: `main`
   - Folder: `/docs`
4. "Save"をクリック

デプロイ完了後（2-5分）、ドキュメントは以下のURLでアクセス可能：
```
https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/
```

## ステップ4：ローカル環境変数ファイルを作成

```bash
# バックエンド設定
cp server/.env.example server/.env
# server/.envを実際の値で編集

# フロントエンド設定
cp .env.frontend.example .env
# .envを実際の値で編集
```

⚠️ **重要**：`.env`ファイルをGitにコミットしないでください！

## プッシュ前のチェックリスト

- [ ] `git status`で`.env`ファイルが含まれていないことを確認
- [ ] コード内にハードコードされた秘密鍵がないことを確認
- [ ] データベースパスワードが削除されていることを確認

## 検証コマンド

```bash
# Stripe keysのチェック
grep -r "sk_live_\|pk_live_" . --exclude-dir={node_modules,build,.git}

# ハードコードされたパスワードのチェック
grep -r "password.*=.*['\"]" server/ --exclude-dir={__pycache__,instance}
```

詳細な手順については、`GITHUB_SETUP_GUIDE.md`（英語）を参照してください。

