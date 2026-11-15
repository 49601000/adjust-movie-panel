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
var SHARED_FOLDER_NAME = '調整パネル_shared-assets';
var SE_EXTENSIONS = { mp3: true, wav: true, m4a: true };

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

/**
 * 共用カタログ（全プロジェクト共通の表情セット・SE 一覧）を返す。
 * Drive フォルダ「調整パネル_shared-assets」の中身を走査する:
 *   characters/zundamon/<セット名>/ → expr_z（サブフォルダ名）
 *   characters/metan/<セット名>/    → expr_m（サブフォルダ名）
 *   se/<ファイル>.mp3|wav|m4a       → se（拡張子を除いたファイル名が id/label）
 * 成功時: { ok:true, expr_z:[...], expr_m:[...], se:[{id, label}] }
 * 共用フォルダが無い場合: { ok:false, error:'shared folder not found' }
 * サブフォルダが無い場合は空リスト（エラーにしない）。
 */
function getSharedCatalogs() {
  try {
    var it = DriveApp.getFoldersByName(SHARED_FOLDER_NAME);
    if (!it.hasNext()) return { ok: false, error: 'shared folder not found' };
    var root = it.next();
    var characters = childFolder_(root, 'characters');
    var zFolder = characters ? childFolder_(characters, 'zundamon') : null;
    var mFolder = characters ? childFolder_(characters, 'metan') : null;
    var seFolder = childFolder_(root, 'se');
    var se = [];
    if (seFolder) {
      var files = seFolder.getFiles();
      while (files.hasNext()) {
        var name = files.next().getName();
        var dot = name.lastIndexOf('.');
        if (dot <= 0) continue;
        var ext = name.substring(dot + 1).toLowerCase();
        if (!SE_EXTENSIONS[ext]) continue;
        var id = name.substring(0, dot);
        se.push({ id: id, label: id });
      }
      se.sort(function (a, b) { return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0); });
    }
    return {
      ok: true,
      expr_z: zFolder ? subfolderNames_(zFolder) : [],
      expr_m: mFolder ? subfolderNames_(mFolder) : [],
      se: se
    };
  } catch (e) {
    return { ok: false, error: errMsg_(e) };
  }
}

/** parent 直下のサブフォルダ name を返す（無ければ null）。 */
function childFolder_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : null;
}

/** folder 直下のサブフォルダ名をソートして返す。 */
function subfolderNames_(folder) {
  var names = [];
  var it = folder.getFolders();
  while (it.hasNext()) names.push(it.next().getName());
  names.sort();
  return names;
}

function errMsg_(e) {
  return String((e && e.message) || e);
}
