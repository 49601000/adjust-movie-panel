# 調整アプリ 設計 v0.1（2026-11-15、イッチ決定事項を反映）

## 目的
レンダリング前に、めたまるが「対応表（イメージ）」を Drive に置き、イッチがブラウザ上で
スライド／表情／改行／SE／タイミングを調整して、修正依頼をボタン1つで Drive に返すツール。
ベースは既存の単一HTMLアプリ「Final Cut Panel」（行パネル＋仕様出力の型）。

## 形態
- Google Apps Script の HTML ウェブアプリ（Drive の読み書きがネイティブにできるため GAS 一択。
  GitHub Pages は Drive 書き込みに別途 OAuth 配管が要るので不採用）
- スクリプトは個人アカウント（⭐︎2-長尺の所有者）配下。デプロイ＝実行：自分として実行／アクセス：自分のみ
- 設置（プロジェクト作成・デプロイ）はめたまるがイッチの Chrome 経由で実施（イッチ依頼済み）

## デプロイ実績（2026-11-15 完了）
- プロジェクト「調整パネル」: https://script.google.com/home/projects/1d4MhiPFMon5jVmsqTaZm113wxZVikKud82Gr1DbNpf7CIyxO-QsQPDct/edit
- ウェブアプリ URL（v2、2026-11-15 21:14）: https://script.google.com/macros/s/AKfycbxAGv37UG7TPK8AbElw2esw-4sO-gFMH2_YdkHYNun0uBJhRq16xSOa4yJsOYY_08IX/exec
- E2E 検証済み（テストフォルダ「調整パネル_テスト」ID `1F02XAx2rZjBd5pk_5yOYLATlnGLHZKsd`、サンプル対応表4行）:
  一覧取得→読み込み→伝言メモ編集→onset 変更のカスケード（offset・SEフレーム追随）→差分のみの
  adjust_request.json が同一フォルダに保存されることまで、Drive 側でも内容を確認済み。
- 教訓: GAS エディタは貼り付け不可で打鍵入力になるため、自動閉じ括弧の混入が起きる（v1 では
  コメント行頭に余分な `}` が付き、SyntaxError で全停止した。コンソールの
  `userCodeAppPanel:358` はエディタ行番号と対応しない）。今後のコード更新は小さな差分で入れ、
  投入後に必ず実機で開いて確認する。
- 既知の軽微な問題: 読み込み前から変更件数バーが見える（.summary の display:flex が hidden を上書き）。実害なし、後日 CSS で修正。

## 運用フロー
1. めたまる：話ごとのフォルダに `adjust_mapping.json`（対応表＋カタログ＋静止画参照）を置く
2. イッチ：アプリでプロジェクト（話）を選び、行ごとに調整 → 保存ボタンで
   `adjust_request.json` が同じフォルダに自動保存される
3. めたまる：依頼を読んで反映し、レンダリングする

## 単位の原則（イッチ指示 2026-11-15）
- 発話の管理は **1センテンス＝1単位**（VOICEVOX 出力もセンテンス単位で管理する）
- シーン（スライド）の切り替えもセンテンス単位でできれば十分
- アプリの1行＝1センテンス

## 対応表 adjust_mapping.json（めたまる→Drive）
- version / episode / format（long|short）/ fps（30）/ size
- catalogs: slides（id・label・サムネ参照）/ expr_z / expr_m（セット名のみ、0000番台の粒度なし）/ se（id・label）
- lines[]: n / sp（Z|M）/ text / breaks（現在の改行。script_breaks 形式）/
  slide / expr_z / expr_m / onset（開始フレーム）/ offset（終了フレーム）/
  se（{id, frame} または null）/ still（プレビュー静止画の Drive ファイルID）

## プレビュー静止画
- 行ごとの静止画（スライド＋両キャラ合成）は **レンダリング工程の副産物として自動生成** される
  （フレーム生成ステップの流用。めたまるの追加手作業なし＝イッチの「重たくなければ／毎回作るなら too much」条件を満たす）

## 修正依頼 adjust_request.json（イッチ→Drive、差分のみ）
- **位置づけ：あくまでイッチ→めたまるのコミュニケーション用**（厳密な機械仕様ではない）。
  めたまるが意図を読んで反映する。前提として行ごとの自由記述メモ（note）欄を持つ
- コードは GitHub の private リポジトリでも管理する（2026-11-15 イッチ決定）
- 変更した行・変更した項目だけを書く（トークン節約・誤読防止）
- changes[]: n ＋ 変更フィールド（slide / expr_z / expr_m / breaks / onset / offset / se）
- スライド新規作成の依頼： slide="NEW" ＋ create（作成指示テキスト）
- SE差し込み： se={id, frame}（フレーム位置指定）

## タイミングの扱い
- 時刻ではなく **フレーム番号**（onset / offset）で保持する
- イッチが1行の onset / offset を変えたら、後続行はアプリ側で自動でずらして再計算（カスケード）
- 依頼ファイルには、結果としてフレームが変わった行をすべて明示する（めたまる側で再導出しない）

## 対象範囲
- 長尺・ショート両対応（スキーマ共通。format と size が違うだけ）
- プロジェクト一覧は Drive 内の adjust_mapping.json を検索して自動収集（ラインごとのルート固定なし）
