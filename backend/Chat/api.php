<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/auth.php';
require_once ROOT_PATH . '/VisionBuilder/main.php';

initSession();
header('Content-Type: application/json; charset=utf-8');

@ini_set('upload_max_filesize', '12M');
@ini_set('post_max_size', '16M');
@ini_set('max_execution_time', '120');
@ini_set('memory_limit', '128M');

$role = $_GET['role'] ?? $_POST['role'] ?? 'user';
$action = $_GET['action'] ?? $_POST['action'] ?? '';

chatJadval($connect);
// Media doimiy saqlanadi — 3 kunlik tozalash o'chirilgan

function chatJson($data, $code = 200){
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function chatMediaSaqlash($files, $allowImage){
  $saved = [];
  $errors = [];
  $dir = ROOT_PATH."/uploads/chat";
  if (!is_dir($dir)) { @mkdir($dir, 0777, true); }
  if (!isset($files['name'])) { return ['ok'=>[], 'errors'=>['Fayl kelmadi']]; }

  $names = is_array($files['name']) ? $files['name'] : [$files['name']];
  $tmps = is_array($files['tmp_name']) ? $files['tmp_name'] : [$files['tmp_name']];
  $types = is_array($files['type']) ? $files['type'] : [$files['type']];
  $errs = is_array($files['error']) ? $files['error'] : [$files['error']];
  $sizes = is_array($files['size']) ? $files['size'] : [$files['size']];
  $count = min(count($names), 6);
  $imgExts = ['jpg','jpeg','png','gif','webp'];

  for ($i = 0; $i < $count; $i++) {
    $errCode = $errs[$i] ?? UPLOAD_ERR_NO_FILE;
    if ($errCode !== UPLOAD_ERR_OK) {
      $errors[] = 'Yuklash xatosi #'.$errCode;
      continue;
    }
    $orig = (string)($names[$i] ?? 'file');
    $ext = strtolower(pathinfo($orig, PATHINFO_EXTENSION));
    $mime = (string)($types[$i] ?? '');
    if (function_exists('mime_content_type') && !empty($tmps[$i])) {
      $detected = @mime_content_type($tmps[$i]);
      if ($detected) $mime = $detected;
    }

    $isImg = preg_match('/^image\//', $mime) || in_array($ext, $imgExts, true) || stripos($orig, 'chatimg_') === 0;
    if (!$isImg) {
      $errors[] = 'Faqat rasm yuborish mumkin';
      continue;
    }
    if (!$allowImage) {
      $errors[] = 'Rasm ruxsat etilmagan';
      continue;
    }
    if (($sizes[$i] ?? 0) > 12 * 1024 * 1024) {
      $errors[] = 'Rasm juda katta (max 12 MB)';
      continue;
    }
    $outExt = in_array($ext, $imgExts, true) ? ($ext === 'jpeg' ? 'jpg' : $ext) : 'jpg';
    $fname = date('YmdHis').'_'.bin2hex(random_bytes(4)).'.'.$outExt;
    if (@move_uploaded_file($tmps[$i], "$dir/$fname")) {
      $saved[] = ['type'=>'image','url'=>"/uploads/chat/$fname"];
    } else {
      $errors[] = 'Saqlash muvaffaqiyatsiz';
    }
  }
  return ['ok'=>$saved, 'errors'=>$errors];
}

function chatCollectFiles(){
  foreach (['media', 'media[]', 'rasmlar', 'rasmlar[]', 'file'] as $key) {
    if (empty($_FILES[$key]) || !isset($_FILES[$key]['name'])) continue;
    $name = $_FILES[$key]['name'];
    if (is_array($name)) {
      foreach ($name as $n) { if ($n !== '' && $n !== null) return $_FILES[$key]; }
    } elseif ($name !== '' && $name !== null) {
      return $_FILES[$key];
    }
  }
  foreach ($_FILES as $f) {
    if (!isset($f['name'])) continue;
    $name = $f['name'];
    if (is_array($name)) {
      foreach ($name as $n) { if ($n !== '' && $n !== null) return $f; }
    } elseif ($name !== '' && $name !== null) {
      return $f;
    }
  }
  return null;
}

$userRew = null;
if ($role === 'admin') {
  require ROOT_PATH."/assets/adminauth.php";
  if (!admin_kirgan()) {
    chatJson(['ok'=>false,'xabar'=>'Admin emas'], 403);
  }
  $uid = (int)($_GET['uid'] ?? $_POST['uid'] ?? 0);
  if ($uid <= 0) chatJson(['ok'=>false,'xabar'=>'UID kerak'], 400);
  $viewer = 'admin';
  $allowRasm = true;
} else {
  $login = $_GET['login'] ?? $_POST['login'] ?? '';
  $parol = $_GET['pass'] ?? $_POST['pass'] ?? '';
  $userRew = kabinetKir($connect, $login, $parol);
  if (!$userRew) chatJson(['ok'=>false,'xabar'=>'Auth xato'], 403);
  $uid = (int)$userRew['user_id'];
  $viewer = 'user';
  $ruxsat = chatTarifRuxsat($connect, $userRew);
  $allowRasm = $ruxsat['rasm'];
}

if ($action === 'perms') {
  if ($viewer === 'admin') {
    chatJson(['ok'=>true,'rasm'=>true,'video'=>false,'voice'=>false,'admin'=>true]);
  }
  $ruxsat = chatTarifRuxsat($connect, $userRew);
  chatJson([
    'ok'=>true,
    'rasm'=>$ruxsat['rasm'],
    'video'=>false,
    'voice'=>false,
    'tarif'=>$ruxsat['tarif'],
    'kalit'=>$ruxsat['kalit']
  ]);
}

if ($action === 'poll') {
  $after = (int)($_GET['after'] ?? 0);
  if ($viewer === 'user') {
    mysqli_query($connect, "UPDATE chat_messages SET oqildi=1, holat='read' WHERE user_id='$uid' AND kim='admin' AND oqildi=0");
  } else {
    mysqli_query($connect, "UPDATE chat_messages SET oqildi=1, holat='read' WHERE user_id='$uid' AND kim='user' AND oqildi=0");
  }
  $sql = "SELECT * FROM chat_messages WHERE user_id='$uid'".($after > 0 ? " AND id > $after" : "")." ORDER BY id ASC";
  $res = mysqli_query($connect, $sql);
  $list = [];
  while ($row = safe_fetch_assoc($res)) { $list[] = chatXabarFormat($row); }

  $other = $viewer === 'user' ? 'admin' : 'user';
  $typing = false;
  $t = safe_fetch_assoc(mysqli_query($connect, "SELECT yangilandi FROM chat_typing WHERE user_id='$uid' AND kim='$other'"));
  if ($t && strtotime($t['yangilandi']) > time() - 4) { $typing = true; }

  $statusRes = mysqli_query($connect, "SELECT id, holat, oqildi FROM chat_messages WHERE user_id='$uid' AND kim='$viewer' ORDER BY id DESC LIMIT 30");
  $statuses = [];
  while ($s = safe_fetch_assoc($statusRes)) {
    $statuses[] = ['id'=>(int)$s['id'],'holat'=>$s['oqildi'] ? 'read' : ($s['holat'] ?? 'sent')];
  }

  if ($viewer === 'admin') {
    $perms = ['rasm'=>true,'video'=>false,'voice'=>false];
  } else {
    $r = chatTarifRuxsat($connect, $userRew);
    $perms = ['rasm'=>$r['rasm'],'video'=>false,'voice'=>false,'tarif'=>$r['tarif']];
  }

  chatJson(['ok'=>true,'messages'=>$list,'typing'=>$typing,'statuses'=>$statuses,'perms'=>$perms]);
}

if ($action === 'typing') {
  $kim = $viewer;
  mysqli_query($connect, "INSERT INTO chat_typing (user_id, kim, yangilandi) VALUES ('$uid','$kim',NOW())
    ON DUPLICATE KEY UPDATE yangilandi = NOW()");
  chatJson(['ok'=>true]);
}

if ($action === 'send') {
  $matn = trim($_POST['matn'] ?? '');
  $hasMediaFlag = ($_POST['has_media'] ?? '') === '1';
  $files = chatCollectFiles();
  $media = [];
  $uploadErrors = [];
  if ($files) {
    $res = chatMediaSaqlash($files, $allowRasm);
    $media = $res['ok'];
    $uploadErrors = $res['errors'];
  }

  $hasImage = !empty($media);

  if ($matn === '' && empty($media)) {
    if ($hasMediaFlag || $files) {
      $msg = 'Rasm yuklanmadi.';
      if ($uploadErrors) $msg .= ' '.implode('; ', $uploadErrors);
      chatJson(['ok'=>false,'xabar'=>$msg,'errors'=>$uploadErrors], 400);
    }
    chatJson(['ok'=>false,'xabar'=>'Bo\'sh xabar'], 400);
  }

  $turi = $hasImage ? 'image' : 'text';
  if ($matn === '' && $hasImage) $matn = '📷 Rasm';

  $kim = $viewer;
  $id = chatYoz($connect, $uid, $matn, $kim, [
    'rasmlar' => $media ?: null,
    'turi' => $turi,
    'holat' => 'sent',
  ]);
  mysqli_query($connect, "DELETE FROM chat_typing WHERE user_id='$uid' AND kim='$kim'");

  if ($viewer === 'user') {
    $extra = $hasImage ? ' (rasm)' : '';
    bot('sendMessage', [
      'chat_id' => $orgcoder,
      'text' => "💬 Yangi chat$extra\nUser: <code>$uid</code>\n".htmlspecialchars(mb_substr($matn,0,200)),
      'parse_mode' => 'html'
    ]);
  } else {
    $appLink = !empty($web_app) ? $web_app : 'https://t.me/Makefybot/app';
    bot('sendMessage', [
      'chat_id' => $uid,
      'text' => "📨 <b>Admin</b> yangi xabar yozdi:\n\n<blockquote>".htmlspecialchars(mb_substr($matn, 0, 500))."</blockquote>\n\n<a href='$appLink'>Chatni ochish</a>",
      'parse_mode' => 'html'
    ]);
  }

  $row = safe_fetch_assoc(mysqli_query($connect, "SELECT * FROM chat_messages WHERE id=$id"));
  chatJson(['ok'=>true,'message'=>chatXabarFormat($row),'warnings'=>$uploadErrors]);
}

if ($action === 'chat_action') {
  $type = $_POST['type'] ?? '';
  $id = (int)($_POST['id'] ?? 0);
  if ($viewer !== 'user') chatJson(['ok'=>false,'xabar'=>'Faqat foydalanuvchi'], 403);

  if ($type === 'ilt_pay') {
    $r = iltimosTolov($connect, $id, $uid);
    chatJson($r, $r['ok'] ? 200 : 400);
  }
  if ($type === 'ilt_cancel') {
    $r = iltimosBekor($connect, $id, $uid);
    chatJson($r, $r['ok'] ? 200 : 400);
  }
  if ($type === 'zakaz_ok') {
    $r = zakazBotniEgagaBiriktir($connect, $id);
    if ($r['ok']) {
      $botUser = $r['bot_user'] ?? '';
      chatYoz($connect, $uid, "✅ Bot qabul qilindi!\n@$botUser endi «Botlarim» bo'limida.", 'admin', [
        'turi' => 'action',
        'action_json' => ['buttons' => [['label'=>'🤖 Botga o\'tish','url'=>'https://t.me/'.$botUser]]]
      ]);
    }
    chatJson($r, $r['ok'] ? 200 : 400);
  }
  if ($type === 'tr_ok' || $type === 'tr_no') {
    $r = botEgalikAmalgaOshirish($connect, $id, $type === 'tr_ok');
    chatJson($r, $r['ok'] ? 200 : 400);
  }
  chatJson(['ok'=>false,'xabar'=>'Noma\'lum amal'], 400);
}

chatJson(['ok'=>false,'xabar'=>'Action yo\'q'], 400);
