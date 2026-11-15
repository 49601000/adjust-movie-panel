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
  → **v2 で修正済み**（`.summary[hidden]{display:none}` を追加）

## v2 反映実績（2026-11-15 22:14〜）
- Code.gs／Index.html を v2 に全面差し替え、GAS バージョン3として再デプロイ（URL 不変）
- E2E 検証OK: 実対応表 TRIAL_001（14行）が一覧に出て読み込め、静止画も表示。
  表情は共用カタログから ずんだもん8セット／めたん5セット、SE は共用9件が選択肢に出た
- 分割テスト（テスト用サンプルで実施）: #2 を分割 → 5行化・サマリー「構成変更（全5行）」→
  保存成功。Drive 側でも adjust_request.json が version:2 / structure_changed:true /
  lines 5行（分割点 207–273・273–340）で保存されたことを確認
- 強制改行の目視検出も作動（読み込み時に超過行へ ⚠ 表示）。ただし初版はコードポイント
  単純計数で数字を含む行（#8・#10）が誤検出されたため、全角=1・半角=0.5 の重み付けに
  修正するパッチを続けて適用（→ GAS バージョン4、2026-11-15 22:37。再検証で警告は
  本当に超過している #2・#7・#13 のみに一致、サマリー「変更: 3 行」）
- 注意点: 対応表側カタログの SE id は共用フォルダのファイル名と一致させること。
  v1 サンプルは slug id（se_switch 等）で、ラベルが同じでも別 id として和集合に
  両方出た（実対応表はファイル名 id で生成しており問題なし。サンプルは修正済み）
- GitHub: private リポ https://github.com/49601000/adjust-movie-panel （イッチ作成、project-template 由来）へ
  Code.gs / Index.html / DESIGN.md / sample_mapping.json を push 済み（2026-11-15、main、commit f9b16a3）。
  ローカル正本は ~/workspace/adjust_app/、同期記録は ~/workspace/adjust_app.muse-github-snapshot-sync.json。

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

## 修正依頼 adjust_request.json（イッチ→Drive、version 2）
- **位置づけ：あくまでイッチ→めたまるのコミュニケーション用**（厳密な機械仕様ではない）。
  めたまるが意図を読んで反映する。前提として行ごとの自由記述メモ（note）欄を持つ
- コードは GitHub の private リポジトリでも管理する（2026-11-15 イッチ決定）
- 通常編集では、変更した行・変更した項目だけを書く（トークン節約・誤読防止）
- changes[]: n ＋ 変更フィールド（text / sp / slide / expr_z / expr_m / breaks / onset / offset / se / note）
- スライド新規作成の依頼： slide="NEW" ＋ create（作成指示テキスト）
- SE差し込み： se={id, frame}（フレーム位置指定）
- **行構成を変えた場合**（分割・追加・削除）は `structure_changed: true` ＋ `lines[]` に
  全行を新しい順序・番号で書き出す（差分では表現できないため。めたまるは lines を新しい正とする）

## 改行の強制リフロー（v2、2026-11-15 イッチ要望）
- 改行表示の1行が上限（maxChars、全角=1・半角=0.5 で計数）を超えたら、収まる位置で
  強制的に改行を割り込ませ、行に赤字で「⚠ N文字で強制改行」と出す
- 効くタイミング：対応表の読み込み時（制作側の超過も開いた瞬間に見える）と、
  改行欄の編集を終えたとき
- 強制改行された行は「変更あり」になり、保存すれば依頼にも載る。位置が不自然なら
  その場で改行位置を直す運用
- 実測（TRIAL_001）: ユーザー確定の改行でも 14〜15字の行が3行あり（#2/#7/#13）、
  数字を含む行は半角計数で 13.0 に収まる。計数をコードポイント単純数えにすると
  数字行が誤検出されるため、全角/半角の重み付けが必須

## 行の構成操作（v2、2026-11-15 イッチ要望）
- 各行に「分割」「+行」「削除」ボタン。セリフ（text）と話者（sp）も編集可能
- 分割：元の行は onset〜中点（floor）、新しい行は中点〜元の offset。セリフ等はコピーが入り、
  イッチが両側を削って整える。SE は元の行に残る
- 追加：前の行の offset 位置に空行（話者は前の行と同じ）
- 削除：1行だけのときは不可

## 共用カタログ shared-assets（v2、2026-11-15 イッチ要望）
- 表情セットと SE の正は Drive フォルダ **「調整パネル_shared-assets」**（ID `1oMc447xUEsA15rPLmABwzvCm0Inu_Kme`）
  - `characters/zundamon/<セット名>/*.png` → expr_z の選択肢（フォルダ名＝セット名）
  - `characters/metan/<セット名>/*.png` → expr_m の選択肢
  - `se/<名前>.mp3|wav|m4a` → SE の選択肢（拡張子を除いたファイル名が id/label）
- アプリは起動時にこのフォルダを走査（Code.gs `getSharedCatalogs`）し、対応表側のカタログと
  ユニオンして使う（共用側が優先、同 id の SE は共用側のラベルが勝つ）
- ここにセットや SE を足せば、アプリの選択肢に自動で載り、めたまるも同じフォルダで把握できる
- 初期登録（2026-11-15）: ずんだもん8セット／めたん5セット（全フレーム）、SE 9件

## タイミングの扱い
- 時刻ではなく **フレーム番号**（onset / offset）で保持する
- イッチが1行の onset / offset を変えたら、後続行はアプリ側で自動でずらして再計算（カスケード）
- 依頼ファイルには、結果としてフレームが変わった行をすべて明示する（めたまる側で再導出しない）

## 対象範囲
- 長尺・ショート両対応（スキーマ共通。format と size が違うだけ）
- プロジェクト一覧は Drive 内の adjust_mapping.json を検索して自動収集（ラインごとのルート固定なし）
