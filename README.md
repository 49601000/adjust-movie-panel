# 調整パネル (adjust-movie-panel)

動画のレンダリング前に、制作側（めたまる）が用意した「対応表」をブラウザ上で
調整して、修正依頼を Google Drive に返すための小規模ツール。
対象は動画制作ライン全般（心理学JP長尺・各種 Shorts）。

## 目的

- 1センテンス＝1行の対応表（スライド／表情／改行／SE／タイミング）を、
  レンダリング前に目視で確認・調整できるようにする
- 調整結果は「めたまるへの伝言」として Drive に保存し、制作側が読んで反映する
  （厳密なレンダリング仕様ではなく、コミュニケーション用の依頼票という位置づけ）

## 仕組み

Google Apps Script の HTML ウェブアプリ（Drive の読み書きがネイティブなため）。

1. めたまる：話ごとのフォルダに `adjust_mapping.json`（対応表＋プレビュー静止画）を置く
2. イッチ：ウェブアプリで話を選び、行ごとに調整 → 保存ボタン
3. アプリ：同じフォルダに `adjust_request.json`（変更分のみ、または構成変更時は全行）を保存
4. めたまる：依頼を読んで反映し、レンダリングする

アプリは Drive 内の `adjust_mapping.json` を検索して一覧化するので、
対応表を置くフォルダはどこでもよい。

## リポジトリ内のファイル

| ファイル | 内容 |
|---|---|
| `Code.gs` | サーバー側（Drive 検索・読み込み・保存、共用カタログ走査） |
| `Index.html` | 画面側（行パネル編集、カスケード、差分計算） |
| `DESIGN.md` | 設計の正本（データ契約・運用フロー・デプロイ実績） |
| `sample_mapping.json` | 対応表のサンプル |

ローカル正本は めたまる の workspace（`~/workspace/adjust_app/`）で、
このリポジトリはそのスナップショット。

## データ契約（概要）

詳細は `DESIGN.md` を参照。

- `adjust_mapping.json`（めたまる → Drive）
  - version / episode / format（long|short）/ fps / size / maxChars
  - catalogs: slides / expr_z / expr_m / se
  - lines[]: n / sp（Z|M）/ text / breaks / slide / expr_z / expr_m /
    onset / offset（フレーム番号）/ se（{id, frame}|null）/ still（静止画の Drive ID）/ note
- `adjust_request.json`（アプリ → Drive、version 2）
  - 通常編集: `changes[]` に変更した行・項目だけ
  - 行の分割・追加・削除をした場合は `structure_changed: true` ＋ `lines[]` に全行
- タイミングはフレーム番号で保持し、1行の onset/offset を変えると後続行が
  自動でずれる（カスケード）。行の SE フレームも onset に追随する

## 共用アセット（shared-assets）

表情セットと SE は、Drive フォルダ **「調整パネル_shared-assets」** を正とする。
アプリ起動時に走査してカタログ化するので、ここに足せば自動で選択肢に載る。

```
調整パネル_shared-assets/
  characters/
    zundamon/<セット名>/*.png   → 表情（ずんだもん）の選択肢
    metan/<セット名>/*.png      → 表情（めたん）の選択肢
  se/<名前>.mp3                 → SE の選択肢（ファイル名がそのまま ID/表示名）
```

## デプロイ

- GAS プロジェクト「調整パネル」（個人アカウント配下、実行＝自分／アクセス＝自分のみ）
- ウェブアプリ: https://script.google.com/macros/s/AKfycbxAGv37UG7TPK8AbElw2esw-4sO-gFMH2_YdkHYNun0uBJhRq16xSOa4yJsOYY_08IX/exec
- コードの更新は GAS エディタ経由で行い、「デプロイを管理」から
  新しいバージョンとして再デプロイすると URL は変わらない

## 現在の状態

- v2 稼働中（2026-11-15）
  - v1: 一覧・読み込み・編集（スライド／表情／改行／SE／タイミング）・差分保存
  - v2: 行の分割・追加・削除、セリフと話者の編集、共用カタログ（shared-assets）対応、
    改行の上限超過を強制改行＋赤字警告で目視検出（全角=1・半角=0.5 で計数）
- 既知の軽微な問題は `DESIGN.md` のデプロイ実績欄に記録
