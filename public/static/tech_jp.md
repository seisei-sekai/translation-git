1. Z-Works 面接

(1) 自己紹介

2. 技術スタック（現在）
   2.1 フルスタック
   2.2 フロントエンド

JavaScript / React（State Management: useState, useRef, useEffect）

WebSocket（接続、イベント送信、リアルタイム通信帯域の最適化）

Vue（React ベースの実装から移植経験あり）

Dart（Java / C# / C++ に類似）および React Native
　 → React から容易に移植可能（iOS Swift の構造に近い）

計算量最適化（O(N²) 以上の設計回避、例: 多重ループの防止）

エラーハンドリング（API レベルに限らず体系的な Try-Except 設計）

ユニットテスト（数値範囲・型・ロジック・例外処理の検証）

UI/UX デザイン（Google Material Design、カラーデザイン理論、アクセシビリティ対応フォントサイズ、A/B テスト、Cursor によるプロトタイピング、Noto Sans 使用）

2.3 バックエンド

Flask（ユーザー管理、JWT トークン/セッション管理、RESTful API: GET/POST/DELETE）

MySQL（および PostgreSQL 対応、検索/マイグレーション/リレーション設計経験）

Docker（開発環境・バージョン整合性管理）

Nginx（ドメインルーティング、TCP/IP プロトコル制御、帯域制御）

Redis（キャッシュ処理による計算負荷削減）

サードパーティ API 連携

Node.js / MongoDB 利用経験

i18n（JSON 辞書ベースの国際化対応）

2.4 インフラ / ロジスティクス

AWS（EC2, RDS, ECS ※Load Balancer は計画中/未実装）

GitHub（ローカル PC と EC2 Ubuntu 間での add/commit/push/fetch/pull 運用）

Cloudflare（キャッシュ、DDoS 防御、Web スクレイピング対策）

Google Analytics / Web トラッキング

2.5 機械学習
■ 伝統的アルゴリズム（即利用可能）

XGBoost / CatBoost / Bagging / Ensemble Learning（モデル比較選択）

Python（scikit-learn + 最適化済み inference ライブラリ）

データマイニング: Agglomerative Clustering / KNN / Manifold Learning（Kernel PCA）など

■ 深層学習

事前学習モデルによる推論：CNN / RCNN / U-Net / ResNet / Transformer（PyTorch、回帰/分類用途）

PyTorch によるカスタム学習

コンピュータビジョン：YOLO Fine-tuning（動画データセットでの物体検出）

■ LLM 応用・下流タスク

プロンプトエンジニアリング（科学的反復設計）

RAG（Retrieval-Augmented Generation：LangChain 等）

LLM Fine-Tuning：Llama 3.2（1B / 7B）

AI Agent デプロイ（Self-hosted DeepSeek-R1 推奨）

■ 利用している AI API

Sonic（高品質リアルタイム翻訳 API）

ElevenLabs（音声クローン + TTS/STS）

DeepInfra（LLM inference API）

2.6 デジタル信号処理

生体/時系列データ前処理：
　 PCA / ICA / Low-pass IIR Filter / STFT / Mel-spectrogram

2.7 エンジニアリング基礎スキル

Cursor / LaTeX / Unix / Vim / Git / Arduino

Pointer-based 言語（C/C++）

Unity（C#）

プロジェクト管理：Gantt Chart / OKR / KPI

PRD ドキュメント作成

3. 技術以外で貢献できる領域
   3.1 米国リサーチリソース

Stanford 教授: Takako Fujioka / Bruce McCandliss（Stanford School of Medicine、IRB アクセス・研究ネットワーク）

学術論文執筆、技術レポート作成、社内リサーチセミナー運営

医療予測・予防のためのエビデンスベース生体指標の実装

医療・ヘルステック関連ブログ執筆

3.2 米国 VC ネットワーク

Stanford 教授: Richard Dasher

シリコンバレー AI 投資ネットワーク

3.3 ビジネス経験

B2B セールス、B2C マーケティング経験

3.4 中国本土産業ネットワーク

医療：母が深圳児童医院にて管理職経験（現在退職）

VC：ZhenFund、KaikaiHuaCai（高齢者ヘルスケア機関、CEO ネットワーク）

AgeTech と Healthcare AI への考え

AgeTech は非常に意義深い分野だと思います。
日本に来た当初、Apple Vision Pro の登場により、没入型体験が高齢者や身体的制限のある方々に「再び体験する権利」を与える点に着目し、「幸せ Tech（Well-being Tech）」を研究していました。

Stanford 在籍中には、Airweave（睡眠を AI で解析しアプリと連携するスマートベッド企業）についてビジネス分析発表を行いました。
また最近、シリコンバレーでは在宅介護向け AI Agent プロダクトが Seed 資金を獲得し始めており、AgeTech の未来に強い可能性を感じています。

LiveConnect への考察

LiveConnect は現在、非接触型行動データおよび間接生体信号の検知を行う統合型システムであり、Human-in-the-loop ワークフロー（例：看護スタッフ支援）の Co-pilot として機能しています。

将来的には、以下の拡張が期待できると考えています：

マルチモーダル信号統合

認知・感情レベルのインタラクション

家族の声を使ったパーソナル AI エージェント

Apple Vision Pro を活用した没入型体験

個別化ケア支援機能の高度化
