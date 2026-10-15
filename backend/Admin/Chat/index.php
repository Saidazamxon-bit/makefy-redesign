<?php
require_once (__DIR__."/../../VisionBuilder/main.php");
require ("".ROOT_PATH."/assets/adminauth.php");
admin_talab_qil();

// chat_messages jadvalini yaratish (agar yo'q bo'lsa)
mysqli_query($connect, "CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  matn TEXT NOT NULL,
  kim ENUM('user','admin') DEFAULT 'user',
  sana DATETIME DEFAULT CURRENT_TIMESTAMP,
  oqildi TINYINT(1) DEFAULT 0
)");

// ID qidirish
$searchId = isset($_GET['search_id']) ? intval($_GET['search_id']) : 0;
$searchUser = null;
if($searchId > 0){
  $searchUser = mysqli_fetch_assoc(mysqli_query($connect, "SELECT * FROM kabinet WHERE user_id='$searchId'"));
}

// Barcha chatlar ro'yxati (xabar yuborgan foydalanuvchilar)
$chatUsers = [];
$res = mysqli_query($connect, "SELECT DISTINCT user_id FROM chat_messages ORDER BY (SELECT MAX(id) FROM chat_messages c2 WHERE c2.user_id=chat_messages.user_id) DESC");
while($row = mysqli_fetch_assoc($res)){
  $uid = $row['user_id'];
  if ((int)$uid < 0) {
    // Telegramga ulanmagan Google/Email foydalanuvchi: chat ID = -kabinet.id
    $uinfo = mysqli_fetch_assoc(mysqli_query($connect, "SELECT COALESCE(NULLIF(email,''), NULLIF(ism,''), login) AS login FROM kabinet WHERE id=".(-(int)$uid)));
    if ($uinfo) { $uinfo['user_id'] = $uid; }
  } else {
    $uinfo = mysqli_fetch_assoc(mysqli_query($connect, "SELECT user_id, login FROM kabinet WHERE user_id='$uid'"));
  }
  $yangiSoni = mysqli_fetch_assoc(mysqli_query($connect, "SELECT COUNT(*) as soni FROM chat_messages WHERE user_id='$uid' AND kim='user' AND oqildi=0"))['soni'];
  $oxirgi = mysqli_fetch_assoc(mysqli_query($connect, "SELECT matn, sana FROM chat_messages WHERE user_id='$uid' ORDER BY id DESC LIMIT 1"));
  if($uinfo){
    $chatUsers[] = [
      'user_id' => $uid,
      'login' => $uinfo['login'],
      'yangi' => $yangiSoni,
      'oxirgi_matn' => $oxirgi ? $oxirgi['matn'] : '',
      'oxirgi_sana' => $oxirgi ? $oxirgi['sana'] : '',
    ];
  }
}
?>
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="color-scheme" content="dark light">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Admin Chat</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <link rel="stylesheet" href="/assets/style.css?v=21">
</head>
<body class="with-nav">
<?php $adminActive = 'chat'; include ROOT_PATH."/assets/adminnav.php"; ?>
  <div class="page">
    <div class="asosiy">
      <div class="badge"><i class="fa-solid fa-message"></i></div>
      <b>Chat — Foydalanuvchilar</b>
      <div class="sub">ID bo'yicha yangi chatni boshlang yoki ro'yxatdan tanlang</div>
    </div>

    <div class="ramka">
      <!-- ID qidiruv -->
      <div class="section-title"><i class="fa-solid fa-magnifying-glass"></i> ID bo'yicha foydalanuvchi topish</div>
      <form method="get" class="id-search-row">
        <input type="number" name="search_id" placeholder="Telegram ID kiriting..." value="<?= $searchId ?: '' ?>" required>
        <button type="submit"><i class="fa-solid fa-magnifying-glass"></i></button>
      </form>

      <?php if($searchId > 0): ?>
      <?php if($searchUser): ?>
      <div class="admin-satir" style="margin-bottom:14px;">
        <div>
          <div class="nomi"><?= htmlspecialchars($searchUser['login']) ?></div>
          <div class="qoshimcha">ID: <?= (int)$searchUser['user_id'] ?></div>
        </div>
        <a href="/Admin/Chat/Suhbat/index.php?uid=<?= (int)$searchUser['user_id'] ?>" class="btn" style="width:auto;padding:0 16px;height:38px;font-size:13px;">
          <i class="fa-solid fa-message"></i> Chat ochish
        </a>
      </div>
      <?php else: ?>
      <div class="diqqat" style="margin-bottom:14px;"><i class="fa-solid fa-circle-exclamation"></i> ID: <?=$searchId?> — foydalanuvchi topilmadi</div>
      <?php endif; ?>
      <?php endif; ?>

      <!-- Mavjud chatlar -->
      <div class="section-title"><i class="fa-solid fa-comments"></i> Faol suhbatlar</div>
      <?php if(empty($chatUsers)): ?>
      <div class="ochmagan"><i class="fa-solid fa-comment-slash" style="font-size:24px;color:var(--text-muted);margin-bottom:8px;display:block;"></i><strong>Hali xabar yo'q</strong></div>
      <?php else: ?>
      <div class="admin-chat-list">
        <?php foreach($chatUsers as $cu): ?>
        <a href="/Admin/Chat/Suhbat/index.php?uid=<?= (int)$cu['user_id'] ?>" class="admin-chat-item <?= $cu['yangi'] > 0 ? 'has-new' : '' ?>">
          <div class="admin-chat-avatar"><?= mb_strtoupper(mb_substr($cu['login'], 0, 1)) ?></div>
          <div class="admin-chat-info">
            <div class="admin-chat-name"><?= htmlspecialchars($cu['login']) ?></div>
            <div class="admin-chat-id">ID: <?= (int)$cu['user_id'] ?> <?php if($cu['oxirgi_matn']): ?> · <?= htmlspecialchars(mb_substr($cu['oxirgi_matn'], 0, 30)) ?><?= mb_strlen($cu['oxirgi_matn'])>30 ? '...' : '' ?><?php endif; ?></div>
          </div>
          <?php if($cu['yangi'] > 0): ?>
          <span class="admin-chat-badge"><?= (int)$cu['yangi'] ?></span>
          <?php endif; ?>
        </a>
        <?php endforeach; ?>
      </div>
      <?php endif; ?>
    </div>
  </div>
</body>
</html>
