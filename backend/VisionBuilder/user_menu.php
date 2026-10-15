<?php
/**
 * ============================================================================
 *  MAKEFY — FOYDALANUVCHI PANELI (to'liq Telegram tugmalari orqali boshqariladi)
 * ----------------------------------------------------------------------------
 *  Bu fayl VisionBuilder/index.php ichidan require qilinadi va foydalanuvchiga
 *  tegishli BARCHA bo'limlarni o'zi bajaradi:
 *
 *    • /start va asosiy menyu   — login/parol umuman so'ralmaydi
 *    • 💳 Hisobim               — balans, to'ldirish (chek rasmi bilan),
 *                                 promokod, tranzaksiyalar tarixi
 *    • 💎 Tariflar              — ko'rish va balansdan sotib olish
 *    • 🤖 Botlarim              — ro'yxat, tafsilot (WebApp har doim avtomatik faol)
 *    • ➕ Bot yaratish          — kategoriya → shablon → token (v2 dvigateli)
 *    • 💰 Pul ishlash           — kanalga obuna uchun mukofot
 *    • 👥 Referal, 📖 Qo'llanma, 💬 Yordam
 *
 *  MUHIM: hech bir bo'lim foydalanuvchini web ilovaga majburan olib o'tmaydi —
 *  hamma amal shu botning o'zida, tugmalar orqali bajariladi. Web ilova faqat
 *  qo'shimcha imkoniyat sifatida bitta tugmada qoldirilgan.
 * ============================================================================
 */

// XAVFSIZLIK: bu fayl faqat VisionBuilder/index.php ichidan require qilinadi.
// To'g'ridan-to'g'ri brauzerdan ochilsa — hech narsa bajarilmaydi.
if (!defined('API_KEY') || !isset($connect)) {
	http_response_code(403);
	exit;
}

if (!defined('MAKEFY_MENU')) {
define('MAKEFY_MENU', true);

// ----------------------------------------------------------------------------
// YORDAMCHI FUNKSIYALAR
// ----------------------------------------------------------------------------

/** Pul summasini chiroyli formatda chiqarish */
function mkf_pul($n){ return number_format((float)$n, 0, '.', ' '); }

/** Adminlar ro'yxati (tizim/admins.txt + asosiy admin) */
function mkf_adminlar(){
	global $orgcoder;
	$royxat = [];
	$fayl = __DIR__.'/tizim/admins.txt';
	foreach (explode("\n", (string)@file_get_contents($fayl)) as $a) {
		$a = trim($a);
		if ($a !== '' && ctype_digit($a)) { $royxat[] = $a; }
	}
	$royxat[] = (string)$orgcoder;
	return array_values(array_unique($royxat));
}

/** Foydalanuvchi adminmi? */
function mkf_admin_mi($id){ return in_array((string)$id, mkf_adminlar(), true); }

/**
 * Kabinet yozuvini olish. Yozuv yo'q bo'lsa — yaratadi.
 * LOGIN/PAROL: endi foydalanuvchidan hech qachon so'ralmaydi. Bazadagi `login`
 * ustuni ichki kalit sifatida ishlatilgani uchun (eski funksiyalar shunga
 * tayanadi) avtomatik "u<telegram_id>" qiymati beriladi va u hech qayerda
 * ko'rsatilmaydi.
 */
function mkf_user($connect, $uid){
	$uidSafe = mysqli_real_escape_string($connect, (string)$uid);
	$rew = safe_fetch_assoc(mysqli_query($connect, "SELECT * FROM kabinet WHERE user_id = '$uidSafe'"));
	if (!$rew) {
		mysqli_query($connect, "INSERT INTO kabinet(`user_id`,`pul`,`pul2`,`odam`,`ban`) VALUES ('$uidSafe','0','0','0','unban')");
		$rew = safe_fetch_assoc(mysqli_query($connect, "SELECT * FROM kabinet WHERE user_id = '$uidSafe'"));
	}
	if ($rew && trim((string)($rew['login'] ?? '')) === '') {
		$avto = 'u'.$uidSafe;
		mysqli_query($connect, "UPDATE kabinet SET login = '$avto' WHERE user_id = '$uidSafe'");
		$rew['login'] = $avto;
	}
	return $rew ?: [];
}

/** Callback bo'lsa xabarni tahrirlaydi, aks holda yangi xabar yuboradi */
function mkf_chiqar($cid, $mid, $qid, $text, $key){
	if ($qid && $mid) {
		$r = bot('editMessageText', [
			'chat_id'=>$cid, 'message_id'=>$mid, 'text'=>$text,
			'parse_mode'=>'html', 'disable_web_page_preview'=>true, 'reply_markup'=>$key,
		]);
		// Xabar rasm/caption bo'lsa yoki o'chirilgan bo'lsa — yangisini yuboramiz
		if (!$r || empty($r->ok)) {
			bot('sendMessage', ['chat_id'=>$cid,'text'=>$text,'parse_mode'=>'html','disable_web_page_preview'=>true,'reply_markup'=>$key]);
		}
		return;
	}
	bot('sendMessage', ['chat_id'=>$cid,'text'=>$text,'parse_mode'=>'html','disable_web_page_preview'=>true,'reply_markup'=>$key]);
}

/** Qadam (step) fayli bilan ishlash */
function mkf_step_yoz($cid, $qiymat){ @file_put_contents(__DIR__."/step/$cid.step", $qiymat); }
function mkf_step_ochir($cid){ @unlink(__DIR__."/step/$cid.step"); }

// ----------------------------------------------------------------------------
//  MENYU USLUBI (2 xil ko'rinish — foydalanuvchi o'zi tanlaydi)
// ----------------------------------------------------------------------------
//  Ilgari bo'limlar IKKI joyda birdan chiqardi: pastki doimiy klaviaturada ham,
//  xabar ostidagi inline tugmalarda ham. Bu chalkash va ortiqcha edi.
//  Endi bo'limlar HAR DOIM FAQAT BITTA joyda ko'rinadi, qaysi joyda —
//  foydalanuvchining «⚙️ Sozlamalar» dagi tanloviga bog'liq:
//
//    • "klassik"   — tugmalar pastda, klaviatura o'rnida (doimiy turadi)
//    • "zamonaviy" — tugmalar tepada, xabarning o'zida (pastki panel yo'q)
// ----------------------------------------------------------------------------

/** Foydalanuvchining menyu uslubi: 'klassik' yoki 'zamonaviy' */
function mkf_uslub($connect, $uid){
	$uidSafe = mysqli_real_escape_string($connect, (string)$uid);
	$r = safe_fetch_assoc(mysqli_query($connect, "SELECT menyu_uslub FROM kabinet WHERE user_id = '$uidSafe'"));
	$u = trim((string)($r['menyu_uslub'] ?? ''));
	return $u === 'zamonaviy' ? 'zamonaviy' : 'klassik';
}

/** Uslubni saqlash */
function mkf_uslub_yoz($connect, $uid, $uslub){
	$uslub = ($uslub === 'zamonaviy') ? 'zamonaviy' : 'klassik';
	$uidSafe = mysqli_real_escape_string($connect, (string)$uid);
	mysqli_query($connect, "UPDATE kabinet SET menyu_uslub = '$uslub' WHERE user_id = '$uidSafe'");
	return $uslub;
}

/**
 * Mini-ilova manzili.
 * DIQQAT: pastki (reply) klaviaturaning tugmasi 'url' ni qo'llab-quvvatlamaydi —
 * faqat 'web_app' ni. 'web_app' esa t.me/... havolasini qabul qilmaydi, unga
 * ilovaning HAQIQIY https manzili kerak. Shuning uchun t.me havolasi berilgan
 * bo'lsa, APP_URL ga o'tamiz (bu — aynan o'sha mini-ilovaning o'zi).
 */
function mkf_webapp_url(){
	$w = defined('WEB_APP_URL') ? trim((string)WEB_APP_URL) : '';
	if ($w !== '' && stripos($w, 't.me/') === false && stripos($w, 'https://') === 0) {
		return $w;
	}
	if (defined('APP_URL') && APP_URL !== '') { return rtrim(APP_URL, '/').'/'; }
	return '';
}

/** Pastki (doimiy) klaviatura — uslubga qarab */
function mkf_klaviatura($uslub = 'klassik'){
	if ($uslub === 'zamonaviy') {
		// Tugmalar butunlay tepada — pastki panel olib tashlanadi.
		return json_encode(['remove_keyboard'=>true], JSON_UNESCAPED_UNICODE);
	}
	$rows = [
		[['text'=>"➕ Bot yaratish"],['text'=>"🤖 Botlarim"]],
		[['text'=>"💳 Hisobim"],['text'=>"💎 Tariflar"]],
		[['text'=>"💰 Pul ishlash"],['text'=>"👥 Referal"]],
		[['text'=>"📖 Qo'llanma"],['text'=>"💬 Yordam"]],
	];
	$wa = mkf_webapp_url();
	if ($wa !== '') {
		$rows[] = [['text'=>"🌐 Web ilova", 'web_app'=>['url'=>$wa]], ['text'=>"⚙️ Sozlamalar"]];
	} else {
		$rows[] = [['text'=>"⚙️ Sozlamalar"]];
	}
	return json_encode([
		'resize_keyboard'=>true,
		'is_persistent'=>true,
		'keyboard'=>$rows,
	], JSON_UNESCAPED_UNICODE);
}

/**
 * Asosiy menyuning inline tugmalari — FAQAT "zamonaviy" uslubda.
 * "klassik" da null qaytaradi, chunki u yerda bo'limlar pastda turadi va
 * ularni yana bir marta takrorlash chalkashlik keltirib chiqaradi.
 */
function mkf_menyu_tugmalari($uslub = 'klassik'){
	if ($uslub !== 'zamonaviy') { return null; }
	$rows = [
		[['text'=>"➕ Bot yaratish",'callback_data'=>"newbot"],['text'=>"🤖 Botlarim",'callback_data'=>"mybots"]],
		[['text'=>"💳 Hisobim",'callback_data'=>"hisob"],['text'=>"💎 Tariflar",'callback_data'=>"tariflar"]],
		[['text'=>"💰 Pul ishlash",'callback_data'=>"pulishlash"],['text'=>"👥 Referal",'callback_data'=>"referal"]],
		[['text'=>"📖 Qo'llanma",'callback_data'=>"qollanma"],['text'=>"💬 Yordam",'callback_data'=>"yordam"]],
	];
	$wa = mkf_webapp_url();
	if ($wa !== '') {
		$rows[] = [['text'=>"🌐 Web ilova", 'web_app'=>['url'=>$wa]], ['text'=>"⚙️ Sozlamalar",'callback_data'=>"sozlamalar"]];
	} else {
		$rows[] = [['text'=>"⚙️ Sozlamalar",'callback_data'=>"sozlamalar"]];
	}
	return json_encode(['inline_keyboard'=>$rows], JSON_UNESCAPED_UNICODE);
}

/**
 * Asosiy menyuni BITTA xabar bilan chiqarish.
 * klassik  -> matn + pastki klaviatura (bo'limlar pastda)
 * zamonaviy-> matn + inline tugmalar (bo'limlar tepada)
 */
function mkf_menyu_yubor($connect, $cid, $ism, $mid = null, $qid = null){
	$rew = mkf_user($connect, $cid);
	$uslub = mkf_uslub($connect, $cid);
	$matn = mkf_menyu_matni($connect, $rew, $ism, $uslub);

	if ($uslub === 'zamonaviy') {
		$key = mkf_menyu_tugmalari('zamonaviy');
		if ($qid && $mid) {
			$r = bot('editMessageText', ['chat_id'=>$cid,'message_id'=>$mid,'text'=>$matn,'parse_mode'=>'html','disable_web_page_preview'=>true,'reply_markup'=>$key]);
			if ($r && !empty($r->ok)) { return; }
		}
		bot('sendMessage', ['chat_id'=>$cid,'text'=>$matn,'parse_mode'=>'html','disable_web_page_preview'=>true,'reply_markup'=>$key]);
		return;
	}

	// Klassik: bo'limlar pastki panelda doimiy turadi, shuning uchun
	// "🔙 Orqaga" bosilganda yangi xabar yubormaymiz — mavjud xabarni
	// menyu matniga aylantiramiz va inline tugmalarni olib tashlaymiz.
	// Pastki panel joyida qolgani uchun bo'limlar baribir qo'l ostida.
	if ($qid && $mid) {
		$r = bot('editMessageText', ['chat_id'=>$cid,'message_id'=>$mid,'text'=>$matn,'parse_mode'=>'html','disable_web_page_preview'=>true,'reply_markup'=>json_encode(['inline_keyboard'=>[]])]);
		if ($r && !empty($r->ok)) { return; }
	}
	bot('sendMessage', [
		'chat_id'=>$cid,'text'=>$matn,'parse_mode'=>'html',
		'disable_web_page_preview'=>true,'reply_markup'=>mkf_klaviatura('klassik'),
	]);
}

/** To'lov so'rovlari jadvali (hisob to'ldirish bot ichida ishlashi uchun) */
function mkf_tolov_jadval($connect){
	static $bajarildi = false;
	if ($bajarildi) { return; }
	$bajarildi = true;
	mysqli_query($connect, "CREATE TABLE IF NOT EXISTS tolov_sorovlar (
		id INT AUTO_INCREMENT PRIMARY KEY,
		user_id VARCHAR(100) NOT NULL,
		summa DECIMAL(15,2) NOT NULL DEFAULT 0,
		chek_file_id VARCHAR(255) NULL,
		holat VARCHAR(20) NOT NULL DEFAULT 'yangi',
		admin_id VARCHAR(100) NULL,
		izoh VARCHAR(255) NULL,
		sana DATETIME DEFAULT CURRENT_TIMESTAMP,
		INDEX idx_user (user_id),
		INDEX idx_holat (holat)
	)");
}

/**
 * Foydalanuvchining botlari.
 * ----------------------------------------------------------------------------
 * TUZATISH: ilgari `kunlik` jadvalidagi HAR BIR qatorni, hech qanday filtrsiz
 * ko'rsatardi. Amalda bitta bot bir necha marta qatorga tushishi mumkin —
 * masalan, foydalanuvchi BotFather'da bir xil username'ga @BotFather orqali
 * botni o'chirib qayta yaratsa (yangi token, eski username), eski yozuv
 * bazada qolib ketardi va yangisi bilan yonma-yon ikkalasi ham ko'rinardi.
 * Shuningdek, eski (joriy tuzatishdan oldingi) versiyalarda muvaffaqiyatsiz
 * yaratishdan keyin ham bo'sh `useri` bilan qator qolib ketishi mumkin edi.
 * Natijada foydalanuvchiga bir xil bot bir necha marta va bo'sh nomli
 * "botlar" ko'rinardi.
 *
 * Endi: bo'sh `useri` qatorlar o'tkazib yuboriladi, va bir xil username
 * takrorlansa — faqat ENG SO'NGGI (eng yangi, ya'ni joriy tokenli) yozuv
 * saqlanadi. platformBotYaratChat() endi bir xil username uchun yangi
 * qator qo'shmaydi (pastga qarang), shuning uchun bu yerdagi filtr asosan
 * eski, ilgaridan qolgan yozuvlarni tozalash uchun kerak.
 */
function mkf_botlarim($connect, $uid){
	$uidSafe = mysqli_real_escape_string($connect, (string)$uid);
	$res = mysqli_query($connect, "SELECT * FROM kunlik WHERE user_id = '$uidSafe' ORDER BY id DESC");
	$royxat = [];
	$korilgan = [];
	while ($r = safe_fetch_assoc($res)) {
		$useri = trim((string)($r['useri'] ?? ''));
		if ($useri === '') { continue; }              // buzuq/bo'sh yozuv — ko'rsatilmaydi
		if (isset($korilgan[$useri])) { continue; }    // takroriy — faqat eng so'nggisi qoladi
		$korilgan[$useri] = true;
		$royxat[] = $r;
	}
	return $royxat;
}

/** Bot muddati tugashiga qolgan kun */
function mkf_qolgan_kun($row){
	$kun = intval($row['kun'] ?? 0);
	$parts = explode('|', (string)($row['vaqti'] ?? ''));
	$dt = strtotime(trim($parts[0] ?? ''));
	if ($dt === false || $kun <= 0) { return 0; }
	$tugash = strtotime('+'.$kun.' days', $dt);
	$qoldi = (int)ceil(($tugash - time()) / 86400);
	return max(0, $qoldi);
}

/** Asosiy menyu matni */
function mkf_menyu_matni($connect, $rew, $ism, $uslub = 'klassik'){
	$tarif = joriyTarif($connect, $rew);
	$botlar = mkf_botlarim($connect, $rew['user_id'] ?? 0);
	$ref = referalDaraja($connect, $rew);
	$ismT = h(trim((string)$ism) !== '' ? $ism : 'do\'stim');
	$t  = "<b>👋 Assalomu alaykum, $ismT!</b>\n\n";
	$t .= "<b>Makefy</b> — Telegram botlarini kod yozmasdan yaratish platformasi.\n\n";
	$t .= "<blockquote>";
	$t .= "💰 <b>Balans:</b> ".mkf_pul($rew['pul'] ?? 0)." so'm\n";
	$t .= "💎 <b>Tarif:</b> ".h($tarif['nomi'] ?? 'Oddiy')."\n";
	$t .= "🤖 <b>Botlaringiz:</b> ".count($botlar)." ta\n";
	$t .= "👥 <b>Takliflar:</b> ".(int)($ref['count'] ?? 0)." ta";
	$t .= "</blockquote>\n\n";
	$t .= ($uslub === 'zamonaviy')
		? "<i>Yuqoridagi tugmalar orqali hamma narsani shu yerning o'zida boshqarasiz 👆</i>"
		: "<i>Pastdagi tugmalar orqali hamma narsani shu yerning o'zida boshqarasiz 👇</i>";
	return $t;
}

/** "🔙 Menyu" qatori */
function mkf_orqaga($data = 'menyu'){
	return ['text'=>"🔙 Orqaga",'callback_data'=>$data];
}

} // MAKEFY_MENU

// ============================================================================
//  MARSHRUTLASH — pastki klaviatura tugmasi bosilsa, uni bo'lim kodiga aylantirish
// ============================================================================
$mkfTugmalar = [
	"➕ Bot yaratish" => "newbot",
	"🤖 Botlarim"     => "mybots",
	"💳 Hisobim"      => "hisob",
	"💎 Tariflar"     => "tariflar",
	"💰 Pul ishlash"  => "pulishlash",
	"👥 Referal"      => "referal",
	"📖 Qo'llanma"    => "qollanma",
	"💬 Yordam"       => "yordam",
	"⚙️ Sozlamalar"   => "sozlamalar",
];
$mkfMatn = isset($text) ? trim((string)$text) : '';
if ($mkfMatn !== '' && isset($mkfTugmalar[$mkfMatn])) {
	$data = $mkfTugmalar[$mkfMatn];
	$cid2 = $cid;
	$mid2 = null;   // haqiqiy inline xabar emas -> yangi xabar yuboriladi
	$qid  = null;
	$text = '';
	$step = '';
}
if ($mkfMatn === '/menu' || $mkfMatn === '/menyu') {
	$data = 'menyu'; $cid2 = $cid; $mid2 = null; $qid = null; $text = ''; $step = '';
	mkf_step_ochir($cid);
}

// Rasm (chek) yuborilganini aniqlash
$mkfPhotoId = '';
if (isset($alijonov->message->photo) && is_array($alijonov->message->photo) && count($alijonov->message->photo) > 0) {
	$mkfOxirgi = end($alijonov->message->photo);
	$mkfPhotoId = (string)($mkfOxirgi->file_id ?? '');
}

$mkfUid = !empty($cid2) ? $cid2 : $cid;
mkf_tolov_jadval($connect);

// ============================================================================
//  REFERAL: /start <id> orqali kelgan taklif qiluvchini eslab qolish
// ============================================================================
if ($mkfMatn !== '' && mb_stripos($mkfMatn, "/start") === 0) {
	$mkfQism = explode(" ", $mkfMatn, 2);
	$mkfRef = isset($mkfQism[1]) ? trim($mkfQism[1]) : '';
	if ($mkfRef !== '' && ctype_digit($mkfRef) && (int)$mkfRef !== (int)$cid) {
		@file_put_contents(__DIR__."/step/$cid.referrer", (int)$mkfRef);
	}
}

// ============================================================================
//  /start — RO'YXATDAN O'TISH YO'Q. Darhol asosiy menyu ochiladi.
// ============================================================================
if ($mkfMatn === "/start" || mb_stripos($mkfMatn, "/start ") === 0) {
	mkf_step_ochir($cid);

	// Majburiy obuna (agar kanallar qo'shilgan bo'lsa) — joinchat() o'zi
	// obuna bo'lmaganlarni to'xtatadi.
	if (trim((string)@file_get_contents(__DIR__.'/tizim/kanal.txt')) !== '') {
		joinchat($cid);
	}

	$rew = mkf_user($connect, $cid);

	// Taklif bonusi: yangi foydalanuvchi birinchi marta kirganda referrerga bonus
	$refFayl = __DIR__."/step/$cid.referrer";
	if (file_exists($refFayl)) {
		$refId = (int)@file_get_contents($refFayl);
		if ($refId > 0 && $refId !== (int)$cid) {
			$bor = safe_fetch_assoc(mysqli_query($connect, "SELECT id FROM referrals WHERE referrer_id = '$refId' AND referee_id = '".mysqli_real_escape_string($connect,(string)$cid)."'"));
			if (!$bor) {
				$refBonus = (int)trim((string)@file_get_contents(__DIR__.'/tizim/taklif.txt') ?: '500');
				if ($refBonus <= 0) { $refBonus = 500; }
				$refSana = date('d.m.Y H:i');
				$refLink = "t.me/".$bot."?start=".$cid;
				mysqli_query($connect, "INSERT INTO referrals(`referrer_id`,`referee_id`,`ref_link`,`sana`,`bonus_berildi`) VALUES ('$refId','".mysqli_real_escape_string($connect,(string)$cid)."','".mysqli_real_escape_string($connect,$refLink)."','$refSana','$refBonus')");
				mysqli_query($connect, "UPDATE kabinet SET pul = pul + $refBonus, odam = odam + 1 WHERE user_id = '$refId'");
				bot('sendMessage', [
					'chat_id'=>$refId,
					'text'=>"<b>🎉 Yangi taklif!</b>\n\nSiz taklif qilgan foydalanuvchi botga qo'shildi.\n\n<b>+".mkf_pul($refBonus)." so'm</b> hisobingizga qo'shildi 💰",
					'parse_mode'=>'html',
				]);
			}
		}
		@unlink($refFayl);
	}

	// Bo'limlar FAQAT bitta joyda — foydalanuvchi tanlagan uslubga qarab
	// (pastda yoki xabarning o'zida). Ikkita xabar yuborilmaydi.
	mkf_menyu_yubor($connect, $cid, trim(((string)$name).' '.((string)$familya)));
	exit();
}

// --- Majburiy obunani qayta tekshirish tugmasi ---
if ($data === "result") {
	if (joinchat($cid2) == true) {
		bot('deleteMessage', ['chat_id'=>$cid2,'message_id'=>$mid2]);
		mkf_menyu_yubor($connect, $cid2, (string)$callname);
	}
	exit();
}

// ============================================================================
//  ASOSIY MENYU
// ============================================================================
if ($data === "menyu") {
	mkf_step_ochir($mkfUid);
	$ismi = $qid ? trim(((string)$callname).' '.((string)$surname)) : trim(((string)$name).' '.((string)$familya));
	mkf_menyu_yubor($connect, $mkfUid, $ismi, $mid2, $qid);
	exit();
}

// ============================================================================
//  ⚙️ SOZLAMALAR — menyu ko'rinishini tanlash
// ============================================================================
if ($data === "sozlamalar") {
	mkf_step_ochir($mkfUid);
	$uslub = mkf_uslub($connect, $mkfUid);
	$t  = "<b>⚙️ Sozlamalar — menyu ko'rinishi</b>\n\n";
	$t .= "Bo'limlar qayerda chiqishini o'zingiz tanlaysiz. Ikkalasida ham barcha bo'limlar bir xil ishlaydi — farqi faqat ko'rinishda.\n\n";
	$t .= "<blockquote><b>⌨️ Klassik</b>\nBo'limlar pastda, klaviatura o'rnida turadi. Doimiy ko'rinib turadi, bir bosishda ochiladi — tez ishlash uchun qulay.</blockquote>\n";
	$t .= "<blockquote><b>💬 Zamonaviy</b>\nPastki panel yo'q — bo'limlar xabarning o'zida, tepada chiqadi. Ekran toza bo'ladi, chat keng ko'rinadi.</blockquote>\n\n";
	$t .= "<b>Hozirgi tanlov:</b> ".($uslub === 'zamonaviy' ? "💬 Zamonaviy" : "⌨️ Klassik");
	$rows = [
		[['text'=>($uslub === 'klassik' ? "✅ " : "")."⌨️ Klassik (pastda)",'callback_data'=>"uslub_klassik"]],
		[['text'=>($uslub === 'zamonaviy' ? "✅ " : "")."💬 Zamonaviy (tepada)",'callback_data'=>"uslub_zamonaviy"]],
		[['text'=>"🔗 Google hisob (ulash / uzish)",'callback_data'=>"google_hisob"]],
		[mkf_orqaga('menyu')],
	];
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>$rows], JSON_UNESCAPED_UNICODE));
	exit();
}

if ($data === "uslub_klassik" || $data === "uslub_zamonaviy") {
	$yangi = mkf_uslub_yoz($connect, $mkfUid, $data === "uslub_zamonaviy" ? 'zamonaviy' : 'klassik');
	if ($qid) {
		bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>($yangi === 'zamonaviy' ? "💬 Zamonaviy yoqildi" : "⌨️ Klassik yoqildi")]);
	}
	if ($mid2) { bot('deleteMessage', ['chat_id'=>$mkfUid,'message_id'=>$mid2]); }
	// Telegram bitta xabarda HAM inline tugma, HAM "pastki panelni olib tashlash"
	// buyrug'ini qabul qilmaydi. Shuning uchun "zamonaviy" ga o'tilganda panelni
	// bir lahzalik xabar orqali olib tashlaymiz va o'sha xabarni darhol o'chiramiz.
	if ($yangi === 'zamonaviy') {
		$tmp = bot('sendMessage', [
			'chat_id'=>$mkfUid,'text'=>'⌛',
			'reply_markup'=>json_encode(['remove_keyboard'=>true], JSON_UNESCAPED_UNICODE),
		]);
		if ($tmp && isset($tmp->result->message_id)) {
			bot('deleteMessage', ['chat_id'=>$mkfUid,'message_id'=>$tmp->result->message_id]);
		}
	}
	$ismi = $qid ? trim(((string)$callname).' '.((string)$surname)) : trim(((string)$name).' '.((string)$familya));
	mkf_menyu_yubor($connect, $mkfUid, $ismi);
	exit();
}

// ============================================================================
//  🔗 GOOGLE HISOB — Telegram akkauntni Google hisobga ulash / uzish
// ============================================================================
if ($data === "google_hisob") {
	mkf_step_ochir($mkfUid);
	require_once __DIR__.'/link_telegram.php';
	vbLinkTablesTayyor($connect);
	$holat = vbGoogleHolat($connect, (string)$mkfUid);
	if ($holat) {
		$nom = trim((string)(($holat['email'] ?? '') ?: ($holat['ism'] ?? '') ?: 'Google hisob'));
		$t  = "<b>🔗 Google hisob</b>\n\n";
		$t .= "<blockquote>✅ Ulangan: <b>".h($nom)."</b></blockquote>\n\n";
		$t .= "Telegram akkauntingiz shu Google hisobga ulangan. Web ilovaga kirganingizda ayni shu hisob ochiladi.";
		$rows = [
			[['text'=>"❌ Google'dan uzish",'callback_data'=>"google_uzish"]],
			[mkf_orqaga('sozlamalar')],
		];
	} else {
		$t  = "<b>🔗 Google hisob</b>\n\n";
		$t .= "<blockquote>Hozircha Google hisob ulanmagan.</blockquote>\n\n";
		$t .= "Ulasangiz, saytga Google orqali kirganda ham, botdan kirganda ham bitta hisob ishlaydi.";
		$rows = [
			[['text'=>"🔗 Google bilan ulash",'callback_data'=>"google_ulash"]],
			[mkf_orqaga('sozlamalar')],
		];
	}
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>$rows], JSON_UNESCAPED_UNICODE));
	exit();
}

if ($data === "google_ulash") {
	require_once __DIR__.'/link_telegram.php';
	vbLinkTablesTayyor($connect);
	$front = vbFrontendUrl();
	if ($front === '') {
		if ($qid) { bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"Sayt manzili sozlanmagan (FRONTEND_URL). Admin bilan bog'laning.",'show_alert'=>true]); }
		exit();
	}
	$tgUn = (string)(($calluser ?? '') ?: ($username ?? ''));
	$kod  = vbGoogleKodYarat($connect, (string)$mkfUid, $tgUn);
	$url  = $front.'/link?code='.$kod;
	$t  = "<b>🔗 Google bilan ulash</b>\n\n";
	$t .= "<b>1.</b> Pastdagi tugmani bosing (oddiy brauzerda ochiladi)\n";
	$t .= "<b>2.</b> Google hisobingiz bilan kiring\n";
	$t .= "<b>3.</b> Sahifadagi ulanish tasdig'ini kuting\n\n";
	$t .= "<blockquote>⏱ Havola 10 daqiqa amal qiladi. Muddati o'tsa, «Yangi havola» ni bosing.</blockquote>";
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>[
		[['text'=>"🌐 Google bilan davom etish",'url'=>$url]],
		[['text'=>"🔄 Yangi havola",'callback_data'=>"google_ulash"]],
		[mkf_orqaga('google_hisob')],
	]], JSON_UNESCAPED_UNICODE));
	exit();
}

if ($data === "google_uzish") {
	$t  = "<b>❌ Google hisobni uzish</b>\n\n";
	$t .= "Telegram akkauntingiz Google hisobdan uziladi. Keyin Google orqali kirsangiz, bu Telegram akkauntga bog'liq ma'lumotlar ochilmaydi.\n\n<b>Rostdan uzasizmi?</b>";
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>[
		[['text'=>"✅ Ha, uzish",'callback_data'=>"google_uzish_ha"]],
		[['text'=>"🔙 Bekor qilish",'callback_data'=>"google_hisob"]],
	]], JSON_UNESCAPED_UNICODE));
	exit();
}

if ($data === "google_uzish_ha") {
	require_once __DIR__.'/link_telegram.php';
	vbLinkTablesTayyor($connect);
	$ok = vbGoogleUzish($connect, (string)$mkfUid);
	if ($qid) {
		bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>($ok ? "Google hisob uzildi" : "Ulangan hisob topilmadi")]);
	}
	mkf_chiqar($mkfUid, $mid2, $qid,
		$ok ? "<b>✅ Google hisob uzildi.</b>\n\nIstasangiz, qayta ulashingiz mumkin." : "<b>ℹ️ Ulangan Google hisob topilmadi.</b>",
		json_encode(['inline_keyboard'=>[[mkf_orqaga('google_hisob')]]], JSON_UNESCAPED_UNICODE));
	exit();
}

// ============================================================================
//  💳 HISOBIM — balans, to'ldirish, promokod, tranzaksiyalar
// ============================================================================
if ($data === "hisob") {
	mkf_step_ochir($mkfUid);
	$rew = mkf_user($connect, $mkfUid);
	$tarif = joriyTarif($connect, $rew);
	$muddat = trim((string)($rew['tarif_muddat'] ?? ''));
	$t  = "<b>💳 Sizning hisobingiz</b>\n\n";
	$t .= "<blockquote>";
	$t .= "👤 <b>ID:</b> <code>".(int)$mkfUid."</code>\n";
	$t .= "💰 <b>Balans:</b> ".mkf_pul($rew['pul'] ?? 0)." so'm\n";
	$t .= "💎 <b>Tarif:</b> ".h($tarif['nomi'] ?? 'Oddiy');
	if ($muddat !== '' && ($tarif['kalit'] ?? 'oddiy') !== 'oddiy') { $t .= " (".h($muddat)." gacha)"; }
	$t .= "</blockquote>\n\n";
	$t .= "<i>Hisobni to'ldirish to'liq shu botda amalga oshiriladi — summani yozasiz, chek rasmini yuborasiz, admin tasdiqlaydi va pul darhol tushadi.</i>";
	$key = json_encode(['inline_keyboard'=>[
		[['text'=>"➕ Hisobni to'ldirish",'callback_data'=>"dep_start"]],
		[['text'=>"🎁 Promokod kiritish",'callback_data'=>"promokod"]],
		[['text'=>"📊 Tranzaksiyalar",'callback_data'=>"tranzaksiya"],['text'=>"🧾 So'rovlarim",'callback_data'=>"depmine"]],
		[mkf_orqaga('menyu')],
	]], JSON_UNESCAPED_UNICODE);
	mkf_chiqar($mkfUid, $mid2, $qid, $t, $key);
	exit();
}

// --- To'ldirish: summani so'rash ---
if ($data === "dep_start") {
	mkf_step_yoz($mkfUid, 'dep_summa');
	$t  = "<b>➕ Hisobni to'ldirish</b>\n\n";
	$t .= "To'ldirmoqchi bo'lgan <b>summani</b> yuboring (faqat raqam).\n\n";
	$t .= "<blockquote>📝 Namuna: <code>50000</code>\n💡 Eng kam summa: <b>1 000 so'm</b></blockquote>";
	$key = json_encode(['inline_keyboard'=>[[['text'=>"❌ Bekor qilish",'callback_data'=>"hisob"]]]], JSON_UNESCAPED_UNICODE);
	mkf_chiqar($mkfUid, $mid2, $qid, $t, $key);
	exit();
}

// --- To'ldirish: summa qabul qilindi -> karta ko'rsatiladi ---
if (isset($step) && $step === 'dep_summa' && $mkfMatn !== '') {
	$raqam = preg_replace('/[^0-9]/', '', $mkfMatn);
	$summa = (float)$raqam;
	if ($summa < 1000) {
		bot('sendMessage', ['chat_id'=>$cid,'text'=>"<b>⚠️ Noto'g'ri summa.</b>\n\nEng kamida <b>1 000 so'm</b> yuboring. Faqat raqam yozing, masalan: <code>50000</code>",'parse_mode'=>'html']);
		exit();
	}
	if ($summa > 50000000) {
		bot('sendMessage', ['chat_id'=>$cid,'text'=>"<b>⚠️ Juda katta summa.</b>\n\nBir martada eng ko'pi <b>50 000 000 so'm</b>.",'parse_mode'=>'html']);
		exit();
	}
	$uidSafe = mysqli_real_escape_string($connect, (string)$cid);
	mysqli_query($connect, "INSERT INTO tolov_sorovlar(`user_id`,`summa`,`holat`) VALUES ('$uidSafe','$summa','chek_kutilmoqda')");
	$sorovId = (int)mysqli_insert_id($connect);
	if ($sorovId === 0) {
		bot('sendMessage', ['chat_id'=>$cid,'text'=>"<b>❌ Texnik xato.</b> Birozdan keyin qayta urinib ko'ring.",'parse_mode'=>'html']);
		mkf_step_ochir($cid);
		exit();
	}
	mkf_step_yoz($cid, 'dep_chek-'.$sorovId);
	$kartaN = defined('KARTA_RAQAM') ? KARTA_RAQAM : '';
	$kartaE = defined('KARTA_EGASI') ? KARTA_EGASI : '';
	$t  = "<b>💳 To'lov ma'lumotlari</b>\n\n";
	$t .= "<blockquote>";
	$t .= "💵 <b>Summa:</b> ".mkf_pul($summa)." so'm\n";
	$t .= "💳 <b>Karta:</b> <code>".h($kartaN)."</code>\n";
	$t .= "👤 <b>Egasi:</b> ".h($kartaE)."\n";
	$t .= "🧾 <b>So'rov raqami:</b> #".$sorovId;
	$t .= "</blockquote>\n\n";
	$t .= "1️⃣ Yuqoridagi kartaga <b>".mkf_pul($summa)." so'm</b> o'tkazing.\n";
	$t .= "2️⃣ To'lov chekining <b>rasmini (skrinshotini)</b> shu yerga yuboring.\n";
	$t .= "3️⃣ Admin tasdiqlagach, pul balansingizga avtomatik tushadi.\n\n";
	$t .= "<i>⏳ Odatda 5–30 daqiqa ichida tasdiqlanadi.</i>";
	bot('sendMessage', [
		'chat_id'=>$cid,'text'=>$t,'parse_mode'=>'html',
		'reply_markup'=>json_encode(['inline_keyboard'=>[[['text'=>"❌ Bekor qilish",'callback_data'=>"dep_bekor_$sorovId"]]]], JSON_UNESCAPED_UNICODE),
	]);
	exit();
}

// --- To'ldirish: chek rasmi kutilmoqda ---
if (isset($step) && mb_stripos((string)$step, 'dep_chek-') === 0) {
	$sorovId = (int)substr($step, 9);
	if ($mkfPhotoId === '') {
		if ($mkfMatn !== '') {
			bot('sendMessage', ['chat_id'=>$cid,'text'=>"<b>📸 Chek rasmini yuboring.</b>\n\nMatn emas, to'lov chekining <b>rasmini (skrinshot)</b> yuborishingiz kerak.",'parse_mode'=>'html']);
			exit();
		}
	} else {
		$row = safe_fetch_assoc(mysqli_query($connect, "SELECT * FROM tolov_sorovlar WHERE id = $sorovId"));
		if (!$row || (string)$row['user_id'] !== (string)$cid) {
			mkf_step_ochir($cid);
			bot('sendMessage', ['chat_id'=>$cid,'text'=>"<b>❌ So'rov topilmadi.</b> Qaytadan boshlang.",'parse_mode'=>'html']);
			exit();
		}
		$fileSafe = mysqli_real_escape_string($connect, $mkfPhotoId);
		mysqli_query($connect, "UPDATE tolov_sorovlar SET chek_file_id = '$fileSafe', holat = 'kutilmoqda' WHERE id = $sorovId");
		mkf_step_ochir($cid);

		$summa = (float)$row['summa'];
		$ismi  = trim(((string)$name).' '.((string)$familya));
		$userTxt  = "<b>🧾 Yangi to'lov so'rovi #$sorovId</b>\n\n";
		$userTxt .= "👤 <b>Foydalanuvchi:</b> <a href='tg://user?id=$cid'>".h($ismi)."</a>\n";
		$userTxt .= "🆔 <b>ID:</b> <code>$cid</code>\n";
		if (!empty($username)) { $userTxt .= "🔗 <b>Username:</b> @".h($username)."\n"; }
		$userTxt .= "💵 <b>Summa:</b> ".mkf_pul($summa)." so'm\n";
		$userTxt .= "🕓 <b>Vaqt:</b> ".date('d.m.Y H:i');
		$adminKey = json_encode(['inline_keyboard'=>[[
			['text'=>"✅ Tasdiqlash",'callback_data'=>"dep_ok_$sorovId"],
			['text'=>"❌ Rad etish",'callback_data'=>"dep_no_$sorovId"],
		]]], JSON_UNESCAPED_UNICODE);
		foreach (mkf_adminlar() as $adm) {
			bot('sendPhoto', [
				'chat_id'=>$adm,'photo'=>$mkfPhotoId,'caption'=>$userTxt,
				'parse_mode'=>'html','reply_markup'=>$adminKey,
			]);
		}

		bot('sendMessage', [
			'chat_id'=>$cid,
			'text'=>"<b>✅ So'rovingiz qabul qilindi!</b>\n\n<blockquote>🧾 So'rov: #$sorovId\n💵 Summa: ".mkf_pul($summa)." so'm\n📌 Holat: <b>Tekshirilmoqda</b></blockquote>\n\nAdmin tasdiqlagach, pul balansingizga avtomatik qo'shiladi va sizga xabar keladi.",
			'parse_mode'=>'html',
			'reply_markup'=>json_encode(['inline_keyboard'=>[[mkf_orqaga('hisob')]]], JSON_UNESCAPED_UNICODE),
		]);
		exit();
	}
}

// --- To'ldirish so'rovini foydalanuvchi bekor qildi ---
if (mb_stripos((string)$data, "dep_bekor_") === 0) {
	$sorovId = (int)substr($data, 10);
	$row = safe_fetch_assoc(mysqli_query($connect, "SELECT * FROM tolov_sorovlar WHERE id = $sorovId"));
	if ($row && (string)$row['user_id'] === (string)$mkfUid && in_array($row['holat'], ['chek_kutilmoqda','kutilmoqda'], true)) {
		mysqli_query($connect, "UPDATE tolov_sorovlar SET holat = 'bekor' WHERE id = $sorovId");
	}
	mkf_step_ochir($mkfUid);
	mkf_chiqar($mkfUid, $mid2, $qid, "<b>❌ To'lov so'rovi bekor qilindi.</b>", json_encode(['inline_keyboard'=>[[mkf_orqaga('hisob')]]], JSON_UNESCAPED_UNICODE));
	exit();
}

// --- ADMIN: to'lovni tasdiqlash ---
if (mb_stripos((string)$data, "dep_ok_") === 0) {
	if (!mkf_admin_mi($callfrid)) {
		bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"Bu tugma faqat adminlar uchun",'show_alert'=>true]);
		exit();
	}
	$sorovId = (int)substr($data, 7);
	$row = safe_fetch_assoc(mysqli_query($connect, "SELECT * FROM tolov_sorovlar WHERE id = $sorovId"));
	if (!$row) {
		bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"So'rov topilmadi",'show_alert'=>true]);
		exit();
	}
	if ($row['holat'] !== 'kutilmoqda') {
		bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"Bu so'rov allaqachon ko'rib chiqilgan",'show_alert'=>true]);
		exit();
	}
	$summa = (float)$row['summa'];
	$uSafe = mysqli_real_escape_string($connect, (string)$row['user_id']);
	$aSafe = mysqli_real_escape_string($connect, (string)$callfrid);
	mysqli_query($connect, "UPDATE tolov_sorovlar SET holat = 'tasdiqlandi', admin_id = '$aSafe' WHERE id = $sorovId AND holat = 'kutilmoqda'");
	if (mysqli_affected_rows($connect) < 1) {
		bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"Bu so'rov allaqachon ko'rib chiqilgan",'show_alert'=>true]);
		exit();
	}
	mysqli_query($connect, "UPDATE kabinet SET pul = pul + $summa WHERE user_id = '$uSafe'");
	addBalanceAudit($connect, (string)$row['user_id'], $summa, 'hisob_toldirish', "To'lov so'rovi #$sorovId tasdiqlandi", '');

	$yangi = safe_fetch_assoc(mysqli_query($connect, "SELECT pul FROM kabinet WHERE user_id = '$uSafe'"));
	bot('sendMessage', [
		'chat_id'=>$row['user_id'],
		'text'=>"<b>✅ To'lovingiz tasdiqlandi!</b>\n\n<blockquote>🧾 So'rov: #$sorovId\n💵 Qo'shildi: <b>+".mkf_pul($summa)." so'm</b>\n💰 Yangi balans: <b>".mkf_pul($yangi['pul'] ?? 0)." so'm</b></blockquote>\n\nEndi bot yaratishingiz yoki tarif sotib olishingiz mumkin 🎉",
		'parse_mode'=>'html',
		'reply_markup'=>json_encode(['inline_keyboard'=>[
			[['text'=>"➕ Bot yaratish",'callback_data'=>"newbot"]],
			[['text'=>"💎 Tariflar",'callback_data'=>"tariflar"]],
		]], JSON_UNESCAPED_UNICODE),
	]);
	bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"✅ Tasdiqlandi",'show_alert'=>false]);
	bot('editMessageCaption', [
		'chat_id'=>$cid2,'message_id'=>$mid2,
		'caption'=>"✅ <b>TASDIQLANDI</b> — #$sorovId\n\n👤 <code>".h((string)$row['user_id'])."</code>\n💵 ".mkf_pul($summa)." so'm\n👮 Admin: <code>$callfrid</code>",
		'parse_mode'=>'html',
	]);
	exit();
}

// --- ADMIN: to'lovni rad etish ---
if (mb_stripos((string)$data, "dep_no_") === 0) {
	if (!mkf_admin_mi($callfrid)) {
		bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"Bu tugma faqat adminlar uchun",'show_alert'=>true]);
		exit();
	}
	$sorovId = (int)substr($data, 7);
	$row = safe_fetch_assoc(mysqli_query($connect, "SELECT * FROM tolov_sorovlar WHERE id = $sorovId"));
	if (!$row || $row['holat'] !== 'kutilmoqda') {
		bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"So'rov topilmadi yoki ko'rib chiqilgan",'show_alert'=>true]);
		exit();
	}
	$aSafe = mysqli_real_escape_string($connect, (string)$callfrid);
	mysqli_query($connect, "UPDATE tolov_sorovlar SET holat = 'rad', admin_id = '$aSafe' WHERE id = $sorovId AND holat = 'kutilmoqda'");
	bot('sendMessage', [
		'chat_id'=>$row['user_id'],
		'text'=>"<b>❌ To'lov so'rovingiz rad etildi</b>\n\n<blockquote>🧾 So'rov: #$sorovId\n💵 Summa: ".mkf_pul($row['summa'])." so'm</blockquote>\n\nChek rasmi noaniq bo'lishi yoki to'lov kelib tushmagan bo'lishi mumkin. Iltimos, qaytadan urinib ko'ring yoki «💬 Yordam» orqali murojaat qiling.",
		'parse_mode'=>'html',
		'reply_markup'=>json_encode(['inline_keyboard'=>[
			[['text'=>"🔄 Qayta urinish",'callback_data'=>"dep_start"]],
			[['text'=>"💬 Yordam",'callback_data'=>"yordam"]],
		]], JSON_UNESCAPED_UNICODE),
	]);
	bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"❌ Rad etildi",'show_alert'=>false]);
	bot('editMessageCaption', [
		'chat_id'=>$cid2,'message_id'=>$mid2,
		'caption'=>"❌ <b>RAD ETILDI</b> — #$sorovId\n\n👤 <code>".h((string)$row['user_id'])."</code>\n💵 ".mkf_pul($row['summa'])." so'm\n👮 Admin: <code>$callfrid</code>",
		'parse_mode'=>'html',
	]);
	exit();
}

// --- Foydalanuvchining to'lov so'rovlari ---
if ($data === "depmine") {
	$uSafe = mysqli_real_escape_string($connect, (string)$mkfUid);
	$res = mysqli_query($connect, "SELECT * FROM tolov_sorovlar WHERE user_id = '$uSafe' ORDER BY id DESC LIMIT 10");
	$t = "<b>🧾 Oxirgi to'lov so'rovlaringiz</b>\n\n";
	$bor = false;
	$nomlar = ['kutilmoqda'=>'⏳ Tekshirilmoqda','tasdiqlandi'=>'✅ Tasdiqlangan','rad'=>'❌ Rad etilgan','bekor'=>'🚫 Bekor qilingan','chek_kutilmoqda'=>'📸 Chek kutilmoqda'];
	while ($r = safe_fetch_assoc($res)) {
		$bor = true;
		$holatN = $nomlar[$r['holat']] ?? h($r['holat']);
		$t .= "#".$r['id']." — ".mkf_pul($r['summa'])." so'm — $holatN\n<i>".h(substr((string)$r['sana'],0,16))."</i>\n\n";
	}
	if (!$bor) { $t .= "<i>Hali birorta so'rov yo'q.</i>"; }
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>[
		[['text'=>"➕ Yangi to'lov",'callback_data'=>"dep_start"]],
		[mkf_orqaga('hisob')],
	]], JSON_UNESCAPED_UNICODE));
	exit();
}

// --- Tranzaksiyalar tarixi ---
if ($data === "tranzaksiya") {
	$uSafe = mysqli_real_escape_string($connect, (string)$mkfUid);
	$res = @mysqli_query($connect, "SELECT * FROM balance_log WHERE user_id = '$uSafe' ORDER BY id DESC LIMIT 10");
	$t = "<b>📊 Oxirgi 10 ta harakat</b>\n\n";
	$bor = false;
	if ($res) {
		while ($r = safe_fetch_assoc($res)) {
			$bor = true;
			$s = (float)$r['summa'];
			$belgi = $s >= 0 ? "🟢 +" : "🔴 ";
			$t .= $belgi.mkf_pul($s)." so'm — ".h((string)$r['izoh'] ?: (string)$r['sabab'])."\n<i>".h(substr((string)$r['sana'],0,16))."</i>\n\n";
		}
	}
	if (!$bor) { $t .= "<i>Hali harakatlar yo'q.</i>"; }
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>[[mkf_orqaga('hisob')]]], JSON_UNESCAPED_UNICODE));
	exit();
}

// --- Promokod ---
if ($data === "promokod") {
	mkf_step_yoz($mkfUid, 'promokod');
	mkf_chiqar($mkfUid, $mid2, $qid,
		"<b>🎁 Promokod</b>\n\nPromokodni shu yerga yuboring.\n\n<blockquote><i>Promokodlar aksiyalarda, referal darajalarida va admin tomonidan beriladi.</i></blockquote>",
		json_encode(['inline_keyboard'=>[[['text'=>"❌ Bekor qilish",'callback_data'=>"hisob"]]]], JSON_UNESCAPED_UNICODE));
	exit();
}
if (isset($step) && $step === 'promokod' && $mkfMatn !== '') {
	$rew = mkf_user($connect, $cid);
	$natija = promokodIshlat($connect, $rew, $mkfMatn);
	mkf_step_ochir($cid);
	if (!empty($natija['ok'])) {
		addBalanceAudit($connect, (string)$cid, (float)($natija['mukofot'] ?? 0), 'promokod', 'Promokod ishlatildi', '');
	}
	bot('sendMessage', [
		'chat_id'=>$cid,
		'text'=>(!empty($natija['ok']) ? "✅ <b>" : "❌ <b>").h($natija['xabar'])."</b>",
		'parse_mode'=>'html',
		'reply_markup'=>json_encode(['inline_keyboard'=>[
			[['text'=>"🎁 Boshqa promokod",'callback_data'=>"promokod"]],
			[mkf_orqaga('hisob')],
		]], JSON_UNESCAPED_UNICODE),
	]);
	exit();
}

// ============================================================================
//  💎 TARIFLAR — bot ichida ko'rish va sotib olish
// ============================================================================
if ($data === "tariflar") {
	mkf_step_ochir($mkfUid);
	$rew = mkf_user($connect, $mkfUid);
	$joriy = joriyTarif($connect, $rew);
	$royxat = barchaTariflar($connect);
	$t  = "<b>💎 Tariflar</b>\n\n";
	$t .= "Joriy tarifingiz: <b>".h($joriy['nomi'] ?? 'Oddiy')."</b>\n";
	$t .= "Balansingiz: <b>".mkf_pul($rew['pul'] ?? 0)." so'm</b>\n\n";
	$t .= "<i>Tarif chegirma, ko'proq kunlik bonus, referal foizi va qo'shimcha sinov kunlari beradi.</i>";
	$rows = [];
	foreach ($royxat as $tr) {
		$belgi = (($joriy['kalit'] ?? '') === $tr['kalit']) ? "✅ " : "💎 ";
		$rows[] = [['text'=>$belgi.$tr['nomi']." — ".mkf_pul($tr['narxi'])." so'm",'callback_data'=>"tarif_".$tr['kalit']]];
	}
	if (!$rows) { $t .= "\n\n<i>Hozircha tariflar qo'shilmagan.</i>"; }
	$rows[] = [mkf_orqaga('menyu')];
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>$rows], JSON_UNESCAPED_UNICODE));
	exit();
}

if (mb_stripos((string)$data, "tarif_") === 0 && mb_stripos((string)$data, "tarifok_") !== 0) {
	$kalit = substr($data, 6);
	$kSafe = mysqli_real_escape_string($connect, $kalit);
	$tr = safe_fetch_assoc(mysqli_query($connect, "SELECT * FROM tariflar WHERE kalit = '$kSafe'"));
	if (!$tr) {
		bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"Tarif topilmadi",'show_alert'=>true]);
		exit();
	}
	$rew = mkf_user($connect, $mkfUid);
	$t  = "<b>💎 ".h($tr['nomi'])." tarifi</b>\n\n";
	$t .= "<blockquote>";
	$t .= "💵 <b>Narxi:</b> ".mkf_pul($tr['narxi'])." so'm\n";
	$t .= "📆 <b>Muddati:</b> ".(int)$tr['muddat_kun']." kun\n";
	$t .= "🏷 <b>Botlarga chegirma:</b> ".(int)$tr['chegirma']."%\n";
	$t .= "🎁 <b>Kunlik bonus:</b> +".(int)$tr['kunlik_bonus_foiz']."%\n";
	$t .= "👥 <b>Referal bonus:</b> +".(int)$tr['referal_bonus_foiz']."%\n";
	$t .= "⏱ <b>Qo'shimcha sinov kuni:</b> +".(int)$tr['bot_bonus_kun']." kun";
	// "WebApp qo'shish" endi barcha foydalanuvchilar uchun HAR DOIM bepul va
	// avtomatik — shuning uchun bu tarif tafsilotlarida alohida ko'rsatilmaydi.
	$t .= "</blockquote>\n\n";
	$t .= "💰 Balansingiz: <b>".mkf_pul($rew['pul'] ?? 0)." so'm</b>";
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>[
		[['text'=>"✅ Sotib olish",'callback_data'=>"tarifok_".$tr['kalit']]],
		[mkf_orqaga('tariflar')],
	]], JSON_UNESCAPED_UNICODE));
	exit();
}

if (mb_stripos((string)$data, "tarifok_") === 0) {
	$kalit = substr($data, 8);
	$kSafe = mysqli_real_escape_string($connect, $kalit);
	$tr = safe_fetch_assoc(mysqli_query($connect, "SELECT * FROM tariflar WHERE kalit = '$kSafe'"));
	$rew = mkf_user($connect, $mkfUid);
	if (!$tr) {
		bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"Tarif topilmadi",'show_alert'=>true]);
		exit();
	}
	$narx = (float)$tr['narxi'];
	$bal = (float)($rew['pul'] ?? 0);
	if ($bal < $narx) {
		mkf_chiqar($mkfUid, $mid2, $qid,
			"<b>💰 Balans yetarli emas</b>\n\n<blockquote>Tarif narxi: ".mkf_pul($narx)." so'm\nBalansingiz: ".mkf_pul($bal)." so'm\nYetishmayapti: <b>".mkf_pul($narx-$bal)." so'm</b></blockquote>\n\nAvval hisobni to'ldiring.",
			json_encode(['inline_keyboard'=>[
				[['text'=>"➕ Hisobni to'ldirish",'callback_data'=>"dep_start"]],
				[mkf_orqaga('tariflar')],
			]], JSON_UNESCAPED_UNICODE));
		exit();
	}
	$yangiBal = $bal - $narx;
	$muddat = date('Y-m-d', strtotime('+'.intval($tr['muddat_kun']).' days'));
	$uSafe = mysqli_real_escape_string($connect, (string)$mkfUid);
	$mSafe = mysqli_real_escape_string($connect, $muddat);
	mysqli_query($connect, "UPDATE kabinet SET pul = '$yangiBal', tarif = '$kSafe', tarif_muddat = '$mSafe' WHERE user_id = '$uSafe'");
	addBalanceAudit($connect, (string)$mkfUid, -$narx, 'tarif_sotib_olish', 'Tarif: '.($tr['nomi'] ?? ''), '');
	mkf_chiqar($mkfUid, $mid2, $qid,
		"<b>🎉 Tabriklaymiz!</b>\n\n«".h($tr['nomi'])."» tarifi faollashtirildi.\n\n<blockquote>📆 Amal qiladi: <b>".h($muddat)."</b> gacha\n💰 Yangi balans: <b>".mkf_pul($yangiBal)." so'm</b></blockquote>",
		json_encode(['inline_keyboard'=>[
			[['text'=>"➕ Bot yaratish",'callback_data'=>"newbot"]],
			[mkf_orqaga('menyu')],
		]], JSON_UNESCAPED_UNICODE));
	exit();
}

// ============================================================================
//  🤖 BOTLARIM
// ============================================================================
if ($data === "mybots") {
	mkf_step_ochir($mkfUid);
	$botlar = mkf_botlarim($connect, $mkfUid);
	$rows = [];
	foreach (array_slice($botlar, 0, 20) as $b) {
		$qoldi = mkf_qolgan_kun($b);
		$belgi = $qoldi > 0 ? "🟢" : "🔴";
		$rows[] = [['text'=>"$belgi @".$b['useri']." · ".$qoldi." kun",'callback_data'=>"bot_".$b['useri']]];
	}
	$rows[] = [['text'=>"➕ Yangi bot yaratish",'callback_data'=>"newbot"]];
	$rows[] = [mkf_orqaga('menyu')];
	$soni = count($botlar);
	$t = $soni > 0
		? "<b>🤖 Sizning botlaringiz ($soni ta)</b>\n\nBoshqarish uchun botni tanlang.\n\n<blockquote>🟢 — faol · 🔴 — muddati tugagan</blockquote>"
		: "<b>🤖 Sizda hali bot yo'q</b>\n\nQuyidagi tugma orqali birinchi botingizni yarating — 15 soniyada tayyor bo'ladi!";
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>$rows], JSON_UNESCAPED_UNICODE));
	exit();
}

// --- Bitta botning tafsiloti ---
if (mb_stripos((string)$data, "bot_") === 0 && mb_stripos((string)$data, "botdel_") !== 0) {
	$bu = substr($data, 4);
	$buSafe = mysqli_real_escape_string($connect, $bu);
	$uSafe  = mysqli_real_escape_string($connect, (string)$mkfUid);
	// ORDER BY id DESC LIMIT 1: agar bazada shu username'ga eski (takroriy)
	// yozuv qolgan bo'lsa ham, HAR DOIM eng so'nggi (joriy tokenli) yozuv olinadi.
	$b = safe_fetch_assoc(mysqli_query($connect, "SELECT * FROM kunlik WHERE useri = '$buSafe' AND user_id = '$uSafe' ORDER BY id DESC LIMIT 1"));
	if (!$b) {
		bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"Bu bot sizga tegishli emas",'show_alert'=>true]);
		exit();
	}
	$qoldi = mkf_qolgan_kun($b);
	// WebApp endi HAR DOIM avtomatik yoqilgan — alohida yoqish/o'chirish
	// tugmasi endi yo'q, faqat havolani ochish imkoniyati bor.
	$waHavola = botWebAppHavola((int)$b['id'], $bu);
	$t  = "<b>🤖 @".h($bu)."</b>\n\n";
	$t .= "<blockquote>";
	$t .= "🧩 <b>Turi:</b> ".h($b['turi'])."\n";
	$t .= "📅 <b>Yaratilgan:</b> ".h($b['vaqti'])."\n";
	$t .= "⏳ <b>Qolgan muddat:</b> ".$qoldi." kun\n";
	$t .= "💵 <b>Kunlik to'lov:</b> ".mkf_pul($b['narxi'])." so'm\n";
	$t .= "🌐 <b>WebApp:</b> faol ✅ (avtomatik)";
	$t .= "</blockquote>\n\n";
	$t .= "<i>Botingizga <code>/panel</code> deb yozsangiz — statistika va xabar yuborish paneli ochiladi.</i>";
	$rows = [
		[['text'=>"🚀 Botni ochish",'url'=>"https://t.me/$bu"]],
	];
	if ($waHavola !== '') { $rows[] = [['text'=>"🌐 WebAppni ochish",'url'=>$waHavola]]; }
	$rows[] = [['text'=>"⏱ Muddatni uzaytirish",'callback_data'=>"uzay_$bu"]];
	$rows[] = [['text'=>"🗑 Botni o'chirish",'callback_data'=>"botdel_$bu"]];
	$rows[] = [mkf_orqaga('mybots')];
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>$rows], JSON_UNESCAPED_UNICODE));
	exit();
}

// --- Botni o'chirish: tasdiqlash so'raladi ---
if (mb_stripos((string)$data, "botdel_") === 0 && mb_stripos((string)$data, "botdelok_") !== 0) {
	$bu = substr($data, 7);
	$buSafe = mysqli_real_escape_string($connect, $bu);
	$uSafe  = mysqli_real_escape_string($connect, (string)$mkfUid);
	$b = safe_fetch_assoc(mysqli_query($connect, "SELECT id FROM kunlik WHERE useri = '$buSafe' AND user_id = '$uSafe' LIMIT 1"));
	if (!$b) {
		bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"Bu bot sizga tegishli emas",'show_alert'=>true]);
		exit();
	}
	$t  = "<b>🗑 @".h($bu)." ni o'chirish</b>\n\n";
	$t .= "<blockquote>⚠️ Bu amalni ortga qaytarib bo'lmaydi. Bot butunlay o'chiriladi: statistikasi, WebApp ulanishi va boshqaruv paneli ham yo'qoladi.</blockquote>\n\n";
	$t .= "Rostdan ham o'chirmoqchimisiz?";
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>[
		[['text'=>"🗑 Ha, o'chirish",'callback_data'=>"botdelok_$bu"]],
		[mkf_orqaga("bot_$bu")],
	]], JSON_UNESCAPED_UNICODE));
	exit();
}

// --- Botni o'chirish: tasdiqlandi ---
if (mb_stripos((string)$data, "botdelok_") === 0) {
	$bu = substr($data, 9);
	$rew = mkf_user($connect, $mkfUid);
	// TUZATISH: bot va web ilova AYNAN shu bir funksiyadan foydalanadi — ikkalasida
	// ham bir xil natija: webhook o'chiriladi, takroriy yozuvlar (bittasi emas,
	// hammasi) va bots.txt'dagi uchrashuvlar tozalanadi.
	$natija = botToliqOchir($connect, $rew, $bu);
	if (empty($natija['ok'])) {
		bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>$natija['xabar'],'show_alert'=>true]);
		exit();
	}
	mkf_chiqar($mkfUid, $mid2, $qid,
		"<b>✅ ".h($natija['xabar'])."</b>",
		json_encode(['inline_keyboard'=>[
			[['text'=>"🤖 Botlarim",'callback_data'=>"mybots"]],
			[['text'=>"➕ Yangi bot yaratish",'callback_data'=>"newbot"]],
		]], JSON_UNESCAPED_UNICODE));
	exit();
}

// --- Bot muddatini uzaytirish (balansdan) ---
if (mb_stripos((string)$data, "uzay_") === 0 && mb_stripos((string)$data, "uzayok_") !== 0) {
	$bu = substr($data, 5);
	$buSafe = mysqli_real_escape_string($connect, $bu);
	$uSafe  = mysqli_real_escape_string($connect, (string)$mkfUid);
	$b = safe_fetch_assoc(mysqli_query($connect, "SELECT * FROM kunlik WHERE useri = '$buSafe' AND user_id = '$uSafe' ORDER BY id DESC LIMIT 1"));
	if (!$b) { bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"Bot topilmadi",'show_alert'=>true]); exit(); }
	$kunlik = (float)$b['narxi'];
	$rew = mkf_user($connect, $mkfUid);
	$t  = "<b>⏱ @".h($bu)." muddatini uzaytirish</b>\n\n";
	$t .= "<blockquote>💵 Kunlik to'lov: ".mkf_pul($kunlik)." so'm\n💰 Balansingiz: ".mkf_pul($rew['pul'] ?? 0)." so'm</blockquote>\n\n";
	$t .= "Necha kunga uzaytirmoqchisiz?";
	$rows = [];
	foreach ([7, 15, 30] as $k) {
		$narx = $kunlik * $k;
		$rows[] = [['text'=>"$k kun — ".mkf_pul($narx)." so'm",'callback_data'=>"uzayok_".$k."_".$bu]];
	}
	$rows[] = [mkf_orqaga("bot_$bu")];
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>$rows], JSON_UNESCAPED_UNICODE));
	exit();
}

if (mb_stripos((string)$data, "uzayok_") === 0) {
	$qism = explode('_', substr($data, 7), 2);
	$kun = (int)($qism[0] ?? 0);
	$bu  = (string)($qism[1] ?? '');
	$buSafe = mysqli_real_escape_string($connect, $bu);
	$uSafe  = mysqli_real_escape_string($connect, (string)$mkfUid);
	$b = safe_fetch_assoc(mysqli_query($connect, "SELECT * FROM kunlik WHERE useri = '$buSafe' AND user_id = '$uSafe' ORDER BY id DESC LIMIT 1"));
	if (!$b || $kun <= 0) { bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"Xatolik",'show_alert'=>true]); exit(); }
	$narx = (float)$b['narxi'] * $kun;
	$rew = mkf_user($connect, $mkfUid);
	$bal = (float)($rew['pul'] ?? 0);
	if ($bal < $narx) {
		mkf_chiqar($mkfUid, $mid2, $qid,
			"<b>💰 Balans yetarli emas</b>\n\n<blockquote>Kerak: ".mkf_pul($narx)." so'm\nBalans: ".mkf_pul($bal)." so'm</blockquote>",
			json_encode(['inline_keyboard'=>[
				[['text'=>"➕ Hisobni to'ldirish",'callback_data'=>"dep_start"]],
				[mkf_orqaga("bot_$bu")],
			]], JSON_UNESCAPED_UNICODE));
		exit();
	}
	$yangiBal = $bal - $narx;
	$yangiKun = (int)$b['kun'] + $kun;
	mysqli_query($connect, "UPDATE kabinet SET pul = '$yangiBal' WHERE user_id = '$uSafe'");
	mysqli_query($connect, "UPDATE kunlik SET kun = '$yangiKun' WHERE useri = '$buSafe' AND user_id = '$uSafe'");
	addBalanceAudit($connect, (string)$mkfUid, -$narx, 'bot_uzaytirish', "@$bu +$kun kun", '');
	mkf_chiqar($mkfUid, $mid2, $qid,
		"<b>✅ Muddat uzaytirildi!</b>\n\n<blockquote>🤖 @".h($bu)."\n⏱ +$kun kun\n💰 Yangi balans: ".mkf_pul($yangiBal)." so'm</blockquote>",
		json_encode(['inline_keyboard'=>[[mkf_orqaga("bot_$bu")]]], JSON_UNESCAPED_UNICODE));
	exit();
}

// ============================================================================
//  ➕ BOT YARATISH — kategoriya -> shablon -> tasdiq -> token
// ============================================================================

// ============================================================================
//  Katalog va yaratish: Telegramdagi "Maker" boti bilan bir xil manba
//  (SinovMAker/deploy_lib.php). Eski platformBot*() funksiyalari o'rniga.
// ============================================================================
require_once dirname(__DIR__) . '/SinovMAker/deploy_lib.php';

if (!function_exists('mkfShablonlar')) {
	function mkfShablonlar(): array
	{
		$out = [];
		foreach (dpl_catalog() as $t) {
			$out[] = ['kod' => $t['slug'], 'nomi' => $t['title'], 'kategoriya' => $t['category'],
				'tavsif' => $t['description'], 'narx' => $t['price'], 'kunlik' => $t['dailyFee']];
		}
		return $out;
	}
	function mkfKategoriyalar(): array
	{
		$k = [];
		foreach (mkfShablonlar() as $s) { $k[$s['kategoriya']] = ($k[$s['kategoriya']] ?? 0) + 1; }
		return $k;
	}
	/** Balansdan narx yechib, bot yaratadi. Qaytaradi: ok, bot_user, bot_id, xabar, panels, admin_login, admin_password */
	function mkfYarat($connect, array $rew, string $slug, string $token): array
	{
		$tpl = dpl_find_template($slug);
		if (!$tpl) return ['ok' => false, 'xabar' => "Shablon topilmadi."];
		$uid = (string)($rew['user_id'] ?? '');
		if ($uid === '' || !ctype_digit($uid)) return ['ok' => false, 'xabar' => "Telegram ID aniqlanmadi."];
		$price = (float)$tpl['price'];
		$bal = (float)($rew['pul'] ?? 0);
		if ($bal < $price) return ['ok' => false, 'xabar' => "Balansingiz yetarli emas."];
		$uS = mysqli_real_escape_string($connect, $uid);
		$sS = mysqli_real_escape_string($connect, $tpl['slug']);
		if (safe_fetch_assoc(mysqli_query($connect, "SELECT id FROM kunlik WHERE user_id='$uS' AND turi='$sS' LIMIT 1"))) {
			return ['ok' => false, 'xabar' => "Sizda bu turdagi bot allaqachon mavjud."];
		}
		$tok = trim(str_replace('%', ':', $token));
		if (dpl_valid_token($tok)) {
			$tS = mysqli_real_escape_string($connect, $tok);
			if (safe_fetch_assoc(mysqli_query($connect, "SELECT id FROM kunlik WHERE tokeni='$tS' LIMIT 1"))) {
				return ['ok' => false, 'xabar' => "Bu bot allaqachon tizimga ulangan."];
			}
		}
		$https = 'https';
		$base = $https . '://' . ($_SERVER['HTTP_HOST'] ?? '') . '/SinovMAker';
		$dep = dpl_deploy($connect, ['slug' => $tpl['slug'], 'token' => $tok, 'owner_id' => $uid, 'base' => $base]);
		if (empty($dep['ok'])) return ['ok' => false, 'xabar' => (string)($dep['xabar'] ?? 'Bot yaratilmadi.')];
		$bu = (string)$dep['bot_user'];
		if (safe_fetch_assoc(mysqli_query($connect, "SELECT id FROM kunlik WHERE useri='" . mysqli_real_escape_string($connect, $bu) . "' LIMIT 1"))) {
			return ['ok' => false, 'xabar' => "Bu bot allaqachon tizimga ulangan."];
		}
		if (!dpl_register($connect, ['user_id' => $uid, 'owner_id' => $uid, 'bot_user' => $bu, 'slug' => $tpl['slug'],
			'token' => $tok, 'daily' => (float)$tpl['dailyFee'], 'days' => 3])) {
			dpl_tg($tok, 'deleteWebhook');
			return ['ok' => false, 'xabar' => "Bot ma'lumotlarini saqlab bo'lmadi."];
		}
		if ($price > 0) {
			$nb = $bal - $price;
			mysqli_query($connect, "UPDATE kabinet SET pul='$nb' WHERE user_id='$uS'");
			if (function_exists('addBalanceAudit')) addBalanceAudit($connect, $uid, -$price, 'bot_yaratish', 'Bot: ' . $bu);
		}
		return ['ok' => true, 'bot_user' => $bu, 'bot_id' => 0, 'xabar' => 'Tayyor', 'panels' => $dep['panels'],
			'admin_login' => $dep['admin_login'], 'admin_password' => $dep['admin_password']];
	}
}

if ($data === "newbot") {
	mkf_step_ochir($mkfUid);
	$kats = mkfKategoriyalar();
	// Faqat BITTA kategoriya bo'lsa (hozir shunday — hammasi "Daromadli
	// botlar"), kategoriya tanlash qadamini o'tkazib yuboramiz va to'g'ridan-
	// to'g'ri shablonlar ro'yxatini ko'rsatamiz — ortiqcha bosqich bo'lmasin.
	if (count($kats) <= 1) {
		$data = "kat_all";
	} else {
		$rows = [];
		$i = 0;
		$katRoyxat = array_keys($kats);
		foreach ($katRoyxat as $k) {
			$rows[] = [['text'=>"📂 ".$k." (".$kats[$k].")",'callback_data'=>"kat_".$i]];
			$i++;
		}
		$rows[] = [['text'=>"📋 Barcha shablonlar",'callback_data'=>"kat_all"]];
		$rows[] = [mkf_orqaga('menyu')];
		$jami = count(mkfShablonlar());
		$t  = "<b>➕ Yangi bot yaratish</b>\n\n";
		$t .= "Katalogda <b>$jami ta</b> tayyor shablon bor. Barchasi to'liq ishlaydi — siz faqat @BotFather dan token olasiz, qolganini platforma qiladi.\n\n";
		$t .= "<i>Yo'nalishni tanlang:</i>";
		if ($jami === 0) { $t = "<b>⚠️ Katalog hozircha bo'sh.</b>\n\nAdmin bilan bog'laning."; }
		mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>$rows], JSON_UNESCAPED_UNICODE));
		exit();
	}
}

if (mb_stripos((string)$data, "kat_") === 0) {
	$kalit = substr($data, 4);
	$hammasi = mkfShablonlar();
	$katRoyxat = array_keys(mkfKategoriyalar());
	$tanlangan = null;
	if ($kalit !== 'all') {
		$idx = (int)$kalit;
		$tanlangan = $katRoyxat[$idx] ?? null;
	}
	$rew = mkf_user($connect, $mkfUid);
	$tarif = joriyTarif($connect, $rew);
	$chegirma = (int)($tarif['chegirma'] ?? 0);

	$rows = [];
	foreach ($hammasi as $i => $s) {
		if ($tanlangan !== null && $s['kategoriya'] !== $tanlangan) { continue; }
		$narx = $chegirma > 0 ? round($s['narx'] - ($s['narx'] * $chegirma / 100)) : $s['narx'];
		$narxTxt = $narx > 0 ? mkf_pul($narx)." so'm" : "🎁 Bepul";
		$rows[] = [['text'=>$s['nomi']." — ".$narxTxt,'callback_data'=>"tpl_".$i]];
	}
	// Faqat bitta kategoriya bo'lsa, "newbot" bosqichi o'tkazib yuborilgan
	// edi — shu holatda "Orqaga" to'g'ridan-to'g'ri asosiy menyuga qaytadi.
	$rows[] = [mkf_orqaga(count($katRoyxat) <= 1 ? 'menyu' : 'newbot')];
	$sarlavha = $tanlangan !== null ? h($tanlangan) : "Barcha shablonlar";
	$t  = "<b>📂 $sarlavha</b>\n\n";
	$t .= count($rows) > 1 ? "Shablonni tanlang — tavsifi va narxi ko'rsatiladi." : "<i>Bu yo'nalishda hozircha shablon yo'q.</i>";
	if ($chegirma > 0) { $t .= "\n\n<blockquote>🏷 Tarifingiz bo'yicha <b>-$chegirma%</b> chegirma qo'llanilgan.</blockquote>"; }
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>$rows], JSON_UNESCAPED_UNICODE));
	exit();
}

if (mb_stripos((string)$data, "tpl_") === 0 && mb_stripos((string)$data, "tplok_") !== 0) {
	$idx = (int)substr($data, 4);
	$hammasi = mkfShablonlar();
	$s = $hammasi[$idx] ?? null;
	if (!$s) { bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"Shablon topilmadi",'show_alert'=>true]); exit(); }
	$rew = mkf_user($connect, $mkfUid);
	$tarif = joriyTarif($connect, $rew);
	$chegirma = (int)($tarif['chegirma'] ?? 0);
	$narxAsl = (float)$s['narx'];
	$narx = $chegirma > 0 ? round($narxAsl - ($narxAsl * $chegirma / 100)) : $narxAsl;
	$narxMatn = $narx > 0
		? ($chegirma > 0 ? "<s>".mkf_pul($narxAsl)."</s> <b>".mkf_pul($narx)." so'm</b> (-$chegirma%)" : "<b>".mkf_pul($narx)." so'm</b>")
		: "<b>🎁 Bepul</b>";
	$sinovKun = 3 + (int)($tarif['bot_bonus_kun'] ?? 0);
	$t  = "<b>🤖 ".h($s['nomi'])."</b>\n";
	$t .= "<i>".h($s['kategoriya'])."</i>\n\n";
	$t .= h($s['tavsif'])."\n\n";
	$t .= "<blockquote>";
	$t .= "💵 <b>Narxi:</b> $narxMatn\n";
	$t .= "💳 <b>Kunlik to'lov:</b> ".mkf_pul($s['kunlik'])." so'm\n";
	$t .= "🎁 <b>Sinov muddati:</b> $sinovKun kun\n";
	$t .= "💰 <b>Balansingiz:</b> ".mkf_pul($rew['pul'] ?? 0)." so'm";
	$t .= "</blockquote>";
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>[
		[['text'=>"✅ Shu botni yaratish",'callback_data'=>"tplok_".$idx]],
		[mkf_orqaga('newbot')],
	]], JSON_UNESCAPED_UNICODE));
	exit();
}

if (mb_stripos((string)$data, "tplok_") === 0) {
	$idx = (int)substr($data, 6);
	$hammasi = mkfShablonlar();
	$s = $hammasi[$idx] ?? null;
	if (!$s) { bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"Shablon topilmadi",'show_alert'=>true]); exit(); }
	$rew = mkf_user($connect, $mkfUid);
	$tarif = joriyTarif($connect, $rew);
	$chegirma = (int)($tarif['chegirma'] ?? 0);
	$narxAsl = (float)$s['narx'];
	$narx = $chegirma > 0 ? round($narxAsl - ($narxAsl * $chegirma / 100)) : $narxAsl;
	$bal = (float)($rew['pul'] ?? 0);
	if ($bal < $narx) {
		mkf_chiqar($mkfUid, $mid2, $qid,
			"<b>💰 Balansingiz yetarli emas</b>\n\n<blockquote>Shablon narxi: ".mkf_pul($narx)." so'm\nBalansingiz: ".mkf_pul($bal)." so'm\nYetishmayapti: <b>".mkf_pul($narx-$bal)." so'm</b></blockquote>\n\nHisobni shu yerning o'zida to'ldirib, qaytib keling.",
			json_encode(['inline_keyboard'=>[
				[['text'=>"➕ Hisobni to'ldirish",'callback_data'=>"dep_start"]],
				[mkf_orqaga('newbot')],
			]], JSON_UNESCAPED_UNICODE));
		exit();
	}
	mkf_step_yoz($mkfUid, 'await_token-'.$s['kod']);
	$t  = "<b>🔑 Endi bot tokenini yuboring</b>\n\n";
	$t .= "<blockquote>";
	$t .= "1️⃣ <a href='https://t.me/BotFather'>@BotFather</a> ga o'ting\n";
	$t .= "2️⃣ <code>/newbot</code> yuboring, bot nomi va username bering\n";
	$t .= "3️⃣ BotFather bergan <b>tokenni</b> nusxalab, shu yerga tashlang";
	$t .= "</blockquote>\n\n";
	$t .= "<i>Namuna: </i><code>1234567890:AAF...</code>";
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>[
		[['text'=>"❌ Bekor qilish",'callback_data'=>"newbot"]],
	]], JSON_UNESCAPED_UNICODE));
	exit();
}

// --- Token qabul qilindi -> bot yaratiladi ---
if (isset($step) && mb_stripos((string)$step, 'await_token-') === 0 && $mkfMatn !== '') {
	$shablonKod = substr($step, 12);
	$rew = mkf_user($connect, $cid);

	$kutish = bot('sendMessage', ['chat_id'=>$cid,'text'=>"⏳ <b>Bot yaratilmoqda...</b>\n\n<code>▓▓░░░░░░░░</code>  <b>20%</b>\nToken tekshirilmoqda...",'parse_mode'=>'html']);
	$kMid = ($kutish && isset($kutish->result->message_id)) ? $kutish->result->message_id : null;

	$natija = mkfYarat($connect, $rew, $shablonKod, $mkfMatn);

	if (!empty($natija['ok'])) {
		mkf_step_ochir($cid);
		$waHavola = '';
		$yakun  = "<b>🎉 Tayyor! Botingiz ishga tushdi.</b>\n\n";
		$yakun .= "<blockquote>🤖 <b>Bot:</b> @".h($natija['bot_user'])."\n";
		$yakun .= "✅ <b>Holat:</b> faol</blockquote>\n\n";
		if (!empty($natija['admin_password'])) {
			$yakun .= "🔐 <b>Admin panel</b>\n";
			$yakun .= h((string)($natija['panels']['admin'] ?? ''))."\n";
			$yakun .= "Login: <code>".h($natija['admin_login'])."</code>\n";
			$yakun .= "Parol: <code>".h($natija['admin_password'])."</code>\n\n";
		}
		$yakun .= "<b>Keyingi qadam:</b>\n";
		$yakun .= "• Botingizga o'ting va <code>/start</code> bosing\n";
		$yakun .= "• Chatdagi «Menyu» tugmasi orqali Mini App va admin panel ochiladi";
		$tugmaRows = [
			[['text'=>"🚀 Botga o'tish",'url'=>"https://t.me/".$natija['bot_user']]],
		];
		if ($waHavola !== '') { $tugmaRows[] = [['text'=>"🌐 WebAppni ochish",'url'=>$waHavola]]; }
		$tugmaRows[] = [['text'=>"🤖 Botlarim",'callback_data'=>"mybots"]];
		$tugmaRows[] = [mkf_orqaga('menyu')];
		$tugmalar = json_encode(['inline_keyboard'=>$tugmaRows], JSON_UNESCAPED_UNICODE);
		if ($kMid) {
			bot('editMessageText', ['chat_id'=>$cid,'message_id'=>$kMid,'text'=>$yakun,'parse_mode'=>'html','disable_web_page_preview'=>true,'reply_markup'=>$tugmalar]);
		} else {
			bot('sendMessage', ['chat_id'=>$cid,'text'=>$yakun,'parse_mode'=>'html','disable_web_page_preview'=>true,'reply_markup'=>$tugmalar]);
		}
	} else {
		$xato  = "<b>❌ ".h($natija['xabar'])."</b>\n\n";
		$xato .= "<i>Tokenni qayta tekshirib yuboring yoki bekor qiling.</i>";
		$tugmalar = json_encode(['inline_keyboard'=>[[['text'=>"❌ Bekor qilish",'callback_data'=>"newbot"]]]], JSON_UNESCAPED_UNICODE);
		if ($kMid) {
			bot('editMessageText', ['chat_id'=>$cid,'message_id'=>$kMid,'text'=>$xato,'parse_mode'=>'html','reply_markup'=>$tugmalar]);
		} else {
			bot('sendMessage', ['chat_id'=>$cid,'text'=>$xato,'parse_mode'=>'html','reply_markup'=>$tugmalar]);
		}
	}
	exit();
}

// ============================================================================
//  🌐 BOTGA WEBAPP QO'SHISH / O'CHIRISH
// ============================================================================
if (mb_stripos((string)$data, "wa_") === 0 && mb_stripos((string)$data, "waok_") !== 0 && mb_stripos((string)$data, "waoff_") !== 0) {
	$bu = substr($data, 3);
	$rew = mkf_user($connect, $mkfUid);
	$buSafe = mysqli_real_escape_string($connect, $bu);
	$uSafe  = mysqli_real_escape_string($connect, (string)$mkfUid);
	$b = safe_fetch_assoc(mysqli_query($connect, "SELECT * FROM kunlik WHERE useri = '$buSafe' AND user_id = '$uSafe' ORDER BY id DESC LIMIT 1"));
	if (!$b) { bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"Bu bot sizga tegishli emas",'show_alert'=>true]); exit(); }
	$waInfo = botWebAppMalumot($connect, $bu);
	$waFaol = $waInfo && (int)($waInfo['faol'] ?? 1) === 1;
	if ($waFaol) {
		$t = "<b>🌐 @".h($bu)." — WebApp</b>\n\n✅ Hozir yoqilgan. Bot chatidagi «Menyu» tugmasi orqali barcha foydalanuvchilar mini-ilovani ko'radi.\n\nO'chirsangiz, keyin <b>bepul</b> qayta yoqasiz.";
		$tugma = ['text'=>"🔴 O'chirish",'callback_data'=>"waoff_$bu"];
	} elseif ($waInfo) {
		$t = "<b>🌐 @".h($bu)." — WebApp</b>\n\nHozir o'chirilgan. Qayta yoqish <b>bepul</b> — to'lov allaqachon amalga oshirilgan.";
		$tugma = ['text'=>"✅ Qayta yoqish (bepul)",'callback_data'=>"waok_$bu"];
	} else {
		$waNarx = webappNarxi($connect, $rew);
		$narxTxt = $waNarx > 0 ? "<b>".mkf_pul($waNarx)." so'm</b> (bir martalik)" : "<b>🎁 Bepul</b> — tarifingizga kiritilgan";
		$t = "<b>🌐 @".h($bu)." ga WebApp qo'shish</b>\n\nBotingizga tayyor mini-ilova ulanadi — dizayn ham, kod ham platforma tomonidan tayyorlangan.\n\n<blockquote>💵 Narxi: $narxTxt\n💰 Balansingiz: ".mkf_pul($rew['pul'] ?? 0)." so'm</blockquote>";
		$tugma = ['text'=>"✅ Tasdiqlash va yoqish",'callback_data'=>"waok_$bu"];
	}
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>[
		[$tugma],
		[mkf_orqaga("bot_$bu")],
	]], JSON_UNESCAPED_UNICODE));
	exit();
}

if (mb_stripos((string)$data, "waok_") === 0) {
	$bu = substr($data, 5);
	$rew = mkf_user($connect, $mkfUid);
	$natija = botWebAppYoqish($connect, $rew, $bu);
	if (empty($natija['ok'])) {
		bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>$natija['xabar'],'show_alert'=>true]);
		exit();
	}
	mkf_chiqar($mkfUid, $mid2, $qid, "✅ <b>".h($natija['xabar'])."</b>", json_encode(['inline_keyboard'=>[
		[['text'=>"🚀 Botni ochish",'url'=>"https://t.me/$bu"]],
		[mkf_orqaga("bot_$bu")],
	]], JSON_UNESCAPED_UNICODE));
	exit();
}

if (mb_stripos((string)$data, "waoff_") === 0) {
	$bu = substr($data, 6);
	$rew = mkf_user($connect, $mkfUid);
	$natija = botWebAppOchirish($connect, $rew, $bu);
	if (empty($natija['ok'])) {
		bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>$natija['xabar'],'show_alert'=>true]);
		exit();
	}
	mkf_chiqar($mkfUid, $mid2, $qid, "✅ <b>".h($natija['xabar'])."</b>", json_encode(['inline_keyboard'=>[
		[mkf_orqaga("bot_$bu")],
	]], JSON_UNESCAPED_UNICODE));
	exit();
}

// ============================================================================
//  💰 PUL ISHLASH — kanalga obuna bo'lib mukofot olish
// ============================================================================
if ($data === "pulishlash") {
	mkf_step_ochir($mkfUid);
	$uSafe = mysqli_real_escape_string($connect, (string)$mkfUid);
	$res = mysqli_query($connect, "SELECT * FROM pulkanal ORDER BY id DESC");
	$rows = [];
	$jami = 0;
	$ochiq = 0;
	while ($r = safe_fetch_assoc($res)) {
		$jami++;
		$olingan = safe_fetch_assoc(mysqli_query($connect, "SELECT id FROM pulkanal_status WHERE user_id = '$uSafe' AND kanal_id = '".(int)$r['id']."'"));
		if ($olingan) { continue; }
		$ochiq++;
		$rows[] = [['text'=>"📢 ".$r['nomi']." — +".mkf_pul($r['mukofot'])." so'm",'callback_data'=>"pk_".(int)$r['id']]];
	}
	$rows[] = [mkf_orqaga('menyu')];
	$t  = "<b>💰 Pul ishlash</b>\n\n";
	if ($jami === 0) {
		$t .= "<i>Hozircha faol taklif yo'q. Keyinroq qayta tekshiring.</i>";
	} elseif ($ochiq === 0) {
		$t .= "🎉 <b>Barcha kanallar bo'yicha mukofot olingan!</b>\n\n<i>Yangi kanallar qo'shilganda shu bo'limda paydo bo'ladi.</i>";
	} else {
		$t .= "Kanalga obuna bo'ling va mukofotni oling — pul darhol balansingizga tushadi.\n\n<blockquote>Mavjud takliflar: <b>$ochiq ta</b></blockquote>";
	}
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>$rows], JSON_UNESCAPED_UNICODE));
	exit();
}

if (mb_stripos((string)$data, "pk_") === 0 && mb_stripos((string)$data, "pkok_") !== 0) {
	$kId = (int)substr($data, 3);
	$k = safe_fetch_assoc(mysqli_query($connect, "SELECT * FROM pulkanal WHERE id = $kId"));
	if (!$k) { bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"Kanal topilmadi",'show_alert'=>true]); exit(); }
	$kanalUser = ltrim((string)$k['username'], '@');
	$t  = "<b>📢 ".h($k['nomi'])."</b>\n\n";
	$t .= "<blockquote>🎁 Mukofot: <b>+".mkf_pul($k['mukofot'])." so'm</b></blockquote>\n\n";
	$t .= "1️⃣ Kanalga obuna bo'ling\n2️⃣ «Tekshirish» tugmasini bosing\n3️⃣ Pul darhol balansingizga tushadi";
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>[
		[['text'=>"📢 Kanalga o'tish",'url'=>"https://t.me/$kanalUser"]],
		[['text'=>"✅ Tekshirish va olish",'callback_data'=>"pkok_$kId"]],
		[mkf_orqaga('pulishlash')],
	]], JSON_UNESCAPED_UNICODE));
	exit();
}

if (mb_stripos((string)$data, "pkok_") === 0) {
	$kId = (int)substr($data, 5);
	$uSafe = mysqli_real_escape_string($connect, (string)$mkfUid);
	$k = safe_fetch_assoc(mysqli_query($connect, "SELECT * FROM pulkanal WHERE id = $kId"));
	if (!$k) { bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"Kanal topilmadi",'show_alert'=>true]); exit(); }
	$olingan = safe_fetch_assoc(mysqli_query($connect, "SELECT id FROM pulkanal_status WHERE user_id = '$uSafe' AND kanal_id = $kId"));
	if ($olingan) {
		bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"Siz bu mukofotni allaqachon olgansiz",'show_alert'=>true]);
		exit();
	}
	$azo = bot('getChatMember', ['chat_id'=>$k['username'],'user_id'=>$mkfUid]);
	$holat = ($azo && isset($azo->result->status)) ? $azo->result->status : '';
	if (!in_array($holat, ['member','administrator','creator'], true)) {
		bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"❌ Siz hali kanalga obuna bo'lmagansiz!",'show_alert'=>true]);
		exit();
	}
	$mukofot = (float)$k['mukofot'];
	$sana = date('d.m.Y H:i');
	mysqli_query($connect, "INSERT INTO pulkanal_status(user_id, kanal_id, sana) VALUES ('$uSafe', $kId, '$sana')");
	mysqli_query($connect, "UPDATE kabinet SET pul = pul + $mukofot WHERE user_id = '$uSafe'");
	addBalanceAudit($connect, (string)$mkfUid, $mukofot, 'kanal_mukofot', 'Kanal: '.($k['nomi'] ?? ''), '');
	$yangi = safe_fetch_assoc(mysqli_query($connect, "SELECT pul FROM kabinet WHERE user_id = '$uSafe'"));
	bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"🎉 +".mkf_pul($mukofot)." so'm qo'shildi!",'show_alert'=>true]);
	mkf_chiqar($mkfUid, $mid2, $qid,
		"<b>🎉 Mukofot olindi!</b>\n\n<blockquote>📢 ".h($k['nomi'])."\n💵 +".mkf_pul($mukofot)." so'm\n💰 Yangi balans: <b>".mkf_pul($yangi['pul'] ?? 0)." so'm</b></blockquote>",
		json_encode(['inline_keyboard'=>[
			[['text'=>"💰 Boshqa takliflar",'callback_data'=>"pulishlash"]],
			[mkf_orqaga('menyu')],
		]], JSON_UNESCAPED_UNICODE));
	exit();
}

// ============================================================================
//  👥 REFERAL
// ============================================================================
if ($data === "referal") {
	mkf_step_ochir($mkfUid);
	$rew = mkf_user($connect, $mkfUid);
	$ref = referalDaraja($connect, $rew);
	$link = "https://t.me/$bot?start=$mkfUid";
	$bonus = (int)trim((string)@file_get_contents(__DIR__.'/tizim/taklif.txt') ?: '500');
	$t  = "<b>👥 Referal dasturi</b>\n\n";
	$t .= "Do'stingiz havolangiz orqali botga qo'shilsa — sizga <b>".mkf_pul($bonus)." so'm</b> beriladi. U bot yaratsa — yana bonus qo'shiladi.\n\n";
	$t .= "<b>🔗 Sizning havolangiz:</b>\n<code>".h($link)."</code>\n\n";
	$t .= "<blockquote>";
	$t .= "👥 <b>Takliflaringiz:</b> ".(int)($ref['count'] ?? 0)." ta\n";
	$t .= "🏆 <b>Darajangiz:</b> ".h($ref['name'] ?? 'Oddiy')."\n";
	$t .= "💰 <b>Balans:</b> ".mkf_pul($rew['pul'] ?? 0)." so'm";
	$t .= "</blockquote>\n\n";
	$t .= "<i>Darajalar: 1 ta — Starter · 5 ta — Pro · 10 ta — Premium · 20 ta — VIP</i>";
	$ulashMatn = "Telegram botingizni kod yozmasdan yarating! 👇";
	$ulashUrl = "https://t.me/share/url?url=".rawurlencode($link)."&text=".rawurlencode($ulashMatn);
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>[
		[['text'=>"📤 Do'stlarga ulashish",'url'=>$ulashUrl]],
		[mkf_orqaga('menyu')],
	]], JSON_UNESCAPED_UNICODE));
	exit();
}

// ============================================================================
//  📖 QO'LLANMA
// ============================================================================
if ($data === "qollanma") {
	mkf_step_ochir($mkfUid);
	$t  = "<b>📖 Qo'llanma — 4 qadamda o'z botingiz</b>\n\n";
	$t .= "<b>1️⃣ Hisobni to'ldiring</b>\n«💳 Hisobim» → «➕ Hisobni to'ldirish». Summani yozasiz, kartaga o'tkazasiz, chek rasmini yuborasiz. Admin tasdiqlaydi — pul tushadi.\n\n";
	$t .= "<b>2️⃣ Shablonni tanlang</b>\n«➕ Bot yaratish» → yo'nalish → shablon. Har bir shablonning tavsifi va narxi ko'rsatilgan.\n\n";
	$t .= "<b>3️⃣ Token oling</b>\n<a href='https://t.me/BotFather'>@BotFather</a> da <code>/newbot</code> yozing, nom va username bering, tokenni nusxalab shu yerga tashlang.\n\n";
	$t .= "<b>4️⃣ Boshqaring</b>\nBot darhol ishga tushadi. O'z botingizga <code>/panel</code> yozsangiz — statistika, foydalanuvchilar va broadcast paneli ochiladi.\n\n";
	$t .= "<blockquote>💡 <b>Foydali:</b>\n• «💎 Tariflar» — chegirma va bonuslar\n• «💰 Pul ishlash» — bepul balans\n• «👥 Referal» — do'st taklif qilib pul ishlash\n• «⚙️ Sozlamalar» — menyu ko'rinishini o'zgartirish</blockquote>";
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>[
		[['text'=>"➕ Bot yaratish",'callback_data'=>"newbot"]],
		[['text'=>"⚙️ Sozlamalar",'callback_data'=>"sozlamalar"],['text'=>"💬 Yordam",'callback_data'=>"yordam"]],
		[mkf_orqaga('menyu')],
	]], JSON_UNESCAPED_UNICODE));
	exit();
}

// ============================================================================
//  💬 YORDAM — adminga to'g'ridan-to'g'ri xabar (bot ichida)
// ============================================================================
if ($data === "yordam") {
	mkf_step_ochir($mkfUid);
	$adminUser = trim((string)@file_get_contents(__DIR__.'/tizim/user.txt')) ?: 'Makefybot';
	$t  = "<b>💬 Yordam markazi</b>\n\n";
	$t .= "Savolingiz yoki muammoyingiz bormi? Quyidagi tugmani bosib, xabaringizni shu yerga yozing — u to'g'ridan-to'g'ri adminlarga yetib boradi va javob shu botga keladi.\n\n";
	$t .= "<blockquote>⏱ Odatda javob 1 soat ichida beriladi.</blockquote>";
	mkf_chiqar($mkfUid, $mid2, $qid, $t, json_encode(['inline_keyboard'=>[
		[['text'=>"✍️ Adminga yozish",'callback_data'=>"yordam_yoz"]],
		[['text'=>"👤 Admin bilan bog'lanish",'url'=>"https://t.me/".ltrim($adminUser,'@')]],
		[['text'=>"📖 Qo'llanma",'callback_data'=>"qollanma"]],
		[mkf_orqaga('menyu')],
	]], JSON_UNESCAPED_UNICODE));
	exit();
}

if ($data === "yordam_yoz") {
	mkf_step_yoz($mkfUid, 'yordam_matn');
	mkf_chiqar($mkfUid, $mid2, $qid,
		"<b>✍️ Xabaringizni yozing</b>\n\nMuammo yoki savolingizni batafsil yozib yuboring.\n\n<blockquote><i>Bitta xabarda yozing. Rasm kerak bo'lsa, avval matnni yuboring — admin siz bilan bog'lanadi.</i></blockquote>",
		json_encode(['inline_keyboard'=>[[['text'=>"❌ Bekor qilish",'callback_data'=>"yordam"]]]], JSON_UNESCAPED_UNICODE));
	exit();
}

if (isset($step) && $step === 'yordam_matn' && $mkfMatn !== '') {
	mkf_step_ochir($cid);
	$ismi = trim(((string)$name).' '.((string)$familya));
	$xabar  = "<b>💬 Yangi murojaat</b>\n\n";
	$xabar .= "👤 <a href='tg://user?id=$cid'>".h($ismi)."</a>\n";
	$xabar .= "🆔 <code>$cid</code>";
	if (!empty($username)) { $xabar .= "\n🔗 @".h($username); }
	$xabar .= "\n\n<blockquote>".h($mkfMatn)."</blockquote>";
	// Xabar admin panelidagi Chat bo'limida ham ko'rinsin (saytdagi chat bilan bitta suhbat)
	if (function_exists('chatYoz')) { @chatYoz($connect, (int)$cid, $mkfMatn, 'user'); }
	foreach (mkf_adminlar() as $adm) {
		bot('sendMessage', [
			'chat_id'=>$adm,'text'=>$xabar,'parse_mode'=>'html',
			'reply_markup'=>json_encode(['inline_keyboard'=>[[['text'=>"✍️ Javob berish",'callback_data'=>"jav_$cid"]]]], JSON_UNESCAPED_UNICODE),
		]);
	}
	bot('sendMessage', [
		'chat_id'=>$cid,
		'text'=>"<b>✅ Xabaringiz yuborildi!</b>\n\nAdminlar ko'rib chiqib, javobni shu botga yuboradi.",
		'parse_mode'=>'html',
		'reply_markup'=>json_encode(['inline_keyboard'=>[[mkf_orqaga('menyu')]]], JSON_UNESCAPED_UNICODE),
	]);
	exit();
}

// --- ADMIN: murojaatga javob berish ---
if (mb_stripos((string)$data, "jav_") === 0) {
	if (!mkf_admin_mi($callfrid)) {
		bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"Faqat adminlar uchun",'show_alert'=>true]);
		exit();
	}
	$hedef = (int)substr($data, 4);
	mkf_step_yoz($callfrid, 'admin_javob-'.$hedef);
	bot('sendMessage', [
		'chat_id'=>$callfrid,
		'text'=>"<b>✍️ Javob matnini yuboring</b>\n\nFoydalanuvchi: <code>$hedef</code>",
		'parse_mode'=>'html',
		'reply_markup'=>json_encode(['inline_keyboard'=>[[['text'=>"❌ Bekor qilish",'callback_data'=>"jav_bekor"]]]], JSON_UNESCAPED_UNICODE),
	]);
	bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"Javob matnini yuboring"]);
	exit();
}
if ($data === "jav_bekor") {
	mkf_step_ochir($mkfUid);
	bot('answerCallbackQuery', ['callback_query_id'=>$qid,'text'=>"Bekor qilindi"]);
	exit();
}
if (isset($step) && mb_stripos((string)$step, 'admin_javob-') === 0 && $mkfMatn !== '') {
	if (mkf_admin_mi($cid)) {
		$hedef = (int)substr($step, 12);
		mkf_step_ochir($cid);
		bot('sendMessage', [
			'chat_id'=>$hedef,
			'text'=>"<b>💬 Admindan javob:</b>\n\n<blockquote>".h($mkfMatn)."</blockquote>",
			'parse_mode'=>'html',
			'reply_markup'=>json_encode(['inline_keyboard'=>[[['text'=>"✍️ Qayta yozish",'callback_data'=>"yordam_yoz"]]]], JSON_UNESCAPED_UNICODE),
		]);
		if (function_exists('chatYoz')) { @chatYoz($connect, $hedef, $mkfMatn, 'admin'); }
		bot('sendMessage', ['chat_id'=>$cid,'text'=>"✅ <b>Javob yuborildi.</b>",'parse_mode'=>'html']);
		exit();
	}
}