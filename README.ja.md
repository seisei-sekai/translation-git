# リアルタイム翻訳アプリ

先進的なAI翻訳機能を備えた、モダンなリアルタイム多言語インスタントメッセージングアプリケーション。

## 概要

本アプリケーションは、インスタントメッセージング機能とAI翻訳、音声クローニング、共同チャットルーム機能を組み合わせ、言語の壁を越えたシームレスなリアルタイムコミュニケーションを提供します。

## 主な機能

### コア機能
- WebSocketによるリアルタイムインスタントメッセージング
- AI翻訳（50以上の言語対応）
- 音声クローニングによる音声メッセージ翻訳
- 写真・画像の翻訳と解釈
- マルチユーザーチャットルーム

### ユーザー体験
- クイックアクセス用ゲストモード
- プライベート・パブリックチャットルーム
- QRコードによるルーム共有
- カスタマイズ可能な言語設定
- トークンベースの利用システム

### 高度な機能
- 音声テキスト変換
- 翻訳音声の音声クローニング
- 位置情報機能
- ユーザー友達システム
- Stripeによるサブスクリプション管理
- 企業紹介コード

## 技術スタック

### フロントエンド
- React 18
- Socket.IO Client
- Material Icons
- React Router
- i18next（国際化）
- Stripe.js（決済）
- Chart.js（分析）

### バックエンド
- Python Flask
- Socket.IO
- SQLAlchemy（ORM）
- MySQL 8
- JWT認証
- OpenAI API
- ElevenLabs API

### インフラストラクチャ
- Docker & Docker Compose
- Nginx（リバースプロキシ）
- Eventlet（非同期サポート）
- Gunicorn（本番サーバー）

## クイックスタート

### 前提条件
- Docker と Docker Compose
- Node.js 14+（ローカル開発用）
- Python 3.9+（ローカル開発用）

### 環境セットアップ

1. リポジトリのクローン
```bash
git clone <your-repo-url>
cd stealth-translation-git
```

2. 環境変数の設定

バックエンド（serverディレクトリの.env）:
```bash
cp server/.env.example server/.env
# server/.envを実際の値で編集
```

フロントエンド（ルートディレクトリの.env）:
```bash
cp .env.frontend.example .env
# .envを実際の値で編集
```

3. Docker Composeで起動
```bash
docker-compose up --build
```

アプリケーションは以下でアクセス可能:
- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:5002

## 設定

### 必須環境変数

#### バックエンド設定
- `SECRET_KEY`: Flaskシークレットキー
- `JWT_SECRET_KEY`: JWTトークン署名キー
- `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_NAME`: データベース認証情報
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth
- `STRIPE_SECRET_KEY`: Stripe決済処理
- `OPENAI_API_KEY`: OpenAI翻訳API
- `ELEVENLABS_API_KEY`: ElevenLabs音声クローニング

#### フロントエンド設定
- `REACT_APP_API_URL`: バックエンドAPI URL
- `REACT_APP_STRIPE_PUBLISHABLE_KEY`: Stripe公開鍵

## アーキテクチャ

### システムコンポーネント

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   React     │◄───────►│   Flask     │◄───────►│   MySQL     │
│  フロント   │         │  バック     │         │ データベース │
└─────────────┘         └─────────────┘         └─────────────┘
      │                       │
      │                       ├──────────► OpenAI API
      │                       │
      └───────────────────────├──────────► ElevenLabs API
            Socket.IO         │
                             └──────────► Stripe API
```

### データベーススキーマ

- **Users**: ユーザープロファイル、認証、トークン
- **Chatrooms**: ルーム設定、プライバシー、メンバー
- **Messages**: テキスト、音声、写真メッセージ
- **Friendships**: ユーザー接続
- **Notifications**: システム通知
- **Metrics**: 使用分析

## 開発

### ローカル開発セットアップ

#### フロントエンド
```bash
npm install
npm start
```

#### バックエンド
```bash
cd server
pip install -r requirements.txt
python app.py
```

### 本番ビルド

```bash
npm run build
docker-compose build
docker-compose up -d
```

## APIドキュメント

詳細なAPIドキュメントは [docs/api-documentation.md](docs/api-documentation.md) を参照してください。

## セキュリティ

- すべてのAPIキーは環境変数で設定する必要があります
- JWTベース認証
- bcryptによるパスワード暗号化
- 本番環境ではHTTPS必須
- APIセキュリティのためのCORS設定

## ライセンス

全権利保有。

## お問い合わせ

質問やサポートについては、リポジトリでissueを開いてください。

