// ============ コーヒークイズ ゲームロジック ============

const STORAGE_KEY = 'coffee_quiz_progress_v1';
const SESSION_KEY = 'coffee_quiz_session_v1';
const TOTAL_LEVELS = 20;
const QUESTIONS_PER_LEVEL = 50;
const PASS_THRESHOLD = 40; // 40/50 でクリア
const INITIAL_LIVES = 3;

// ゲーム状態
const state = {
  currentLevel: 1,
  currentQuestionIndex: 0,
  questions: [],
  correctCount: 0,
  wrongCount: 0,
  score: 0,
  lives: INITIAL_LIVES,
  answered: false,
  timerId: null,
  timeLeft: 0,
};

// 進捗保存用
const progress = {
  clearedLevels: {},  // {1: {score, rate}, ...}
  totalScore: 0,
  lastLevel: 1,
};

// ============ ユーティリティ ============
function $(id) { return document.getElementById(id); }

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(screenId).classList.add('active');
}

// ローマ数字変換 (1〜20の章表示用)
function toRoman(num) {
  const romans = [
    '', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'
  ];
  return romans[num] || String(num);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) { /* ignore */ }
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      Object.assign(progress, obj);
    }
  } catch (e) { /* ignore */ }
}

// ============ Session: 進行中チャプターの保存・復元 ============
function saveSession() {
  // 進行中チャプターの状態を保存（中断→再開用）
  if (!state.currentLevel || !state.questions || state.questions.length === 0) return;
  if (state.lives <= 0) {
    clearSession(); // 失敗状態は保存しない
    return;
  }

  // 既に解答済みなら次の問題から再開
  let resumeIdx = state.currentQuestionIndex;
  if (state.answered) resumeIdx++;

  if (resumeIdx >= state.questions.length) {
    clearSession(); // 全問終了 → 復元不要
    return;
  }

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      v: 1,
      currentLevel: state.currentLevel,
      currentQuestionIndex: resumeIdx,
      questions: state.questions,
      correctCount: state.correctCount,
      wrongCount: state.wrongCount,
      score: state.score,
      lives: state.lives,
      savedAt: Date.now()
    }));
  } catch (e) { /* ignore */ }
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !s.questions || !Array.isArray(s.questions) || s.questions.length === 0) return null;
    if (typeof s.currentLevel !== 'number' || s.currentLevel < 1 || s.currentLevel > TOTAL_LEVELS) return null;
    return s;
  } catch (e) { return null; }
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
}

function resumeSession(session) {
  state.currentLevel = session.currentLevel;
  state.currentQuestionIndex = session.currentQuestionIndex;
  state.questions = session.questions;
  state.correctCount = session.correctCount;
  state.wrongCount = session.wrongCount;
  state.score = session.score;
  state.lives = session.lives;
  state.answered = false;

  $('current-level-label').textContent = `CHAPTER ${toRoman(state.currentLevel)}`;
  $('level-theme').textContent = (typeof LEVEL_THEMES !== 'undefined' && LEVEL_THEMES[state.currentLevel]) || '';

  progress.lastLevel = state.currentLevel;
  saveProgress();

  showScreen('screen-game');
  renderQuestion();
}

function getLevelTimeLimit(level) {
  // レベルが上がるほど時間が短くなる (30s -> 10s)
  if (level <= 2) return 30;
  if (level <= 5) return 25;
  if (level <= 10) return 20;
  if (level <= 15) return 15;
  return 12;
}

function getLevelBaseScore(level) {
  // 正解ごとの基礎点 (レベルに応じて増加)
  return 10 + (level - 1) * 5;
}

// ============ 初期化 ============
function init() {
  loadProgress();

  // スタート画面のボタン
  $('btn-start').addEventListener('click', () => {
    clearSession(); // 新規ゲーム開始 → 既存セッションは破棄
    state.currentLevel = 1;
    startLevel(1);
  });

  $('btn-continue').addEventListener('click', () => {
    const session = loadSession();
    if (session) {
      resumeSession(session); // 中断したチャプターから再開
    } else {
      startLevel(progress.lastLevel || 1);
    }
  });

  $('btn-level-select').addEventListener('click', () => {
    renderLevelSelect();
    showScreen('screen-level-select');
  });

  $('btn-back-start').addEventListener('click', () => {
    updateContinueButton();
    showScreen('screen-start');
  });

  $('btn-next').addEventListener('click', () => nextQuestion());

  $('btn-next-level').addEventListener('click', () => {
    const next = state.currentLevel + 1;
    if (next > TOTAL_LEVELS) {
      showScreen('screen-complete');
      $('final-score-display').textContent = `総獲得スコア: ${progress.totalScore.toLocaleString()} pt`;
    } else {
      startLevel(next);
    }
  });

  $('btn-retry-level').addEventListener('click', () => startLevel(state.currentLevel));
  $('btn-home').addEventListener('click', () => {
    updateContinueButton();
    showScreen('screen-start');
  });
  $('btn-restart').addEventListener('click', () => {
    progress.clearedLevels = {};
    progress.totalScore = 0;
    progress.lastLevel = 1;
    saveProgress();
    clearSession();
    startLevel(1);
  });

  // ゲーム画面の左上「⌂ホーム」ボタン
  const btnGameHome = $('btn-game-home');
  if (btnGameHome) {
    btnGameHome.addEventListener('click', openHomeConfirm);
  }

  // 確認モーダルの3ボタン
  $('modal-save-home').addEventListener('click', handleSaveAndHome);
  $('modal-discard-home').addEventListener('click', handleDiscardAndHome);
  $('modal-cancel').addEventListener('click', closeHomeConfirm);

  // モーダル背景クリックでキャンセル
  $('modal-home-confirm').addEventListener('click', (e) => {
    if (e.target.id === 'modal-home-confirm') closeHomeConfirm();
  });

  // ESCキーでモーダルを閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('modal-home-confirm').classList.contains('hidden')) {
      closeHomeConfirm();
    }
  });

  // タブ切替・離脱時に自動保存（ゲーム中の場合のみ）
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && $('screen-game').classList.contains('active')) {
      saveSession();
    }
  });
  window.addEventListener('beforeunload', () => {
    if ($('screen-game').classList.contains('active')) saveSession();
  });

  updateContinueButton();
  showScreen('screen-start');
}

// 「続きから」ボタンの表示更新
function updateContinueButton() {
  const btn = $('btn-continue');
  if (!btn) return;
  const session = loadSession();
  if (session) {
    btn.style.display = 'block';
    btn.innerHTML = `続きから<span class="continue-sub">CHAPTER ${toRoman(session.currentLevel)} · ${session.currentQuestionIndex + 1} / ${session.questions.length}</span>`;
  } else if (progress.lastLevel && progress.lastLevel > 1) {
    btn.style.display = 'block';
    btn.innerHTML = `続きから<span class="continue-sub">CHAPTER ${toRoman(progress.lastLevel)}</span>`;
  } else {
    btn.style.display = 'none';
  }
}

// ============ ホーム遷移確認モーダル ============
function openHomeConfirm() {
  // 全問解答済 or ライフ切れ → モーダル不要、結果画面へ
  const lastIdx = state.questions.length - 1;
  const allAnswered = state.answered && state.currentQuestionIndex >= lastIdx;
  if (state.lives <= 0 || allAnswered) {
    finishLevel();
    return;
  }

  // タイマー実行中なら一時停止
  if (state.timerId && !state.answered) {
    pauseTimer();
  }

  // 進捗情報を表示
  const total = state.questions.length;
  const cur = state.currentQuestionIndex + 1;
  const heartsFull = '♥'.repeat(Math.max(0, state.lives));
  const heartsEmpty = '♡'.repeat(Math.max(0, INITIAL_LIVES - state.lives));
  $('modal-progress-info').innerHTML = `
    <div class="mp-chapter">CHAPTER ${toRoman(state.currentLevel)}</div>
    <div class="mp-row"><span class="mp-label">ENTRY</span><span class="mp-value">${cur} / ${total}</span></div>
    <div class="mp-row"><span class="mp-label">CORRECT</span><span class="mp-value">${state.correctCount}</span></div>
    <div class="mp-row"><span class="mp-label">SCORE</span><span class="mp-value">${state.score.toLocaleString()} pt</span></div>
    <div class="mp-row"><span class="mp-label">LIVES</span><span class="mp-value">${heartsFull}${heartsEmpty}</span></div>
  `;

  $('modal-home-confirm').classList.remove('hidden');
}

function closeHomeConfirm() {
  $('modal-home-confirm').classList.add('hidden');
  // タイマーが一時停止中で未解答なら再開
  if (!state.answered && state.timeLeft > 0 && !state.timerId &&
      $('screen-game').classList.contains('active')) {
    resumeTimer();
  }
}

function handleSaveAndHome() {
  saveSession();
  stopTimer();
  $('modal-home-confirm').classList.add('hidden');
  updateContinueButton();
  showScreen('screen-start');
}

function handleDiscardAndHome() {
  clearSession();
  stopTimer();
  $('modal-home-confirm').classList.add('hidden');
  updateContinueButton();
  showScreen('screen-start');
}

// ============ レベル選択画面 ============
function renderLevelSelect() {
  const grid = $('level-grid');
  grid.innerHTML = '';
  const highestUnlocked = Math.max(1, ...Object.keys(progress.clearedLevels).map(Number).concat([0]).map(n => n + 1));
  const session = loadSession();
  const inProgressLevel = session ? session.currentLevel : null;

  for (let i = 1; i <= TOTAL_LEVELS; i++) {
    const btn = document.createElement('button');
    btn.className = 'level-btn';
    const cleared = progress.clearedLevels[i];
    const unlocked = i <= highestUnlocked;
    const isInProgress = (i === inProgressLevel);

    const roman = toRoman(i);

    if (isInProgress) {
      // 進行中のチャプター（最優先表示）
      btn.classList.add('unlocked', 'in-progress');
      const cur = session.currentQuestionIndex + 1;
      const tot = session.questions.length;
      btn.innerHTML = `<span class="lv-chapter">Chapter</span><span class="lv-num">${roman}</span><span class="lv-stars">${cur} / ${tot}</span>`;
    } else if (cleared) {
      btn.classList.add('cleared', 'unlocked');
      const stars = cleared.rate >= 0.96 ? '★★★' : cleared.rate >= 0.88 ? '★★' : '★';
      btn.innerHTML = `<span class="lv-chapter">Chapter</span><span class="lv-num">${roman}</span><span class="lv-stars">${stars}</span>`;
    } else if (unlocked) {
      btn.classList.add('unlocked');
      btn.innerHTML = `<span class="lv-chapter">Chapter</span><span class="lv-num">${roman}</span><span class="lv-stars">挑戦可</span>`;
    } else {
      btn.classList.add('locked');
      btn.innerHTML = `<span class="lv-chapter">Chapter</span><span class="lv-num">${roman}</span><span class="lv-stars">🔒</span>`;
    }

    if (isInProgress) {
      // 進行中チャプターをクリック → セッション復元
      btn.addEventListener('click', () => resumeSession(session));
    } else if (unlocked) {
      btn.addEventListener('click', () => startLevel(i));
    }
    grid.appendChild(btn);
  }
}

// ============ レベル開始 ============
function startLevel(level) {
  // 新規開始 → 既存セッションは破棄
  clearSession();

  state.currentLevel = level;
  state.currentQuestionIndex = 0;
  state.correctCount = 0;
  state.wrongCount = 0;
  state.score = 0;
  state.lives = INITIAL_LIVES;
  state.answered = false;

  const all = (typeof QUESTIONS_BY_LEVEL !== 'undefined' && QUESTIONS_BY_LEVEL[level]) || [];
  // レベルの問題(50問)をシャッフルして使う
  state.questions = shuffle(all).slice(0, QUESTIONS_PER_LEVEL);

  $('current-level-label').textContent = `CHAPTER ${toRoman(level)}`;
  $('level-theme').textContent = (typeof LEVEL_THEMES !== 'undefined' && LEVEL_THEMES[level]) || '';

  progress.lastLevel = level;
  saveProgress();

  showScreen('screen-game');
  renderQuestion();
}

// ============ 問題表示 ============
function renderQuestion() {
  const q = state.questions[state.currentQuestionIndex];
  if (!q) {
    // 問題が尽きた
    finishLevel();
    return;
  }

  state.answered = false;

  // ヘッダー更新
  const total = state.questions.length;
  const progressPct = (state.currentQuestionIndex / total) * 100;
  $('progress-bar').style.width = progressPct + '%';
  $('progress-text').textContent = `${state.currentQuestionIndex} / ${total}`;
  $('correct-count').textContent = state.correctCount;
  $('score-display').textContent = state.score;
  $('lives-display').textContent = '♥'.repeat(Math.max(0, state.lives)) + '♡'.repeat(Math.max(0, INITIAL_LIVES - state.lives));

  // 問題番号（Entry表記）
  $('question-number').textContent = `ENTRY ${state.currentQuestionIndex + 1} / ${total}`;

  // 問題文
  $('question-text').textContent = q.question;

  // 選択肢（表示はシャッフル）
  const optsEl = $('options-container');
  optsEl.innerHTML = '';

  const indexed = q.options.map((opt, idx) => ({ opt, idx }));
  const shuffled = shuffle(indexed);
  const labels = ['A', 'B', 'C', 'D'];

  shuffled.forEach((o, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<span class="opt-label">${labels[i]}</span><span class="opt-text">${o.opt}</span>`;
    btn.addEventListener('click', () => handleAnswer(btn, o.idx === q.answer, shuffled));
    optsEl.appendChild(btn);
  });

  // フィードバック非表示
  $('feedback').classList.add('hidden');
  $('btn-next').classList.add('hidden');

  // タイマー開始
  startTimer();

  // 進捗を自動保存（中断された時に復元できるように）
  saveSession();
}

// ============ タイマー ============
function startTimer() {
  const limit = getLevelTimeLimit(state.currentLevel);
  state.timeLeft = limit;
  const bar = $('timer-bar');
  bar.style.width = '100%';
  bar.classList.remove('warning');

  clearInterval(state.timerId);
  const startedAt = Date.now();
  state.timerId = setInterval(() => {
    const elapsed = (Date.now() - startedAt) / 1000;
    const remaining = Math.max(0, limit - elapsed);
    state.timeLeft = remaining;
    const pct = (remaining / limit) * 100;
    bar.style.width = pct + '%';
    if (pct < 30) bar.classList.add('warning');
    if (remaining <= 0) {
      clearInterval(state.timerId);
      if (!state.answered) {
        timeUp();
      }
    }
  }, 100);
}

function stopTimer() {
  clearInterval(state.timerId);
  state.timerId = null;
}

// 一時停止 (state.timeLeft を保持)
function pauseTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

// 一時停止から再開（残り時間からカウント続行）
function resumeTimer() {
  if (state.timeLeft <= 0 || state.answered) return;
  const limit = getLevelTimeLimit(state.currentLevel);
  const startWith = state.timeLeft;
  const bar = $('timer-bar');
  const startedAt = Date.now();
  state.timerId = setInterval(() => {
    const elapsed = (Date.now() - startedAt) / 1000;
    const remaining = Math.max(0, startWith - elapsed);
    state.timeLeft = remaining;
    const pct = (remaining / limit) * 100;
    bar.style.width = pct + '%';
    if (pct < 30) bar.classList.add('warning');
    if (remaining <= 0) {
      clearInterval(state.timerId);
      state.timerId = null;
      if (!state.answered) timeUp();
    }
  }, 100);
}

function timeUp() {
  if (state.answered) return;
  state.answered = true;
  stopTimer();

  const q = state.questions[state.currentQuestionIndex];
  // 正答を強調表示
  const btns = document.querySelectorAll('.option-btn');
  btns.forEach(b => {
    const text = b.querySelector('.opt-text').textContent;
    if (text === q.options[q.answer]) b.classList.add('correct');
    b.disabled = true;
  });

  state.wrongCount++;
  state.lives--;

  showFeedback(false, q, '時間切れ！');

  checkLivesAndContinue();
}

// ============ 回答処理 ============
function handleAnswer(btn, correct, shuffled) {
  if (state.answered) return;
  state.answered = true;
  stopTimer();

  const q = state.questions[state.currentQuestionIndex];
  const btns = document.querySelectorAll('.option-btn');

  // 全ボタンを無効化 & 正解表示
  btns.forEach(b => {
    b.disabled = true;
    const text = b.querySelector('.opt-text').textContent;
    if (text === q.options[q.answer]) b.classList.add('correct');
  });

  if (correct) {
    btn.classList.add('correct');
    state.correctCount++;
    // スコア計算（残り時間ボーナス）
    const base = getLevelBaseScore(state.currentLevel);
    const timeBonus = Math.floor(state.timeLeft * 2);
    state.score += base + timeBonus;
    showFeedback(true, q, `正解！ +${base + timeBonus} pt`);
  } else {
    btn.classList.add('wrong');
    state.wrongCount++;
    state.lives--;
    showFeedback(false, q, '不正解');
  }

  checkLivesAndContinue();
}

function showFeedback(correct, q, title) {
  const fb = $('feedback');
  fb.classList.remove('hidden');
  $('btn-next').classList.remove('hidden');
  $('feedback-icon').textContent = correct ? '✅' : '❌';
  $('feedback-text').textContent = title;
  $('feedback-text').style.color = correct ? '#7dffb0' : '#ff9090';
  $('feedback-explanation').textContent = `正解: ${q.options[q.answer]}\n${q.explanation || ''}`;
}

function checkLivesAndContinue() {
  // ライフが0になったらレベル失敗
  if (state.lives <= 0) {
    // 「次へ」を「結果を見る」に
    $('btn-next').textContent = '結果を見る →';
  } else {
    $('btn-next').textContent = '次へ →';
  }
}

// ============ 次の問題へ ============
function nextQuestion() {
  // ライフ切れなら即終了
  if (state.lives <= 0) {
    finishLevel();
    return;
  }
  state.currentQuestionIndex++;
  if (state.currentQuestionIndex >= state.questions.length) {
    finishLevel();
    return;
  }
  renderQuestion();
}

// ============ レベル終了 ============
function finishLevel() {
  stopTimer();
  clearSession(); // チャプター終了 → 進行中セッションは不要
  const total = state.questions.length;
  const correct = state.correctCount;
  const rate = total > 0 ? correct / total : 0;
  const passed = correct >= PASS_THRESHOLD && state.lives > 0;

  // 画面更新
  $('result-correct').textContent = `${correct} / ${total}`;
  $('result-rate').textContent = `${Math.floor(rate * 100)}%`;
  $('result-score').textContent = `${state.score.toLocaleString()} pt`;

  // ランク判定
  let rank = 'C';
  if (rate >= 0.96) rank = 'S';
  else if (rate >= 0.88) rank = 'A';
  else if (rate >= 0.80) rank = 'B';

  const rankEl = $('rank-display');
  rankEl.className = 'rank-display';
  if (passed) {
    rankEl.classList.add('rank-' + rank.toLowerCase());
    rankEl.textContent = `ランク ${rank}`;
  } else {
    rankEl.classList.add('rank-c');
    rankEl.textContent = state.lives <= 0 ? '💔 ライフ切れ' : '😢 惜しい！';
  }

  // タイトル
  if (passed) {
    $('result-title').textContent = state.currentLevel >= TOTAL_LEVELS ? 'Codex Complete' : 'Chapter Complete';
    $('result-icon').textContent = state.currentLevel >= TOTAL_LEVELS ? '🏆' : '🎉';
  } else {
    $('result-title').textContent = state.lives <= 0 ? 'Chapter Failed' : 'Almost There';
    $('result-icon').textContent = '💪';
  }

  // クリア時は進捗保存
  if (passed) {
    const existing = progress.clearedLevels[state.currentLevel];
    if (!existing || existing.score < state.score) {
      if (existing) progress.totalScore -= existing.score;
      progress.clearedLevels[state.currentLevel] = { score: state.score, rate: rate, rank: rank };
      progress.totalScore += state.score;
    }
    progress.lastLevel = Math.min(state.currentLevel + 1, TOTAL_LEVELS);
    saveProgress();
  }

  // 次レベルボタンの表示判定
  if (passed && state.currentLevel < TOTAL_LEVELS) {
    $('btn-next-level').style.display = 'block';
    $('btn-next-level').textContent = `Chapter ${toRoman(state.currentLevel + 1)} へ`;
  } else if (passed && state.currentLevel >= TOTAL_LEVELS) {
    $('btn-next-level').style.display = 'block';
    $('btn-next-level').textContent = 'Finale へ';
  } else {
    $('btn-next-level').style.display = 'none';
  }

  // アフィリエイトレコメンド描画
  if (typeof renderAffiliates === 'function') {
    renderAffiliates(state.currentLevel, document.getElementById('affiliate-items'));
  }

  // SNSシェアリンク生成
  const shareText = encodeURIComponent(
    `📖 CAFEINOLOGY CODEX — Chapter ${toRoman(state.currentLevel)} を読み解いた\n正解 ${correct}/${total} (${Math.floor(rate*100)}%) · ${state.score.toLocaleString()}pt\n珈琲の叡智を綴じた書。\n#CafeinologyCodex #カフェイノロジーコーデックス`
  );
  const shareUrl = encodeURIComponent(location.href);
  const twitterEl = $('share-twitter');
  const lineEl = $('share-line');
  if (twitterEl) twitterEl.href = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;
  if (lineEl) lineEl.href = `https://social-plugins.line.me/lineit/share?url=${shareUrl}&text=${shareText}`;

  // GA イベント送信
  if (typeof gtag === 'function') {
    gtag('event', 'level_complete', {
      level: state.currentLevel,
      correct: correct,
      score: state.score,
      passed: passed
    });
  }

  showScreen('screen-level-clear');
}

// ============ 起動 ============
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
