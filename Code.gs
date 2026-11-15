/**
 * 調整パネル — サーバー側 (Google Apps Script)
 *
 * Drive 上の adjust_mapping.json（対応表）を検索して読み込み、
 * 修正依頼 adjust_request.json を同じフォルダへ保存する。
 * 配置ファイル名: 本ファイル = "Code.gs" / 画面 = "Index.html"
 *
 * 失敗時はすべて { ok: false, error: "..." } を返す（例外を投げない）。
 */

var MAPPING_NAME = 'adjust_mapping.json';
var REQUEST_NAME = 'adjust_request.json';

/** ウェブアプリの入口。Index.html を返す。 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('調整パネル')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * プロジェクト一覧。
 * Drive 内の adjust_mapping.json を検索し、更新日時の新しい順に返す。
 * 成功時: [{ mappingFileId, folderId, folderName, modified, episode, format }]
 *   - episode / format は mapping の JSON から読めた場合のみ入る（読めなければ null）
 */
function listProjects() {
  try {
    var it = DriveApp.searchFiles(
      "title = '" + MAPPING_NAME + "' and trashed = false");
    var rows = [];
    while (it.hasNext()) {
      var f = it.next();
      var parents = f.getParents();
      var folder = parents.hasNext() ? parents.next() : null;
      var episode = null;
      var format = null;
      try {
        var obj = JSON.parse(f.getBlob().getDataAsString('UTF-8'));
        if (obj) {
          episode = obj.episode != null ? obj.episode : null;
          format = obj.format != null ? obj.format : null;
        }
      } catch (ignore) {
        // 壊れた mapping があっても一覧自体は返す
      }
      rows.push({
        mappingFileId: f.getId(),
        folderId: folder ? folder.getId() : null,
        folderName: folder ? folder.getName() : '',
        modified: f.getLastUpdated().toISOString(),
        episode: episode,
        format: format,
        _t: f.getLastUpdated().getTime()
      });
    }
    rows.sort(function (a, b) { return b._t - a._t; });
    rows.forEach(function (r) { delete r._t; });
    return rows;
  } catch (e) {
    return { ok: false, error: errMsg_(e) };
  }
}

/**
 * 対応表を読み込んでパース済みオブジェクトを返す。
 * 成功時: mapping オブジェクトそのもの / 失敗時: { ok:false, error }
 */
function loadMapping(mappingFileId) {
  try {
    var f = DriveApp.getFileById(mappingFileId);
    return JSON.parse(f.getBlob().getDataAsString('UTF-8'));
  } catch (e) {
    return { ok: false, error: errMsg_(e) };
  }
}

/**
 * 修正依頼をフォルダへ保存する。
 * 同名ファイルがあれば上書き、なければ新規作成。
 * 成功時: { ok:true, fileId, modified }
 */
function saveRequest(folderId, requestObj) {
  try {
    if (!folderId) throw new Error('folderId が指定されていません');
    var folder = DriveApp.getFolderById(folderId);
    var json = JSON.stringify(requestObj, null, 2);
    var it = folder.getFilesByName(REQUEST_NAME);
    var file;
    if (it.hasNext()) {
      file = it.next();
      file.setContent(json);
    } else {
      file = folder.createFile(REQUEST_NAME, json, 'application/json');
    }
    return {
      ok: true,
      fileId: file.getId(),
      modified: file.getLastUpdated().toISOString()
    };
  } catch (e) {
    return { ok: false, error: errMsg_(e) };
  }
}

/**
 * プレビュー静止画の data URL を返す（サムネイル表示のフォールバック用）。
 * 成功時: "data:<mime>;base64,..." / 失敗時: { ok:false, error }
 */
function getStillDataUrl(fileId) {
  try {
    var blob = DriveApp.getFileById(fileId).getBlob();
    var mime = blob.getContentType() || 'image/png';
    return 'data:' + mime + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (e) {
    return { ok: false, error: errMsg_(e) };
  }
}

function errMsg_(e) {
  return String((e && e.message) || e);
}
