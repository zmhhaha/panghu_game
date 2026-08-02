const INITIAL_STORY = `雨从下午四点开始落，到了夜里，整座临川城像一封被水浸过的旧信。街灯在湿漉漉的石板上拖出细长的倒影，偶尔有末班电车驶过，车轮压住轨道的声音，很快又被雨吞没。

岑野是在关门前七分钟走进旧书店的。他没有带伞，黑色外套却只湿了肩头，仿佛一路都贴着屋檐行走。店主许泊正在清点柜台里的零钱，看见他从怀里取出一本蓝布封面的书，动作便停了下来。

“我想把它放回原来的地方。”岑野说。

那本书没有书名，书脊上缝着一根已经褪成灰白色的金线。许泊没有伸手。他认得它。十七年前，父亲失踪的那个晚上，这本书就放在家里的餐桌上，蓝布封面被撕开一道口子，末页写着一句没能写完的话：等潮水第三次退去，你要——

“原来的地方已经不在了。”许泊说。

岑野抬眼看向书店深处。那里本该是一整面摆满地方志的书架，此刻却传来极轻的滴水声。许泊顺着他的视线望去，才发现最下层不知何时积了一小片水。水不是从天花板落下来的，而是从一本本书的页缝里慢慢渗出，带着海水才有的咸腥气。

墙上的挂钟走到九点整，停了。

下一秒，整条长街的灯同时熄灭。黑暗中，蓝布书自己翻开了。纸页急促掠动，像有人在看不见的地方匆匆检索一段往事。它最后停在一张空白页上。先是一点墨迹从纸背浮出，随后，一行陌生的字缓慢显现：

许泊，别让站在你面前的人活过今晚。

雨声忽然远了。许泊听见岑野的呼吸，也听见书店后门外传来三下敲门声。那是父亲从前约定的暗号，两短，一长。十七年来，只有他们两个人知道。

岑野把手从柜台上收了回去。他的袖口沾着一点深红色的东西，在黑暗里看不清是锈，还是尚未干透的血。

“无论你听见谁的声音，”他说，“都不要开门。”`;

const WORKS = [
  { id: "journey-west", title: "西游记", chapter: "第一回 · 灵根育孕源流出", author: "吴承恩 · 公共领域文本", cast: "孙悟空 · 菩提祖师", language: "zh-CN", text: "盖闻天地之数，有十二万九千六百岁为一元。一元之中，分为十二会，每会该一万八百岁。且就一日而论：子时得阳气，而丑则鸡鸣；寅不通光，而卯则日出；辰时食后，而巳则挨排；日午天中，未时西蹉；申时晡，而日落酉；戌黄昏，而人定亥。譬于大数，若到戌会之终，则天地昏蒙而万物否矣。\\n\\n再说东胜神洲。海外有一国土，名曰傲来国。国近大海，海中有一座名山，唤为花果山。那座山正当顶上，有一块仙石。其石有三丈六尺五寸高，有二丈四尺围圆。\\n\\n石上有九窍八孔，按九宫八卦。四面更无树木遮阴，左右倒有芝兰相衬。盖自开辟以来，每受天真地秀，日精月华，感之既久，遂有灵通之意。内育仙胞，一日迸裂，产一石卵，似圆球样大。因见风，化作一个石猴，五官俱备，四肢皆全。\\n\\n那猴在山中，却会行走跳跃，食草木，饮涧泉，采山花，觅树果；与狼虫为伴，虎豹为群，獐鹿为友，猕猿为亲；夜宿石崖之下，朝游峰洞之中。真是“山中无甲子，寒尽不知年”。" },
  { id: "pride-prejudice", title: "Pride and Prejudice", chapter: "Chapter I", author: "Jane Austen · Public Domain", cast: "Elizabeth Bennet · Mr. Darcy", language: "en-US", text: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.\\n\\nHowever little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters.\\n\\n“My dear Mr. Bennet,” said his lady to him one day, “have you heard that Netherfield Park is let at last?”\\n\\nMr. Bennet replied that he had not.\\n\\n“But it is,” returned she; “for Mrs. Long has just been here, and she told me all about it.”\\n\\nMr. Bennet made no answer.\\n\\n“Do you not want to know who has taken it?” cried his wife impatiently.\\n\\n“You want to tell me, and I have no objection to hearing it.”" },
  { id: "frankenstein", title: "Frankenstein", chapter: "Letter I · To Mrs. Saville", author: "Mary Shelley · Public Domain", cast: "Robert Walton · Victor Frankenstein", language: "en-US", text: "You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings. I arrived here yesterday, and my first task is to assure my dear sister of my welfare, and increase your confidence in the success of my undertaking.\\n\\nI am already far north of London; and as I walk in the streets of Petersburgh, I feel a cold northern breeze play upon my cheeks, which braces my nerves, and fills me with delight. Do you understand this feeling? This breeze, which has travelled from the regions towards which I am advancing, gives me a foretaste of those icy climes.\\n\\nI have hired a vessel and am preparing my companions for the voyage. We shall sail toward the pole, where the compass has no certainty and the sea keeps its own counsel. I cannot describe the pleasure I feel when I imagine the approach of that place; it is the same as a traveller might feel before entering an unexplored country.\\n\\nI am full of hope, and ready to meet the dangers that lie before me. Yet tonight, while the crew slept, I heard a sound beneath the ice, as if something enormous had moved below the ship." },
];

const SCOPES = [
  { id: "local", title: "小范围改写", detail: "保留主线，只改变一处选择或关系。", hint: "保留原作的气质和主要走向" },
  { id: "medium", title: "中等程度改写", detail: "引入新的动机、线索和次要冲突。", hint: "保留人物根基，重排一段因果" },
  { id: "large", title: "大范围改编", detail: "保留世界与人物，允许重塑后续命运。", hint: "从原作的种子长出另一条主线" },
];

const DEFAULT_WORK = WORKS[0];
const STORAGE_KEY_BASE = "xuye-reader-state-v1";
const PLAYER_ID_KEY = "xuye-player-id-v1";
function playerStorageKey() {
  try {
    let playerId = localStorage.getItem(PLAYER_ID_KEY);
    if (!playerId) {
      playerId = crypto.randomUUID();
      localStorage.setItem(PLAYER_ID_KEY, playerId);
    }
    return `${STORAGE_KEY_BASE}:${playerId}`;
  } catch {
    return STORAGE_KEY_BASE;
  }
}
const STORAGE_KEY = playerStorageKey();
const MAX_HISTORY = 8;
const state = {
  segments: [{ id: crypto.randomUUID(), type: "author", text: sourceText(DEFAULT_WORK) }],
  revealed: initialReveal(sourceText(DEFAULT_WORK)),
  playhead: initialReveal(sourceText(DEFAULT_WORK)),
  history: [],
  workId: DEFAULT_WORK.id,
  scope: "local",
  rate: 10,
  fontScale: 1,
  voice: true,
  playing: false,
  generating: false,
};

const model = { ready: false, model: null, host: null, checked: false };
const dom = {
  reader: document.querySelector("#readerCopy"),
  readerWindow: document.querySelector("#readerWindow"),
  readStatus: document.querySelector("#readStatus"),
  readCount: document.querySelector("#readCount"),
  progress: document.querySelector("#progress"),
  playButton: document.querySelector("#playButton"),
  playIcon: document.querySelector("#playIcon"),
  writeButton: document.querySelector("#writeButton"),
  undoButton: document.querySelector("#undoButton"),
  fontDown: document.querySelector("#fontDown"),
  fontUp: document.querySelector("#fontUp"),
  speedSelect: document.querySelector("#speedSelect"),
  downloadButton: document.querySelector("#downloadButton"),
  voiceButton: document.querySelector("#voiceButton"),
  endNote: document.querySelector("#endNote"),
  bookTitle: document.querySelector("#bookTitle"),
  bookChapter: document.querySelector("#bookChapter"),
  bookByline: document.querySelector("#bookByline"),
  manuscriptCast: document.querySelector("#manuscriptCast"),
  writeDialog: document.querySelector("#writeDialog"),
  writeForm: document.querySelector("#writeForm"),
  closeDialog: document.querySelector("#closeDialog"),
  cancelWrite: document.querySelector("#cancelWrite"),
  intervention: document.querySelector("#intervention"),
  charCount: document.querySelector("#charCount"),
  contextPreview: document.querySelector("#contextPreview"),
  writePosition: document.querySelector("#writePosition"),
  commitWrite: document.querySelector("#commitWrite"),
  modelState: document.querySelector("#modelState"),
  modelLabel: document.querySelector("#modelLabel"),
  connectionDialog: document.querySelector("#connectionDialog"),
  closeConnection: document.querySelector("#closeConnection"),
  connectionTitle: document.querySelector("#connectionTitle"),
  connectionHost: document.querySelector("#connectionHost"),
  connectionModel: document.querySelector("#connectionModel"),
  libraryButton: document.querySelector("#libraryButton"),
  libraryDialog: document.querySelector("#libraryDialog"),
  libraryForm: document.querySelector("#libraryForm"),
  workList: document.querySelector("#workList"),
  scopeList: document.querySelector("#scopeList"),
  scopeHint: document.querySelector("#scopeHint"),
  librarySource: document.querySelector("#librarySource"),
  toast: document.querySelector("#toast"),
};

let playbackFrame = 0;
let playbackTime = 0;
let playbackCarry = 0;
let generationController = null;
let generatedSegmentId = null;
let toastTimer = 0;
let lastAutoScroll = 0;
let libraryNeedsChoice = true;
let pendingWorkId = DEFAULT_WORK.id;
let pendingScope = "local";
let speechRun = 0;
let speechWaitTimer = 0;
let activeUtterance = null;
let remoteStateReady = false;
let remoteSaveTimer = 0;

function totalLength() {
  return state.segments.reduce((sum, segment) => sum + segment.text.length, 0);
}

function fullText() {
  return state.segments.map((segment) => segment.text).join("");
}

function sourceText(work) {
  return work.text.replaceAll("\\n", "\n");
}

function currentWork() {
  const work = WORKS.find((item) => item.id === state.workId) || DEFAULT_WORK;
  return { ...work, text: sourceText(work) };
}

function initialReveal(text) {
  const paragraphEnd = text.indexOf("\n\n");
  return Math.min(text.length, paragraphEnd >= 0 ? paragraphEnd + 2 : Math.min(120, text.length));
}

function clampPositions() {
  const total = totalLength();
  state.revealed = Math.max(0, Math.min(state.revealed, total));
  state.playhead = Math.max(0, Math.min(state.playhead, state.revealed));
}

function restoreState() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(STORAGE_KEY_BASE);
      if (raw) localStorage.setItem(STORAGE_KEY, raw);
    }
    const saved = JSON.parse(raw || "null");
    if (!saved || !Array.isArray(saved.segments) || !saved.segments.length) return;
    if (!saved.segments.every((segment) => typeof segment.text === "string" && ["author", "player"].includes(segment.type))) return;
    state.segments = saved.segments.map((segment) => ({
      id: typeof segment.id === "string" ? segment.id : crypto.randomUUID(),
      type: segment.type,
      text: segment.text,
    }));
    if (!WORKS.some((work) => work.id === saved.workId)) {
      state.segments = [{ id: crypto.randomUUID(), type: "author", text: sourceText(DEFAULT_WORK) }];
      state.revealed = initialReveal(sourceText(DEFAULT_WORK));
      state.playhead = state.revealed;
      state.workId = DEFAULT_WORK.id;
      state.scope = "local";
      return;
    }
    state.workId = saved.workId;
    state.scope = SCOPES.some((scope) => scope.id === saved.scope) ? saved.scope : "local";
    state.voice = saved.voice !== false;
    libraryNeedsChoice = false;
    state.revealed = Number(saved.revealed) || 0;
    state.playhead = Number(saved.playhead) || 0;
    state.rate = [6, 10, 16].includes(saved.rate) ? saved.rate : 10;
    state.fontScale = Math.max(0.85, Math.min(1.2, Number(saved.fontScale) || 1));
    state.history = Array.isArray(saved.history) ? saved.history.slice(-MAX_HISTORY) : [];
    clampPositions();
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function persistState() {
  const snapshot = {
    segments: state.segments,
    revealed: state.revealed,
    playhead: state.playhead,
    rate: state.rate,
    fontScale: state.fontScale,
    history: state.history.slice(-MAX_HISTORY),
    workId: state.workId,
    scope: state.scope,
    voice: state.voice,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Playback remains usable when storage is unavailable.
  }
  if (remoteStateReady) {
    window.clearTimeout(remoteSaveTimer);
    remoteSaveTimer = window.setTimeout(() => {
      fetch("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: snapshot }) }).catch(() => {});
    }, 350);
  }
}

async function loadRemoteState() {
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    const saved = payload.state;
    if (saved && Array.isArray(saved.segments) && saved.segments.length) {
      state.segments = saved.segments;
      state.revealed = Number(saved.revealed) || 0;
      state.playhead = Number(saved.playhead) || 0;
      state.rate = [6, 10, 16].includes(saved.rate) ? saved.rate : state.rate;
      state.fontScale = Math.max(0.85, Math.min(1.2, Number(saved.fontScale) || 1));
      state.history = Array.isArray(saved.history) ? saved.history.slice(-MAX_HISTORY) : [];
      state.workId = WORKS.some((work) => work.id === saved.workId) ? saved.workId : DEFAULT_WORK.id;
      state.scope = SCOPES.some((scope) => scope.id === saved.scope) ? saved.scope : "local";
      state.voice = saved.voice !== false;
      libraryNeedsChoice = false;
      clampPositions();
      render();
    }
    remoteStateReady = true;
    persistState();
  } catch {
    // The local browser save remains the offline fallback.
  }
}

function createCaret() {
  const caret = document.createElement("span");
  caret.className = "branch-caret";
  caret.id = "branchCaret";
  caret.setAttribute("aria-hidden", "true");
  return caret;
}

function appendText(fragment, text, segmentType, afterPlayhead) {
  if (!text) return;
  const span = document.createElement("span");
  span.className = segmentType === "player" ? "player-text" : "author-text";
  if (afterPlayhead) span.classList.add("after-playhead");
  span.textContent = text;
  fragment.append(span);
}

function renderReader() {
  clampPositions();
  const fragment = document.createDocumentFragment();
  let offset = 0;
  let caretInserted = false;

  for (const segment of state.segments) {
    const segmentStart = offset;
    const segmentEnd = offset + segment.text.length;
    const visibleEnd = Math.min(segmentEnd, state.revealed);
    if (visibleEnd > segmentStart) {
      const visibleText = segment.text.slice(0, visibleEnd - segmentStart);
      if (!caretInserted && state.playhead >= segmentStart && state.playhead <= visibleEnd) {
        const split = state.playhead - segmentStart;
        appendText(fragment, visibleText.slice(0, split), segment.type, false);
        fragment.append(createCaret());
        caretInserted = true;
        appendText(fragment, visibleText.slice(split), segment.type, true);
      } else {
        appendText(fragment, visibleText, segment.type, caretInserted || segmentStart >= state.playhead);
      }
    }
    offset = segmentEnd;
    if (offset >= state.revealed) break;
  }

  if (!caretInserted) fragment.append(createCaret());
  if (state.generating && state.revealed >= totalLength()) {
    const waiting = document.createElement("span");
    waiting.className = "generating-caret";
    waiting.setAttribute("aria-hidden", "true");
    fragment.append(waiting);
  }
  dom.reader.replaceChildren(fragment);
}

function renderWork() {
  const work = currentWork();
  dom.bookTitle.textContent = work.title;
  dom.bookChapter.textContent = work.chapter;
  dom.bookByline.textContent = work.author;
  dom.manuscriptCast.textContent = work.cast;
  document.title = "续页 · " + work.title;
}

function renderControls() {
  const total = totalLength();
  const readMaximum = Math.max(1, state.revealed);
  dom.progress.max = String(readMaximum);
  dom.progress.value = String(state.playhead);
  dom.progress.style.setProperty("--progress-fill", `${(state.playhead / readMaximum) * 100}%`);
  dom.playIcon.textContent = state.playing ? "Ⅱ" : "▶";
  dom.playButton.classList.toggle("is-playing", state.playing);
  dom.playButton.title = state.playing ? "暂停" : "播放";
  dom.playButton.setAttribute("aria-label", state.playing ? "暂停" : "播放");
  dom.voiceButton.classList.toggle("is-active", state.voice);
  dom.voiceButton.title = state.voice ? "关闭声音" : "开启声音";
  dom.voiceButton.setAttribute("aria-label", dom.voiceButton.title);
  dom.writeButton.disabled = state.generating || (model.checked && !model.ready);
  dom.writeButton.title = !model.ready && model.checked ? "模型未连接" : "从当前字句续写";
  dom.undoButton.disabled = state.generating || state.history.length === 0;
  dom.readCount.textContent = `已读 ${state.revealed.toLocaleString("zh-CN")} 字`;
  dom.endNote.hidden = state.generating || state.revealed < total;
  document.documentElement.style.setProperty("--font-scale", String(state.fontScale));

  if (state.generating) {
    dom.readStatus.textContent = state.playing ? "模型续写中 · 正在播放" : "模型续写中 · 已暂停";
  } else if (state.playhead < state.revealed) {
    dom.readStatus.textContent = `已回退至第 ${state.playhead.toLocaleString("zh-CN")} 字`;
  } else if (state.playing) {
    dom.readStatus.textContent = "正在逐字播放";
  } else if (state.revealed >= total) {
    dom.readStatus.textContent = "本章暂止";
  } else {
    dom.readStatus.textContent = state.revealed ? "已暂停" : "停在开篇";
  }

  document.querySelectorAll("[data-rate]").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.rate) === state.rate);
  });
  dom.speedSelect.value = String(state.rate);
}

function render(options = {}) {
  renderWork();
  renderReader();
  renderControls();
  if (options.scroll && Date.now() - lastAutoScroll > 100) {
    const caret = document.querySelector("#branchCaret");
    const caretBounds = caret?.getBoundingClientRect();
    const windowBounds = dom.readerWindow.getBoundingClientRect();
    const readingLine = windowBounds.top + windowBounds.height * 0.68;
    if (caretBounds && (caretBounds.bottom > readingLine || caretBounds.top < windowBounds.top + 24)) {
      dom.readerWindow.scrollTop += caretBounds.top - readingLine;
      lastAutoScroll = Date.now();
    }
  }
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    dom.toast.hidden = true;
  }, 5000);
}

function stopSpeech() {
  speechRun += 1;
  window.clearTimeout(speechWaitTimer);
  speechWaitTimer = 0;
  activeUtterance = null;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

function speechChunk(text, start) {
  const remaining = text.slice(start);
  const sample = remaining.slice(0, 84);
  const match = sample.match(/^[\s\S]{1,70}?[。！？!?；;\n](?:\n)?/);
  return match ? match[0] : remaining.slice(0, 52);
}

function speakNext(run) {
  if (!state.voice || !state.playing || run !== speechRun) return;
  const text = fullText();
  if (state.playhead >= text.length) {
    if (state.generating) {
      speechWaitTimer = window.setTimeout(() => {
        speechWaitTimer = 0;
        speakNext(run);
      }, 180);
    } else {
      state.playing = false;
      persistState();
      render();
    }
    return;
  }
  if (!("speechSynthesis" in window)) {
    state.voice = false;
    playbackTime = 0;
    playbackCarry = 0;
    render();
    playbackFrame = requestAnimationFrame(playbackStep);
    return;
  }
  const start = state.playhead;
  const chunk = speechChunk(text, start);
  if (!chunk) return;
  const utterance = new SpeechSynthesisUtterance(chunk);
  activeUtterance = utterance;
  utterance.lang = currentWork().language;
  utterance.rate = state.rate === 6 ? 0.7 : state.rate === 16 ? 1.25 : 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.onboundary = (event) => {
    if (!state.playing || run !== speechRun || activeUtterance !== utterance) return;
    const offset = Number.isFinite(event.charIndex) ? event.charIndex : 0;
    const length = Number.isFinite(event.charLength) ? event.charLength : 1;
    const position = start + Math.min(chunk.length, offset + length);
    state.playhead = Math.max(state.playhead, position);
    state.revealed = Math.max(state.revealed, state.playhead);
    persistState();
    render({ scroll: true });
  };
  utterance.onend = () => {
    if (!state.playing || run !== speechRun || activeUtterance !== utterance) return;
    activeUtterance = null;
    state.playhead = Math.min(totalLength(), start + chunk.length);
    state.revealed = Math.max(state.revealed, state.playhead);
    persistState();
    render({ scroll: true });
    speakNext(run);
  };
  utterance.onerror = (event) => {
    if (event.error === "canceled" || event.error === "interrupted" || run !== speechRun) return;
    state.voice = false;
    activeUtterance = null;
    playbackTime = 0;
    playbackCarry = 0;
    render();
    showToast("当前浏览器没有可用的朗读声音，已保留逐字播放。");
    playbackFrame = requestAnimationFrame(playbackStep);
  };
  window.speechSynthesis.speak(utterance);
}

function pausePlayback() {
  state.playing = false;
  cancelAnimationFrame(playbackFrame);
  playbackCarry = 0;
  stopSpeech();
  persistState();
  render();
}

function finishPlaybackIfDone() {
  if (state.playhead < totalLength() || state.generating) return false;
  state.playing = false;
  persistState();
  render();
  return true;
}

function playbackStep(time) {
  if (!state.playing || state.voice) return;
  if (!playbackTime) playbackTime = time;
  const elapsed = Math.min(100, time - playbackTime);
  playbackTime = time;
  playbackCarry += (elapsed / 1000) * state.rate;
  const characters = Math.floor(playbackCarry);
  if (characters > 0) {
    playbackCarry -= characters;
    state.playhead = Math.min(totalLength(), state.playhead + characters);
    state.revealed = Math.max(state.revealed, state.playhead);
    persistState();
    render({ scroll: true });
  }
  if (!finishPlaybackIfDone()) playbackFrame = requestAnimationFrame(playbackStep);
}

function startPlayback() {
  if (state.playing) return;
  if (state.playhead >= totalLength() && !state.generating) {
    showToast("已经读到当前结尾，可以回退或从这里续写。");
    return;
  }
  state.playing = true;
  playbackTime = 0;
  playbackCarry = 0;
  render();
  if (state.voice) {
    const run = speechRun;
    speakNext(run);
  } else {
    playbackFrame = requestAnimationFrame(playbackStep);
  }
}

function togglePlayback() {
  if (state.playing) pausePlayback();
  else startPlayback();
}

function toggleVoice() {
  if (!("speechSynthesis" in window)) {
    showToast("当前浏览器不支持朗读声音。");
    return;
  }
  state.voice = !state.voice;
  stopSpeech();
  if (state.playing) {
    playbackTime = 0;
    playbackCarry = 0;
    cancelAnimationFrame(playbackFrame);
    if (state.voice) speakNext(speechRun);
    else playbackFrame = requestAnimationFrame(playbackStep);
  }
  persistState();
  render();
}

function setPlayhead(position) {
  pausePlayback();
  state.playhead = Math.max(0, Math.min(Math.round(position), state.revealed));
  persistState();
  render({ scroll: true });
}

function renderLibrary() {
  dom.workList.replaceChildren();
  for (const work of WORKS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "work-option";
    button.dataset.workId = work.id;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(pendingWorkId === work.id));
    if (pendingWorkId === work.id) button.classList.add("is-selected");
    const language = document.createElement("span");
    language.className = "work-option__language";
    language.textContent = work.language === "zh-CN" ? "中文原文" : "ENGLISH ORIGINAL";
    const title = document.createElement("span");
    title.className = "work-option__title";
    title.textContent = work.title;
    const meta = document.createElement("span");
    meta.className = "work-option__meta";
    meta.textContent = work.author;
    button.append(language, title, meta);
    button.addEventListener("click", () => {
      pendingWorkId = work.id;
      renderLibrary();
    });
    dom.workList.append(button);
  }

  dom.scopeList.replaceChildren();
  for (const scope of SCOPES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "scope-option";
    button.dataset.scopeId = scope.id;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(pendingScope === scope.id));
    if (pendingScope === scope.id) button.classList.add("is-selected");
    const title = document.createElement("span");
    title.className = "scope-option__title";
    title.textContent = scope.title;
    const detail = document.createElement("span");
    detail.className = "scope-option__detail";
    detail.textContent = scope.detail;
    button.append(title, detail);
    button.addEventListener("click", () => {
      pendingScope = scope.id;
      dom.scopeHint.textContent = scope.hint;
      renderLibrary();
    });
    dom.scopeList.append(button);
  }
  dom.scopeHint.textContent = SCOPES.find((scope) => scope.id === pendingScope)?.hint || "";
}

function openLibrary() {
  if (state.generating) {
    showToast("当前续写完成后才能更换作品。");
    return;
  }
  pausePlayback();
  pendingWorkId = state.workId;
  pendingScope = state.scope;
  renderLibrary();
  dom.libraryDialog.showModal();
}

function startSelectedWork(event) {
  event.preventDefault();
  generationController?.abort();
  stopSpeech();
  const work = WORKS.find((item) => item.id === pendingWorkId) || DEFAULT_WORK;
  state.workId = work.id;
  state.scope = pendingScope;
  state.segments = [{ id: crypto.randomUUID(), type: "author", text: sourceText(work) }];
  state.revealed = initialReveal(sourceText(work));
  state.playhead = state.revealed;
  state.history = [];
  state.generating = false;
  state.playing = false;
  libraryNeedsChoice = false;
  persistState();
  render();
  dom.libraryDialog.close();
}

function caretOffsetFromPoint(x, y) {
  let range = null;
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(x, y);
  } else if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y);
    if (position) {
      range = document.createRange();
      range.setStart(position.offsetNode, position.offset);
    }
  }
  if (!range || !dom.reader.contains(range.startContainer)) return null;
  const prefix = document.createRange();
  prefix.selectNodeContents(dom.reader);
  try {
    prefix.setEnd(range.startContainer, range.startOffset);
  } catch {
    return null;
  }
  return prefix.toString().length;
}

function openWriteDialog() {
  if (state.generating) return;
  if (!model.ready) {
    showToast("模型未连接，请先完成服务端配置。");
    dom.connectionDialog.showModal();
    return;
  }
  pausePlayback();
  const context = fullText().slice(0, state.playhead);
  dom.contextPreview.textContent = context.slice(-180) || "（开篇）";
  dom.writePosition.textContent = state.playhead < state.revealed
    ? `从第 ${state.playhead.toLocaleString("zh-CN")} 字分叉`
    : `接在第 ${state.playhead.toLocaleString("zh-CN")} 字之后`;
  dom.intervention.value = "";
  dom.charCount.textContent = "0 / 4000";
  dom.writeDialog.showModal();
  window.setTimeout(() => dom.intervention.focus(), 60);
}

function snapshotState() {
  return {
    segments: structuredClone(state.segments),
    revealed: state.revealed,
    playhead: state.playhead,
  };
}

function truncateSegments(position) {
  const result = [];
  let remaining = position;
  for (const segment of state.segments) {
    if (remaining <= 0) break;
    const text = segment.text.slice(0, remaining);
    if (text) result.push({ ...segment, text });
    remaining -= text.length;
    if (text.length < segment.text.length) break;
  }
  return result;
}

async function readError(response) {
  try {
    const payload = await response.json();
    return payload.error || `请求失败（HTTP ${response.status}）`;
  } catch {
    return `请求失败（HTTP ${response.status}）`;
  }
}

async function consumeEventStream(response, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    let separator = buffer.match(/\r?\n\r?\n/);
    while (separator) {
      const block = buffer.slice(0, separator.index);
      buffer = buffer.slice(separator.index + separator[0].length);
      let event = "message";
      const data = [];
      for (const line of block.split(/\r?\n/)) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
      }
      if (data.length) onEvent(event, JSON.parse(data.join("\n")));
      if (event === "done") {
        await reader.cancel();
        return;
      }
      separator = buffer.match(/\r?\n\r?\n/);
    }
    if (done) break;
  }
}

function appendGeneratedText(token) {
  const segment = state.segments.find((item) => item.id === generatedSegmentId);
  if (!segment) return;
  segment.text += token;
  render();
}

async function requestContinuation(context, intervention) {
  generationController = new AbortController();
  let streamError = null;
  const work = currentWork();
  const response = await fetch("/api/continue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      context,
      intervention,
      scope: state.scope,
      workTitle: work.title,
      workAuthor: work.author,
      language: work.language,
    }),
    signal: generationController.signal,
  });
  if (!response.ok) throw new Error(await readError(response));
  await consumeEventStream(response, (event, payload) => {
    if (event === "token") appendGeneratedText(payload.token || "");
    if (event === "error") streamError = new Error(payload.error || "模型续写失败。");
  });
  if (streamError) throw streamError;
}

async function commitIntervention(event) {
  event.preventDefault();
  const intervention = dom.intervention.value;
  if (!intervention.trim() || state.generating) return;
  const branchPoint = state.playhead;
  const context = fullText().slice(0, branchPoint);
  state.history.push(snapshotState());
  state.history = state.history.slice(-MAX_HISTORY);
  state.segments = truncateSegments(branchPoint);
  state.segments.push({ id: crypto.randomUUID(), type: "player", text: intervention });
  generatedSegmentId = crypto.randomUUID();
  state.segments.push({ id: generatedSegmentId, type: "author", text: "" });
  state.playhead = context.length + intervention.length;
  state.revealed = state.playhead;
  state.generating = true;
  state.playing = false;
  dom.writeDialog.close();
  persistState();
  render();

  try {
    startPlayback();
    await requestContinuation(context, intervention);
    state.generating = false;
    generationController = null;
    persistState();
    render();
  } catch (error) {
    state.generating = false;
    state.playing = false;
    generationController = null;
    cancelAnimationFrame(playbackFrame);
    const generated = state.segments.find((segment) => segment.id === generatedSegmentId);
    if (generated && !generated.text) state.segments = state.segments.filter((segment) => segment.id !== generatedSegmentId);
    persistState();
    render();
    showToast(error.name === "AbortError" ? "续写已停止。" : error.message);
  }
}

function undoIntervention() {
  if (state.generating || !state.history.length) return;
  pausePlayback();
  const snapshot = state.history.pop();
  state.segments = snapshot.segments;
  state.revealed = snapshot.revealed;
  state.playhead = snapshot.playhead;
  persistState();
  render();
  showToast("已撤回上一次续写。");
}

function updateFont(delta) {
  state.fontScale = Math.max(0.85, Math.min(1.2, Math.round((state.fontScale + delta) * 100) / 100));
  persistState();
  render();
}

function downloadText() {
  const work = currentWork();
  const blob = new Blob([work.title + "\n\n" + fullText() + "\n"], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = work.title + "-续页.txt";
  link.click();
  URL.revokeObjectURL(link.href);
}

async function loadModelState() {
  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    if (!response.ok) throw new Error();
    const config = await response.json();
    model.ready = Boolean(config.ready);
    model.model = config.model;
    model.host = config.host;
    model.checked = true;
  } catch {
    model.ready = false;
    model.checked = true;
  }
  dom.modelState.classList.toggle("is-ready", model.ready);
  dom.modelState.classList.toggle("is-error", !model.ready);
  dom.modelLabel.textContent = model.ready ? model.model : "模型未连接";
  dom.connectionTitle.textContent = model.ready ? "连接正常" : "尚未连接";
  dom.connectionHost.textContent = model.host || "—";
  dom.connectionModel.textContent = model.model || "—";
  renderControls();
}

dom.playButton.addEventListener("click", togglePlayback);
dom.writeButton.addEventListener("click", openWriteDialog);
dom.undoButton.addEventListener("click", undoIntervention);
dom.voiceButton.addEventListener("click", toggleVoice);
dom.libraryButton.addEventListener("click", openLibrary);
dom.fontDown.addEventListener("click", () => updateFont(-0.05));
dom.fontUp.addEventListener("click", () => updateFont(0.05));
dom.downloadButton.addEventListener("click", downloadText);
dom.progress.addEventListener("pointerdown", pausePlayback);
dom.progress.addEventListener("input", () => setPlayhead(Number(dom.progress.value)));
dom.intervention.addEventListener("input", () => {
  dom.charCount.textContent = `${dom.intervention.value.length} / 4000`;
});
dom.writeForm.addEventListener("submit", commitIntervention);
dom.libraryForm.addEventListener("submit", startSelectedWork);
dom.closeDialog.addEventListener("click", () => dom.writeDialog.close());
dom.cancelWrite.addEventListener("click", () => dom.writeDialog.close());
dom.modelState.addEventListener("click", () => dom.connectionDialog.showModal());
dom.closeConnection.addEventListener("click", () => dom.connectionDialog.close());

document.querySelectorAll("[data-rate]").forEach((button) => {
  button.addEventListener("click", () => {
    state.rate = Number(button.dataset.rate);
    if (state.playing && state.voice) {
      stopSpeech();
      speakNext(speechRun);
    }
    persistState();
    render();
  });
});

dom.speedSelect.addEventListener("change", () => {
  state.rate = Number(dom.speedSelect.value);
  if (state.playing && state.voice) {
    stopSpeech();
    speakNext(speechRun);
  }
  persistState();
  render();
});

dom.readerWindow.addEventListener("wheel", () => {
  if (state.playing) pausePlayback();
}, { passive: true });

dom.reader.addEventListener("click", (event) => {
  if (!window.getSelection()?.isCollapsed) return;
  const offset = caretOffsetFromPoint(event.clientX, event.clientY);
  if (offset === null) return;
  setPlayhead(offset);
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isEditing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLButtonElement;
  if (event.code === "Space" && !isEditing && !dom.writeDialog.open && !dom.connectionDialog.open) {
    event.preventDefault();
    togglePlayback();
  }
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && dom.writeDialog.open) {
    event.preventDefault();
    dom.writeForm.requestSubmit();
  }
});

window.addEventListener("beforeunload", () => {
  generationController?.abort();
  cancelAnimationFrame(playbackFrame);
});

restoreState();
render();
persistState();
renderLibrary();
if (libraryNeedsChoice) {
  dom.libraryDialog.showModal();
}
loadModelState();
loadRemoteState();
