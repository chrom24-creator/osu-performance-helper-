import React, { useState, useEffect, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { P2PMeshClient, getUserRoleBadge } from "./p2p_mesh";

export function resolveAvatar(userId: string, username: string): string {
  const cleanId = (userId || "").trim();
  const cleanName = (username || "Player").trim().toUpperCase();
  if (cleanName === "CHROM24" || cleanId === "36024039") {
    return "https://a.ppy.sh/36024039";
  }
  if (cleanName === "IMKICKEDHAEVEN" || cleanName === "IMKICKEDHEAVEN" || cleanId === "32238069") {
    return "https://a.ppy.sh/32238069";
  }
  if (cleanId && /^\d+$/.test(cleanId)) {
    return `https://a.ppy.sh/${cleanId}`;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || "P")}&background=0284c7&color=fff&size=128&bold=true`;
}

interface ScoreCardData {
  id: number | string;
  title: string;
  artist: string;
  creator: string;
  diffName: string;
  beatmapId: number;
  beatmapsetId: number;
  sr: number;
  bpm: number;
  ar: number;
  arMs: number;
  od: number;
  odMs: number;
  cs: number;
  csPx: number;
  hp: number;
  drainTime: string;
  totalTime: string;
  totalObjects: number;
  countCircles: number;
  countSliders: number;
  countSpinners: number;
  rank: "SS" | "S" | "A" | "B" | "C" | "D" | "F";
  passed: boolean;
  mods: string[];
  pp: number;
  fcPp: number;
  chokePp: number;
  aimPp: number;
  speedPp: number;
  accPp: number;
  flPp: number;
  accuracy: number;
  combo: number;
  maxCombo: number;
  count300: number;
  count100: number;
  count50: number;
  countMiss: number;
  sliderTailDrops: number;
  ur: number;
  rankedStatus: string;
  errorAnalysis: string;
  coachingAdvice: string;
  chokeZone: string;
  tapBiasMs: number;
  stepByStepPlan: string[];
  skillGaps: {
    aim: number;
    fingerControl: number;
    speed: number;
    stamina: number;
    reading: number;
    timing: number;
  };
}

interface GroupedBeatmapCard {
  groupKey: string;
  title: string;
  artist: string;
  creator: string;
  diffName: string;
  beatmapId: number;
  beatmapsetId: number;
  attempts: ScoreCardData[];
}

interface DetectedUser {
  username: string;
  user_id: string;
  client_type: string;
  avatar_url: string;
  is_creator: boolean;
  activity?: string;
}

interface SessionSummary {
  key: string;
  timestamp: number;
  title: string;
  scores_count: number;
  avg_acc: number;
  is_main_db?: boolean;
}

interface BottleneckData {
  speed_wall_bpm: number;
  reading_wall_ar: number;
  cs_wall: number;
  stamina_limit_sec: number;
  diagnosis_desc: string;
  recommendations: string[];
}

interface WorkoutItem {
  title: string;
  artist: string;
  diff: string;
  sr: number;
  bpm: number;
  ar: number;
  cs: number;
  focus: string;
  beatmap_id: number;
  beatmapset_id: number;
  md5: string;
}

interface P2PPeer {
  client_id: string;
  user_name: string;
  user_id: string;
  client_type: string;
  activity: string;
  last_seen: number;
  is_p2p_verified: boolean;
  avatar_url: string;
  latency_ms: number;
}

interface HitBuckets {
  early_50: number;
  early_100: number;
  early_300: number;
  perfect: number;
  late_300: number;
  late_100: number;
  late_50: number;
}

interface DetailedReplayReport {
  player_name: string;
  beatmap_md5: string;
  accuracy: number;
  rank: string;
  combo: number;
  max_combo: number;
  count_300: number;
  count_100: number;
  count_50: number;
  count_miss: number;
  total_score: number;
  mods: string[];
  earned_pp: number;
  choke_loss_pp: number;
  fc_pp: number;
  ur: number;
  k1_count: number;
  k2_count: number;
  k1_pct: number;
  k2_pct: number;
  hit_buckets: HitBuckets;
  diagnosis: string;
  advice: string;
}

// Handcrafted SVG Theme Icon (Sun / Moon)
const ThemeIcon: React.FC<{ theme: "dark" | "light" }> = ({ theme }) => {
  if (theme === "dark") {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f1c40f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" fill="#f97316" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
};

// Ultra-fast, GPU-safe responsive SVG Chart
const PerformanceChart: React.FC<{ scores: ScoreCardData[] }> = ({ scores }) => {
  const displayScores = useMemo(() => scores.slice(0, 30).reverse(), [scores]);
  const count = displayScores.length;

  const w = 700;
  const h = 130;
  const padL = 36;
  const padR = 36;
  const padT = 14;
  const padB = 18;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  let accPath = "";
  const accPoints: { x: number; y: number }[] = [];

  let urPath = "";
  const urPoints: { x: number; y: number }[] = [];

  if (count > 0) {
    displayScores.forEach((s, i) => {
      const x = padL + (i / Math.max(1, count - 1)) * chartW;

      const accNorm = (s.accuracy - 40) / 60;
      const accY = padT + (1 - Math.max(0, Math.min(1, accNorm))) * chartH;
      accPoints.push({ x, y: accY });
      accPath += i === 0 ? `M ${x} ${accY}` : ` L ${x} ${accY}`;

      const urNorm = (s.ur - 50) / 350;
      const urY = padT + (1 - Math.max(0, Math.min(1, urNorm))) * chartH;
      urPoints.push({ x, y: urY });
      urPath += i === 0 ? `M ${x} ${urY}` : ` L ${x} ${urY}`;
    });
  }

  const accLevels = [100, 85, 70, 55, 40];
  const urLevels = [400, 312, 225, 137, 50];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "130px", display: "block" }}>
      {accLevels.map((acc, i) => {
        const y = padT + (i / (accLevels.length - 1)) * chartH;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(128, 140, 160, 0.2)" strokeWidth="1" />
            <text x={padL - 6} y={y + 3} fill="currentColor" opacity="0.6" fontSize="9" textAnchor="end" fontFamily="'Exo 2', sans-serif">
              {acc}
            </text>
            <text x={w - padR + 6} y={y + 3} fill="currentColor" opacity="0.6" fontSize="9" textAnchor="start" fontFamily="'Exo 2', sans-serif">
              {urLevels[i]}
            </text>
          </g>
        );
      })}

      {urPath && <path d={urPath} fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="4 4" />}
      {urPoints.map((p, i) => (
        <rect key={i} x={p.x - 2.5} y={p.y - 2.5} width="5" height="5" fill="#f97316" />
      ))}

      {accPath && <path d={accPath} fill="none" stroke="#38bdf8" strokeWidth="2.2" />}
      {accPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#38bdf8" stroke="var(--bg-primary)" strokeWidth="1.2" />
      ))}
    </svg>
  );
};

export const App: React.FC = () => {
  // Theme state: dark / light
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Splash & Startup Loading Animation State
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [splashStatus, setSplashStatus] = useState("Инициализация ядра...");

  // User Profile
  const [currentUser, setCurrentUser] = useState<DetectedUser>({
    username: "",
    user_id: "",
    client_type: "osu!",
    avatar_url: "",
    is_creator: false,
  });
  const [inspectedUser, setInspectedUser] = useState<string | null>(null);

  // Scores state: Start Live Session clean
  const [scores, setScores] = useState<ScoreCardData[]>([]);
  const [liveSessionScores, setLiveSessionScores] = useState<ScoreCardData[]>([]);
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const [selectedAttemptIndices, setSelectedAttemptIndices] = useState<{ [groupKey: string]: number }>({});

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<"ALL" | "SS/S" | "A/B" | "FAIL">("ALL");
  const [modFilter, setModFilter] = useState<"ALL" | "NM" | "DT" | "HR" | "HD">("ALL");
  const [sortBy, setSortBy] = useState<"date" | "pp" | "choke" | "sr" | "acc">("date");

  // Replay Drag and Drop Analyzer State
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [replayModalOpen, setReplayModalOpen] = useState(false);
  const [replayReport, setReplayReport] = useState<DetailedReplayReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seen scores tracking for live interception
  const seenScoreIdsRef = useRef<Set<string | number>>(new Set());
  const initialSeededRef = useRef<boolean>(false);

  // Views & Modals state
  const [sessionsViewOpen, setSessionsViewOpen] = useState(false);
  const [sessionsList, setSessionsList] = useState<SessionSummary[]>([]);
  const [activeSessionKey, setActiveSessionKey] = useState<string>("live");
  const activeSessionKeyRef = useRef(activeSessionKey);
  activeSessionKeyRef.current = activeSessionKey;

  const [bottlenecksModalOpen, setBottlenecksModalOpen] = useState(false);
  const [bottleneckData, setBottleneckData] = useState<BottleneckData | null>(null);

  const [workoutModalOpen, setWorkoutModalOpen] = useState(false);
  const [workoutData, setWorkoutData] = useState<{
    warmup: WorkoutItem[];
    drills: WorkoutItem[];
    stamina: WorkoutItem[];
  } | null>(null);

  const [peersDrawerOpen, setPeersDrawerOpen] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState("");

  // REAL P2P Mesh network state
  const [p2pPeers, setP2pPeers] = useState<P2PPeer[]>([]);

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profileInputName, setProfileInputName] = useState("");
  const [adminAlert, setAdminAlert] = useState<{ author: string; text: string; alertType: string } | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur));
    }, 4000);
  };

  const handleOpenLink = (url: string) => {
    openUrl(url).catch(() => {
      try {
        window.open(url, "_blank");
      } catch (e) {}
    });
  };

  // Switch and persist theme
  const toggleTheme = async () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    try {
      await invoke("save_preferences_cmd", {
        prefs: {
          theme: nextTheme,
          resolution_idx: 0,
          card_alpha: 0.9,
          favorite_users: [currentUser.username],
        },
      });
    } catch (e) {}
  };

  // Drag and drop replay handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith(".osr")) {
        analyzeReplayFile(file);
      } else {
        showToast("Пожалуйста, перетащите файл с расширением .osr");
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      analyzeReplayFile(file);
    }
  };

  const analyzeReplayFile = async (file: File) => {
    showToast("Анализ реплея .osr...");
    try {
      const buffer = await file.arrayBuffer();
      const bytes = Array.from(new Uint8Array(buffer));
      const report: DetailedReplayReport = await invoke("analyze_osr_bytes_detailed_cmd", { bytes });
      if (report) {
        setReplayReport(report);
        setReplayModalOpen(true);
      }
    } catch (e: any) {
      showToast(`Ошибка разбора реплея: ${e}`);
    }
  };

  // Convert raw API / Database score to typed UI card data
  const mapRawScoreToCardData = (s: any, idx: number): ScoreCardData => {
    const bmap = s.beatmap || {};
    const bset = s.beatmapset || bmap.beatmapset || {};

    const rawAcc = s.accuracy !== undefined ? (s.accuracy > 1.0 ? s.accuracy : s.accuracy * 100) : 98.4;
    const acc = parseFloat(rawAcc.toFixed(2));

    const stats = s.statistics || {};
    const count300 = stats.great !== undefined ? stats.great : s.count300 || 0;
    const count100 = stats.ok !== undefined ? stats.ok : s.count100 || 0;
    const count50 = stats.meh !== undefined ? stats.meh : s.count50 || 0;
    const countMiss = stats.miss !== undefined ? stats.miss : (s.countmiss !== undefined ? s.countmiss : (s.countMiss || 0));
    const totalObjs = (count300 + count100 + count50 + countMiss) || (bmap.count_circles + bmap.count_sliders + bmap.count_spinners) || 400;

    let rank: "SS" | "S" | "A" | "B" | "C" | "D" | "F" = "A";
    if (s.rank) {
      const r = s.rank.toUpperCase();
      if (["SS", "SSH", "X", "XH"].includes(r)) rank = "SS";
      else if (["S", "SH"].includes(r)) rank = "S";
      else if (r === "A") rank = "A";
      else if (r === "B") rank = "B";
      else if (r === "C") rank = "C";
      else if (r === "D") rank = "D";
      else if (r === "F") rank = "F";
    } else if (countMiss === 0 && acc >= 99.5) rank = "SS";
    else if (countMiss === 0 && acc >= 95.0) rank = "S";
    else if (countMiss <= 2) rank = "A";
    else if (countMiss <= 6) rank = "B";
    else rank = "F";

    const passed = s.passed !== undefined ? s.passed : rank !== "F";
    let mods: string[] = ["NM"];
    if (Array.isArray(s.mods) && s.mods.length > 0) {
      mods = s.mods.map((m: any) => typeof m === "string" ? m : (m.acronym || "NM"));
    } else if (s.enabled_mods) {
      mods = [s.enabled_mods];
    }

    const sr = parseFloat((bmap.difficulty_rating || s.sr || 5.6).toFixed(2));
    const bpm = Math.round(bmap.bpm || s.bpm || 180);
    const ar = parseFloat((bmap.ar || s.ar || 9.2).toFixed(1));
    const od = parseFloat((bmap.od || s.od || 8.5).toFixed(1));
    const cs = parseFloat((bmap.cs || s.cs || 4.0).toFixed(1));
    const csPx = parseFloat((54.4 - 4.48 * cs).toFixed(1));
    const hp = parseFloat((bmap.hp || s.hp || 5.0).toFixed(1));

    const maxCombo = bmap.max_combo || s.maxCombo || (countMiss === 0 ? 550 : countMiss * 120 + 300);
    const combo = s.maxcombo || s.combo || s.max_combo || (countMiss === 0 ? maxCombo : Math.round(maxCombo * 0.45));
    const comboRatio = maxCombo > 0 ? Math.min(1.0, combo / maxCombo) : 0.5;

    // REALISTIC EARNED PP CALCULATION:
    let pp = 0;
    let fcPp = 0;
    let chokePp = 0;

    if (!passed || rank === "F") {
      pp = 0;
      const rawFullPp = Math.round(Math.pow(sr, 2.6) * Math.pow(acc / 100, 3.2) * 8.8);
      fcPp = rawFullPp;
      chokePp = rawFullPp;
    } else if (s.pp !== undefined && s.pp !== null && Number(s.pp) > 0) {
      pp = Math.round(Number(s.pp));
      const missLoss = countMiss * 18 + count100 * 1.5;
      chokePp = countMiss > 0 ? Math.round(pp * (1.0 - comboRatio) * 1.2 + missLoss) : Math.round(count100 * 1.4);
      fcPp = pp + chokePp;
    } else {
      const rawFullPp = Math.round(Math.pow(sr, 2.6) * Math.pow(acc / 100, 3.2) * 8.8);
      fcPp = rawFullPp;
      if (countMiss === 0) {
        pp = Math.round(rawFullPp * Math.pow(comboRatio, 0.7));
        chokePp = rawFullPp - pp;
      } else {
        const missPenalty = Math.pow(0.97, countMiss);
        const comboPenalty = Math.pow(comboRatio, 0.85);
        pp = Math.max(0, Math.round(rawFullPp * comboPenalty * missPenalty));
        chokePp = Math.max(0, rawFullPp - pp);
      }
    }

    const aimPp = Math.round(pp * 0.54);
    const speedPp = Math.round(pp * 0.32);
    const accPp = Math.round(pp * 0.14);

    const ur = s.ur || parseFloat((80 + (100 - acc) * 4.5 + countMiss * 6).toFixed(1));

    const drainSec = bmap.hit_length || bmap.total_length || 135;
    const drainM = Math.floor(drainSec / 60);
    const drainS = drainSec % 60;
    const drainTime = `${drainM}:${drainS < 10 ? "0" : ""}${drainS}`;

    // Deep coaching diagnosis and failure root cause analysis
    let rootCause = "";
    let coachingDetails = "";
    let specificDrills: string[] = [];
    const chokeSection = countMiss > 0 ? `Секция ${Math.round((combo / Math.max(1, maxCombo)) * 100)}% (${combo}x)` : "Полный FC (100%)";
    const tapBias = count100 > (count300 * 0.08) ? (bpm >= 200 ? 5.8 : 3.4) : (bpm >= 200 ? -4.2 : -1.2);

    if (!passed || rank === "F") {
      rootCause = `Провал карты (Fail) на ${chokeSection}. Плотность нот превысила комфортный лимит реакции.`;
      coachingDetails = `Слишком резкий переход к высокой плотности паттернов. На ${bpm} BPM рука зажалась (Hand Tension) и сбился ритмический счет тапов.`;
      specificDrills = [
        `1. Включите мод NoFail (NF) и пройдите карту целиком для адаптации зрения к AR ${ar}.`,
        `2. Тренируйте чтение на картах темпа ${Math.max(120, bpm - 20)} BPM без спешки.`,
        `3. Следите за расслаблением кисти на длинных связках.`,
      ];
    } else if (countMiss > 0) {
      if (bpm >= 200 && cs >= 4.0) {
        rootCause = `Срыв комбо на ноте #${combo} (${chokeSection}) из-за перелета/недолета (Aim Drift) на быстром прыжке.`;
        coachingDetails = `При темпе ${bpm} BPM курсор сорвался с траектории круга CS ${csPx}px на ${tapBias > 0 ? "позднем" : "раннем"} клике. Потеряно ~${chokePp} PP на срыве.`;
        specificDrills = [
          `1. Увеличьте фокус на доводке курсора точно до центра ноты перед тапом.`,
          `2. Отработайте jump-паттерны на скорости ${bpm - 10}..${bpm} BPM в тренировочном паке.`,
          `3. Снизьте чувствительность / расширьте рабочую область на +3мм для стабильности на CS ${cs}.`,
        ];
      } else if (count100 > 15 && bpm >= 180) {
        rootCause = `Срыв комбо на ноте #${combo} (${chokeSection}) из-за Finger Lock на стрим-секции.`;
        coachingDetails = `Нестабильность между пальцами K1/K2 привела к накоплению ранних 100-ок и выпадению из тайминг-окна (UR: ${ur}).`;
        specificDrills = [
          `1. Тренируйте ровный счет двойных и четверных берстов на ${bpm} BPM.`,
          `2. Включите акцентированный хитсаунд клика для слуховой калибровки офсета (${tapBias > 0 ? `сдвиг +${tapBias}ms` : `сдвиг ${tapBias}ms`}).`,
          `3. Играйте длинные стрим-маппинги темпа ${bpm - 15} BPM для укрепления стамины.`,
        ];
      } else {
        rootCause = `Срыв комбо на ноте #${combo} (${chokeSection}) из-за потери концентрации на слайдере/снапе.`;
        coachingDetails = `Механическая ошибка чтения AR ${ar}. Основной потенциал карты — ${fcPp} PP (потеряно -${chokePp} PP на срыве).`;
        specificDrills = [
          `1. Отработайте проблемный паттерн с секции ${Math.max(10, Math.round((combo / maxCombo) * 100) - 10)}% до ${Math.min(100, Math.round((combo / maxCombo) * 100) + 10)}%.`,
          `2. Тренируйте стабильное удержание комбо 500+ на картах схожего темпа (${bpm} BPM).`,
          `3. Сохраняйте плавность дыхания на сложных переходах.`,
        ];
      }
    } else if (count100 > 5) {
      rootCause = `Чистый FC без миссов, но есть потеря аккуратности (${count100}x 100).`;
      coachingDetails = `Все ноты зааимлены чисто, но тайминг смещен на ${tapBias > 0 ? `+${tapBias}ms (Late - запаздывание)` : `${tapBias}ms (Early - спешка)`}. Недополучено ~${chokePp} PP из-за дропа акку.`;
      specificDrills = [
        `1. Настройте Local Offset в игре на ${tapBias > 0 ? `-${Math.round(tapBias)}ms` : `+${Math.abs(Math.round(tapBias))}ms`} для идеального попадания в 300.`,
        `2. Сфокусируйтесь на тактильном отклике клавиш под синглтап/альтернейт.`,
        `3. Тренируйте карты с высоким OD (${od}+) для кристальной аккуратности 99%+.`,
      ];
    } else {
      rootCause = `Идеальное исполнение (SS / Высокий S)! Полный контроль ритма и аима.`;
      coachingDetails = `Получено максимально возможные ${pp} PP. Все паттерны CS ${cs}, AR ${ar} пройдены на предельной точности.`;
      specificDrills = [
        `1. Поздравляем с безупречным раном! Карту можно закрывать в актив.`,
        `2. Подключайте моды HD или HR для увеличения заработка PP до ~${Math.round(pp * 1.35)} PP.`,
        `3. Переходите к следующей карте с SR ★ ${(sr + 0.3).toFixed(2)}.`,
      ];
    }

    return {
      id: s.id || `score_${idx}_${Date.now()}`,
      title: bset.title || bmap.title || "Unknown Title",
      artist: bset.artist || bmap.artist || "Unknown Artist",
      creator: bset.creator || bmap.creator || "Mapper",
      diffName: bmap.version || s.version || "Normal",
      beatmapId: bmap.id || s.beatmap_id || 0,
      beatmapsetId: bset.id || bmap.beatmapset_id || s.beatmapset_id || 0,
      sr,
      bpm,
      ar,
      arMs: Math.round(ar < 5 ? 1800 - 120 * ar : 1200 - 150 * (ar - 5)),
      od,
      odMs: Math.round(80 - 6 * od),
      cs,
      csPx,
      hp,
      drainTime,
      totalTime: drainTime,
      totalObjects: totalObjs || 500,
      countCircles: Math.round((totalObjs || 500) * 0.72),
      countSliders: Math.round((totalObjs || 500) * 0.26),
      countSpinners: Math.max(1, Math.round((totalObjs || 500) * 0.02)),
      rank,
      passed,
      mods: mods.length > 0 ? mods : ["NM"],
      pp,
      fcPp,
      chokePp,
      aimPp,
      speedPp,
      accPp,
      flPp: 0,
      accuracy: acc,
      combo,
      maxCombo,
      count300,
      count100,
      count50,
      countMiss,
      sliderTailDrops: 0,
      ur,
      rankedStatus: bmap.status || "Ranked",
      errorAnalysis: rootCause,
      coachingAdvice: coachingDetails,
      chokeZone: chokeSection,
      tapBiasMs: tapBias,
      stepByStepPlan: specificDrills,
      skillGaps: {
        aim: Math.round(Math.min(98, 50 + (accPp > 0 ? acc * 0.45 : 30))),
        fingerControl: Math.round(Math.max(30, 95 - count100 * 2.5)),
        speed: Math.round(Math.min(98, (bpm / 240) * 85)),
        stamina: Math.round(Math.max(25, 90 - countMiss * 8)),
        reading: Math.round(Math.min(99, (ar / 10.3) * 90)),
        timing: Math.round(Math.max(20, 100 - (ur - 60) * 0.4)),
      },
    };
  };

  // Initial Startup Lifecycle
  useEffect(() => {
    const initApp = async () => {
      try {
        setSplashStatus("Загрузка настроек пользователя...");
        const prefs: any = await invoke("get_preferences_cmd");
        if (prefs && prefs.theme) {
          setTheme(prefs.theme);
          document.documentElement.setAttribute("data-theme", prefs.theme);
        }

        setSplashStatus("Определение активного профиля osu!...");
        const user: DetectedUser = await invoke("detect_osu_user_cmd");
        let effectiveUser = user || {
          username: "Player",
          user_id: "Player",
          client_type: "osu!",
          avatar_url: "",
          is_creator: false,
        };

        try {
          const resolved: any = await invoke("resolve_osu_user_cmd", { username: effectiveUser.username });
          if (resolved && resolved.user_id) {
            effectiveUser = {
              ...effectiveUser,
              user_id: resolved.user_id,
              avatar_url: resolved.avatar_url,
            };
          }
        } catch (e) {}

        setCurrentUser(effectiveUser);

        setSplashStatus("Синхронизация архива сессий...");
        const list: SessionSummary[] = await invoke("get_sessions_list_cmd");
        if (list) setSessionsList(list);

        // Pre-load current session plays immediately so friends and users see their live session on launch
        try {
          const initialRecent: any[] = await invoke("poll_live_scores_cmd", { userId: effectiveUser.user_id || effectiveUser.username });
          if (initialRecent && Array.isArray(initialRecent) && initialRecent.length > 0) {
            const mapped = initialRecent.map((s, idx) => mapRawScoreToCardData(s, idx));
            mapped.forEach((s) => {
              if (s.id) seenScoreIdsRef.current.add(s.id);
            });
            setLiveSessionScores(mapped);
            setScores(mapped);
            invoke("sync_live_session_cmd", { scores: mapped }).catch(() => {});
          }
        } catch (e) {}
        initialSeededRef.current = true;

        setSplashStatus("Подключение к P2P-сети...");
        await invoke("broadcast_p2p_presence_cmd", {
          userName: effectiveUser.username,
          userId: effectiveUser.user_id,
          activity: "В сети: готов к тренировкам",
        });

        setTimeout(() => {
          setIsAppLoading(false);
        }, 650);
      } catch (err) {
        setIsAppLoading(false);
      }
    };

    initApp();
  }, []);

  // Background Live Score Poller (every 3 seconds)
  useEffect(() => {
    if (inspectedUser || !currentUser.username) return;

    const interval = setInterval(async () => {
      try {
        const targetId = currentUser.user_id || currentUser.username;
        const polled: any[] = await invoke("poll_live_scores_cmd", { userId: targetId });
        if (polled && Array.isArray(polled) && polled.length > 0) {
          const freshScores: ScoreCardData[] = [];
          for (let i = 0; i < polled.length; i++) {
            const raw = polled[i];
            const sid = raw.id || `raw_${raw.beatmap_id}_${raw.created_at || i}`;
            if (!seenScoreIdsRef.current.has(sid)) {
              seenScoreIdsRef.current.add(sid);
              const mapped = mapRawScoreToCardData(raw, freshScores.length);
              freshScores.push(mapped);
            }
          }

          if (freshScores.length > 0) {
            setLiveSessionScores((prev) => {
              const next = [...freshScores, ...prev];
              invoke("sync_live_session_cmd", { scores: next }).catch(() => {});
              return next;
            });

            if (activeSessionKeyRef.current === "live") {
              setScores((prev) => [...freshScores, ...prev]);
            }

            showToast(`Новый результат: ${freshScores[0].title} (+${freshScores[0].pp} PP)`);
          }
        }
      } catch (e) {}
    }, 4000);

    return () => clearInterval(interval);
  }, [currentUser, inspectedUser]);

  const p2pMeshRef = useRef<P2PMeshClient | null>(null);
  const peerSessionScoresMapRef = useRef<Map<string, ScoreCardData[]>>(new Map());
  const inspectedUserRef = useRef<string | null>(null);
  inspectedUserRef.current = inspectedUser;

  // Broadcast our own session scores whenever they change
  useEffect(() => {
    if (p2pMeshRef.current && liveSessionScores.length > 0) {
      p2pMeshRef.current.setSessionScores(liveSessionScores);
      p2pMeshRef.current.broadcastSessionScores(liveSessionScores);
    }
  }, [liveSessionScores]);

  // Godot-identical MQTT WebSocket Mesh & Local Discovery
  useEffect(() => {
    p2pMeshRef.current = new P2PMeshClient(
      (updatedPeers) => {
        setP2pPeers((prev) => {
          const map = new Map<string, P2PPeer>();
          prev.forEach((p) => map.set(p.user_id, p));
          updatedPeers.forEach((p) => {
            map.set(p.user_id, p);
            if (p.user_name && (!p.user_id || !/^\d+$/.test(p.user_id))) {
              invoke("resolve_osu_user_cmd", { username: p.user_name })
                .then((res: any) => {
                  if (res && res.user_id && /^\d+$/.test(res.user_id)) {
                    p.user_id = res.user_id;
                    p.avatar_url = res.avatar_url;
                    setP2pPeers((curr) => [...curr]);
                  }
                })
                .catch(() => {});
            }
          });
          return Array.from(map.values());
        });
      },
      (author, text, alertType) => {
        setAdminAlert({ author, text, alertType });
        setTimeout(() => setAdminAlert(null), 12000);
      },
      (peerId, peerName, rawPeerScores) => {
        if (rawPeerScores && Array.isArray(rawPeerScores)) {
          const mapped = rawPeerScores.map((s, idx) => mapRawScoreToCardData(s, idx));
          peerSessionScoresMapRef.current.set(peerId, mapped);
          peerSessionScoresMapRef.current.set(peerName.toLowerCase(), mapped);
          if (
            inspectedUserRef.current &&
            (inspectedUserRef.current.toLowerCase() === peerName.toLowerCase() ||
              inspectedUserRef.current === peerId)
          ) {
            setScores(mapped);
            showToast(`P2P Сессия игрока ${peerName} синхронизирована (${mapped.length} карт)`);
          }
        }
      }
    );

    const localP2pPoll = setInterval(async () => {
      try {
        if (p2pMeshRef.current && currentUser.user_id) {
          p2pMeshRef.current.setUser(currentUser.username, currentUser.user_id, currentUser.client_type);
          if (liveSessionScores.length > 0) {
            p2pMeshRef.current.setSessionScores(liveSessionScores);
          }
        }
        const rustPeers: P2PPeer[] = await invoke("get_p2p_peers_cmd");
        if (rustPeers && Array.isArray(rustPeers) && rustPeers.length > 0) {
          setP2pPeers((prev) => {
            const map = new Map<string, P2PPeer>();
            prev.forEach((p) => map.set(p.user_id, p));
            rustPeers.forEach((p) => map.set(p.user_id, p));
            return Array.from(map.values());
          });
        }
      } catch (e) {}
    }, 1000);

    return () => {
      clearInterval(localP2pPoll);
    };
  }, [currentUser, liveSessionScores]);



  // Filter and Sort scores
  const filteredScores = useMemo(() => {
    let list = scores;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.creator.toLowerCase().includes(q) ||
          s.diffName.toLowerCase().includes(q)
      );
    }

    // Grade filter
    if (gradeFilter === "SS/S") {
      list = list.filter((s) => s.rank === "SS" || s.rank === "S");
    } else if (gradeFilter === "A/B") {
      list = list.filter((s) => s.rank === "A" || s.rank === "B");
    } else if (gradeFilter === "FAIL") {
      list = list.filter((s) => s.rank === "F" || !s.passed);
    }

    // Mod filter
    if (modFilter !== "ALL") {
      list = list.filter((s) => s.mods.includes(modFilter) || (modFilter === "NM" && s.mods.includes("NM")));
    }

    // Sorting
    const sorted = [...list];
    if (sortBy === "pp") {
      sorted.sort((a, b) => b.pp - a.pp);
    } else if (sortBy === "choke") {
      sorted.sort((a, b) => b.chokePp - a.chokePp);
    } else if (sortBy === "sr") {
      sorted.sort((a, b) => b.sr - a.sr);
    } else if (sortBy === "acc") {
      sorted.sort((a, b) => b.accuracy - a.accuracy);
    }

    return sorted;
  }, [scores, searchQuery, gradeFilter, modFilter, sortBy]);

  // Group filtered scores by unique beatmap
  const groupedCards: GroupedBeatmapCard[] = useMemo(() => {
    const map = new Map<string, GroupedBeatmapCard>();

    filteredScores.forEach((s) => {
      const key = `${s.beatmapId || s.title}_${s.diffName}`;
      if (!map.has(key)) {
        map.set(key, {
          groupKey: key,
          title: s.title,
          artist: s.artist,
          creator: s.creator,
          diffName: s.diffName,
          beatmapId: s.beatmapId,
          beatmapsetId: s.beatmapsetId,
          attempts: [s],
        });
      } else {
        map.get(key)!.attempts.push(s);
      }
    });

    return Array.from(map.values());
  }, [filteredScores]);

  // Session archive view actions
  const handleOpenSessionsView = async () => {
    try {
      const list: SessionSummary[] = await invoke("get_sessions_list_cmd");
      if (list) setSessionsList(list);
      setSessionsViewOpen(true);
    } catch (e) {}
  };

  const handleSelectSession = async (key: string) => {
    setActiveSessionKey(key);
    activeSessionKeyRef.current = key;
    setInspectedUser(null);

    if (key === "live") {
      setScores(liveSessionScores);
      setSessionsViewOpen(false);
      return;
    }

    try {
      const rawScores: any[] = await invoke("load_session_scores_cmd", { key });
      if (rawScores && Array.isArray(rawScores)) {
        const loaded = rawScores.map((s, idx) => mapRawScoreToCardData(s, idx));
        setScores(loaded);
      }
    } catch (e) {}
    setSessionsViewOpen(false);
  };

  const handleDeleteSession = async (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke("delete_session_cmd", { key });
      const list: SessionSummary[] = await invoke("get_sessions_list_cmd");
      if (list) setSessionsList(list);
      showToast("Сессия удалена");
    } catch (e) {}
  };

  const handleMergeDaily = async () => {
    try {
      const count: number = await invoke("merge_daily_sessions_cmd");
      const list: SessionSummary[] = await invoke("get_sessions_list_cmd");
      if (list) setSessionsList(list);
      showToast(`Сессии за день объединены (${count} карт)`);
    } catch (e) {}
  };

  const handleClearAllSessions = async () => {
    try {
      await invoke("clear_all_sessions_cmd");
      const list: SessionSummary[] = await invoke("get_sessions_list_cmd");
      if (list) setSessionsList(list);
      showToast("Архив сессий очищен");
    } catch (e) {}
  };

  // Inspect P2P peer scores (Live Session Sync + Godot-identical recent plays)
  const handleInspectUser = async (targetUsername: string) => {
    setInspectedUser(targetUsername);
    inspectedUserRef.current = targetUsername;
    setPeersDrawerOpen(false);

    // 1. Check local P2P session cache first
    const cached = peerSessionScoresMapRef.current.get(targetUsername.toLowerCase());
    if (cached && cached.length > 0) {
      setScores(cached);
      showToast(`P2P Сессия игрока ${targetUsername} (${cached.length} карт)`);
    } else {
      setScores([]);
      showToast(`Запрос текущей сессии игрока ${targetUsername}...`);
    }

    // 2. Broadcast direct P2P session score request
    if (p2pMeshRef.current) {
      const peer = p2pPeers.find((p) => p.user_name.toLowerCase() === targetUsername.toLowerCase());
      p2pMeshRef.current.requestPeerScores(peer ? peer.user_id : "", targetUsername);
    }

    // 3. Parallel fetch of recent session plays (identical to Godot fetch_recent_scores)
    try {
      const recentScores: any[] = await invoke("fetch_online_scores_cmd", { username: targetUsername });
      if (recentScores && recentScores.length > 0 && inspectedUserRef.current === targetUsername) {
        const loaded = recentScores.map((s, idx) => mapRawScoreToCardData(s, idx));
        setScores((prev) => {
          if (prev.length > 0) {
            const map = new Map<string, ScoreCardData>();
            prev.forEach((s) => map.set(String(s.id), s));
            loaded.forEach((s) => map.set(String(s.id), s));
            return Array.from(map.values());
          }
          return loaded;
        });
        showToast(`Загружены карты сессии игрока ${targetUsername} (${loaded.length})`);
      }
    } catch (e) {}
  };

  const handleReturnToMyProfile = () => {
    setInspectedUser(null);
    setScores(activeSessionKey === "live" ? liveSessionScores : scores);
  };

  const handleSaveCustomProfile = async () => {
    const clean = profileInputName.trim();
    if (!clean) return;
    setEditProfileOpen(false);
    showToast(`Поиск профиля ${clean}...`);
    try {
      const res: any = await invoke("resolve_osu_user_cmd", { username: clean });
      const newUserId = res?.user_id || clean;
      const newAvatar = res?.avatar_url || `https://a.ppy.sh/${newUserId}`;
      const newUser: DetectedUser = {
        username: res?.username || clean,
        user_id: newUserId,
        client_type: "osu!",
        avatar_url: newAvatar,
        is_creator: false,
      };
      setCurrentUser(newUser);
      if (p2pMeshRef.current) {
        p2pMeshRef.current.setUser(newUser.username, newUser.user_id, newUser.client_type);
      }
      // Save custom username in preferences
      invoke("save_preferences_cmd", {
        prefs: {
          theme,
          custom_username: newUser.username,
        },
      }).catch(() => {});

      // Fetch fresh session plays
      const initialRecent: any[] = await invoke("poll_live_scores_cmd", { userId: newUser.user_id || newUser.username });
      if (initialRecent && Array.isArray(initialRecent) && initialRecent.length > 0) {
        const mapped = initialRecent.map((s, idx) => mapRawScoreToCardData(s, idx));
        seenScoreIdsRef.current.clear();
        mapped.forEach((s) => seenScoreIdsRef.current.add(s.id));
        setLiveSessionScores(mapped);
        setScores(mapped);
        invoke("sync_live_session_cmd", { scores: mapped }).catch(() => {});
      }
      showToast(`Профиль переключен на ${newUser.username}`);
    } catch (e: any) {
      showToast(`Ошибка: ${e}`);
    }
  };

  // Bottlenecks Analysis
  const handleOpenBottlenecks = () => {
    setBottlenecksModalOpen(true);
    invoke("analyze_bottlenecks_cmd", {
      scores: scores.map((s) => ({
        bpm: s.bpm,
        accuracy: s.accuracy / 100,
        difficulty_rating: s.sr,
        miss: s.countMiss,
      })),
    })
      .then((report: any) => {
        if (report) setBottleneckData(report);
      })
      .catch(() => {});
  };

  // Workout Generator & Collection Exporters
  const handleOpenWorkout = async () => {
    setWorkoutModalOpen(true);
    const realAvgSr = scores.length > 0 ? scores.reduce((a, b) => a + b.sr, 0) / scores.length : 5.5;
    try {
      const wk: any = await invoke("generate_workout_cmd", {
        avgSr: realAvgSr,
        speedWall: bottleneckData?.speed_wall_bpm || 220,
        readingWall: bottleneckData?.reading_wall_ar || 10.0,
        csWall: bottleneckData?.cs_wall || 4.2,
      });
      if (wk) setWorkoutData(wk);
    } catch (e) {}
  };

  const handleExportWorkoutOsdb = async () => {
    if (!workoutData) return;
    try {
      const allMaps = [...workoutData.warmup, ...workoutData.drills, ...workoutData.stamina];
      const savedPath: string = await invoke("export_osdb_cmd", {
        collectionName: "Daily Workout",
        maps: allMaps,
      });
      showToast(`Коллекция .osdb сохранена: ${savedPath}`);
    } catch (e: any) {
      showToast(`Ошибка экспорта .osdb: ${e}`);
    }
  };

  const handleExportWorkoutCollectionDb = async () => {
    if (!workoutData) return;
    try {
      const allMaps = [...workoutData.warmup, ...workoutData.drills, ...workoutData.stamina];
      const savedPath: string = await invoke("export_collection_db_cmd", {
        collectionName: "Daily Workout",
        maps: allMaps,
      });
      showToast(`Файл collection.db сохранен: ${savedPath}`);
    } catch (e: any) {
      showToast(`Ошибка экспорта collection.db: ${e}`);
    }
  };

  const avgAcc = scores.length > 0 ? (scores.reduce((a, b) => a + b.accuracy, 0) / scores.length).toFixed(1) : "0.0";
  const avgUr = scores.length > 0 ? (scores.reduce((a, b) => a + b.ur, 0) / scores.length).toFixed(1) : "0.0";
  const avgSr = scores.length > 0 ? (scores.reduce((a, b) => a + b.sr, 0) / scores.length).toFixed(1) : "0.0";

  return (
    <>
      {/* Hidden file input for .osr replay analysis */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".osr"
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="drag-drop-overlay">
          <div className="drag-drop-box">
            <div className="drag-drop-title">Отпустите .osr файл для анализа</div>
            <div className="drag-drop-sub">Покадровый разбор тапов, UR и баланса пальцев K1/K2</div>
          </div>
        </div>
      )}

      {/* Animated Splash / Loading Screen on Startup */}
      <div className={`splash-screen ${!isAppLoading ? "hide" : ""}`}>
        <div className="splash-circle-emblem">
          <span className="splash-circle-text">osu!</span>
        </div>
        <div className="splash-title">Performance Helper</div>
        <div className="splash-progress-track">
          <div className="splash-progress-bar" />
        </div>
        <div className="splash-status-text">{splashStatus}</div>
      </div>

      <div
        className="app-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Toast Notification */}
        {toastMsg && (
          <div className="toast-container">
            <div className="toast-item">{toastMsg}</div>
          </div>
        )}

        {/* Admin Broadcast Notification Banner */}
        {adminAlert && (
          <div className="admin-broadcast-banner">
            <div className="admin-banner-icon">★</div>
            <div className="admin-banner-content">
              <div className="admin-banner-author">
                Оповещение от {adminAlert.author} {getUserRoleBadge(adminAlert.author) && (
                  <span className={getUserRoleBadge(adminAlert.author)!.badgeClass}>
                    {getUserRoleBadge(adminAlert.author)!.title}
                  </span>
                )}
              </div>
              <div className="admin-banner-text">{adminAlert.text}</div>
            </div>
            <button className="admin-banner-close" onClick={() => setAdminAlert(null)}>
              ✕
            </button>
          </div>
        )}

        {/* PINNED FIXED TOP SECTION */}
        <div className="fixed-top-section">
          {/* Top Navigation Bar */}
          <header className="top-nav">
            <div className="logo-title">
              <span className="logo-osu-glow">osu!</span>
              <span>Performance Helper</span>
            </div>

            <div className="nav-actions">
              {inspectedUser ? (
                <button className="pill-btn active" onClick={handleReturnToMyProfile}>
                  Назад к моей статистике
                </button>
              ) : (
                <>
                  <button className="pill-btn" onClick={handleOpenSessionsView}>
                    История сессий
                  </button>

                  <button className="pill-btn" onClick={() => fileInputRef.current?.click()} title="Загрузить .osr реплей для анализа">
                    Анализ .osr
                  </button>

                  <button className="pill-btn" onClick={handleOpenBottlenecks}>
                    Узкие места
                  </button>

                  <button className="pill-btn" onClick={handleOpenWorkout}>
                    Тренировка (.osdb)
                  </button>
                </>
              )}

              <div
                className="profile-chip"
                onClick={() => {
                  if (!inspectedUser) {
                    setProfileInputName(currentUser.username);
                    setEditProfileOpen(true);
                  }
                }}
                style={{ cursor: inspectedUser ? "default" : "pointer" }}
                title={inspectedUser ? "" : "Нажмите, чтобы сменить osu! профиль"}
              >
                <img
                  src={resolveAvatar(inspectedUser ? "" : currentUser.user_id, inspectedUser || currentUser.username)}
                  alt="Avatar"
                  className="avatar-circle"
                  onError={(e) => {
                    e.currentTarget.src = resolveAvatar("", inspectedUser || currentUser.username);
                  }}
                />
                <span className="profile-name">
                  {inspectedUser ? (
                    <>
                      {inspectedUser}
                      {getUserRoleBadge(inspectedUser) && (
                        <span className={getUserRoleBadge(inspectedUser)!.badgeClass}>
                          {getUserRoleBadge(inspectedUser)!.title}
                        </span>
                      )}
                      <span style={{ opacity: 0.7, fontSize: "10px", marginLeft: "4px" }}>(ПРОСМОТР)</span>
                    </>
                  ) : (
                    <>
                      {currentUser.username}
                      {getUserRoleBadge(currentUser.username) && (
                        <span className={getUserRoleBadge(currentUser.username)!.badgeClass}>
                          {getUserRoleBadge(currentUser.username)!.title}
                        </span>
                      )}
                    </>
                  )}
                </span>
              </div>

              <button className="pill-btn" onClick={() => setPeersDrawerOpen(true)}>
                P2P Сеть ({p2pPeers.filter((p) => p.user_id !== currentUser.user_id && p.user_name.toLowerCase() !== currentUser.username.toLowerCase()).length})
              </button>

              {/* Theme Toggle Button */}
              <button
                className="pill-btn theme-toggle-btn"
                onClick={toggleTheme}
                title={theme === "dark" ? "Переключить на светлую тему" : "Переключить на темную тему"}
              >
                <ThemeIcon theme={theme} />
              </button>
            </div>
          </header>

          {/* KPI Top 4 Cards */}
          <section className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">СЫГРАНО КАРТ</span>
              <span className="kpi-val">{scores.length}</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">ТОЧНОСТЬ (%)</span>
              <span className="kpi-val">{avgAcc}%</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">НЕСТАБИЛЬНОСТЬ</span>
              <span className="kpi-val">{avgUr}</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">СЛОЖНОСТЬ (*)</span>
              <span className="kpi-val">★ {avgSr}</span>
            </div>
          </section>

          {/* Middle Row: Charts & Skills Matrix */}
          <section className="charts-grid">
            <div className="chart-panel">
              <div className="chart-header">
                <div className="chart-legend">
                  <div className="legend-item">
                    <span className="legend-color-dot" style={{ background: "var(--osu-blue)" }} />
                    <span>Точность (%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color-dot" style={{ background: "var(--osu-orange)" }} />
                    <span>UR (Нестабильность)</span>
                  </div>
                </div>
              </div>
              <div style={{ width: "100%", height: "130px", position: "relative" }}>
                <PerformanceChart scores={scores} />
              </div>
            </div>

            <div className="chart-panel">
              <div className="skills-list">
                <div className="skill-row">
                  <span className="skill-title">Аим и микро-снапы</span>
                  <div className="skill-bar-track">
                    <div className="skill-bar-fill" style={{ width: `${scores.length > 0 ? 73 : 0}%`, background: "#3b82f6" }} />
                  </div>
                  <span className="skill-pct">{scores.length > 0 ? "73%" : "0%"}</span>
                </div>

                <div className="skill-row">
                  <span className="skill-title">Скорость и стримы</span>
                  <div className="skill-bar-track">
                    <div className="skill-bar-fill" style={{ width: `${scores.length > 0 ? 69 : 0}%`, background: "#ec4899" }} />
                  </div>
                  <span className="skill-pct">{scores.length > 0 ? "69%" : "0%"}</span>
                </div>

                <div className="skill-row">
                  <span className="skill-title">Точность и UR</span>
                  <div className="skill-bar-track">
                    <div className="skill-bar-fill" style={{ width: `${scores.length > 0 ? 84 : 0}%`, background: "#eab308" }} />
                  </div>
                  <span className="skill-pct">{scores.length > 0 ? "84%" : "0%"}</span>
                </div>

                <div className="skill-row">
                  <span className="skill-title">Ридинг и реакция</span>
                  <div className="skill-bar-track">
                    <div className="skill-bar-fill" style={{ width: `${scores.length > 0 ? 86 : 0}%`, background: "#10b981" }} />
                  </div>
                  <span className="skill-pct">{scores.length > 0 ? "86%" : "0%"}</span>
                </div>

                <div className="skill-row">
                  <span className="skill-title">Фингер-контроль</span>
                  <div className="skill-bar-track">
                    <div className="skill-bar-fill" style={{ width: `${scores.length > 0 ? 85 : 0}%`, background: "#a855f7" }} />
                  </div>
                  <span className="skill-pct">{scores.length > 0 ? "85%" : "0%"}</span>
                </div>

                <div className="skill-row">
                  <span className="skill-title">Выносливость</span>
                  <div className="skill-bar-track">
                    <div className="skill-bar-fill" style={{ width: `${scores.length > 0 ? 64 : 0}%`, background: "#f97316" }} />
                  </div>
                  <span className="skill-pct">{scores.length > 0 ? "64%" : "0%"}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Search, Filter & Sort Control Bar */}
          <div className="filter-search-toolbar">
            <div className="search-input-wrapper">
              <input
                type="text"
                className="search-input"
                placeholder="Поиск по названию карты, артисту или сложности..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
                  ✕
                </button>
              )}
            </div>

            <div className="filter-chips-group">
              <span className="filter-label">Ранг:</span>
              {(["ALL", "SS/S", "A/B", "FAIL"] as const).map((g) => (
                <button
                  key={g}
                  className={`filter-pill ${gradeFilter === g ? "active" : ""}`}
                  onClick={() => setGradeFilter(g)}
                >
                  {g === "ALL" ? "Все" : g}
                </button>
              ))}
            </div>

            <div className="filter-chips-group">
              <span className="filter-label">Моды:</span>
              {(["ALL", "NM", "DT", "HR", "HD"] as const).map((m) => (
                <button
                  key={m}
                  className={`filter-pill ${modFilter === m ? "active" : ""}`}
                  onClick={() => setModFilter(m)}
                >
                  {m === "ALL" ? "Все" : m}
                </button>
              ))}
            </div>

            <div className="sort-dropdown-wrapper">
              <span className="filter-label">Сортировка:</span>
              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="date">По дате (Новые)</option>
                <option value="pp">По PP (Макс)</option>
                <option value="choke">По потере PP (Чоки)</option>
                <option value="sr">По сложности ★</option>
                <option value="acc">По точности %</option>
              </select>
            </div>
          </div>

          {/* Pinned Feed Section Title Bar */}
          <div className="feed-header-bar">
            <h2 className="feed-header-title">
              {inspectedUser
                ? `СКОРЫ И ТЕХНИЧЕСКИЙ РАЗБОР: ${inspectedUser.toUpperCase()}`
                : activeSessionKey === "live"
                ? "ТЕКУЩАЯ LIVE-СЕССИЯ"
                : "АРХИВ СЕССИИ"}
            </h2>
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
              Найдено карт: {groupedCards.length} • Всего попыток: {filteredScores.length}
            </span>
          </div>
        </div>

        {/* INDEPENDENT SCROLLABLE SCORES FEED CONTAINER */}
        <section className="scrollable-feed-container">
          {filteredScores.length === 0 ? (
            <div className="empty-state-card">
              <span className="empty-state-title">
                {scores.length === 0
                  ? "Live-сессия ожидает сыгранных карт в osu!"
                  : "По вашему фильтру ничего не найдено"}
              </span>
              <span className="empty-state-desc">
                {inspectedUser ? (
                  <>
                    Игрок <b>{inspectedUser}</b> пока не сыграл ни одной карты в текущей сессии.<br />
                    Карты появятся здесь автоматически в реальном времени, как только игрок завершит прохождение в osu!.
                  </>
                ) : scores.length === 0 ? (
                  <>
                    Запустите и сыграйте любую карту в osu! — результат перехватится автоматически.<br />
                    Либо перейдите в <b>«История сессий»</b> для просмотра <b>Основной базы</b> и прошлых тренировок.
                  </>
                ) : (
                  "Попробуйте изменить поисковый запрос или сбросить фильтры рангов/модов."
                )}
              </span>
              <div style={{ marginTop: "10px" }}>
                {inspectedUser ? (
                  <button className="pill-btn active" onClick={handleReturnToMyProfile}>
                    Вернуться к моей сессии
                  </button>
                ) : scores.length === 0 ? (
                  <button className="pill-btn active" onClick={handleOpenSessionsView}>
                    Открыть архив и Основную базу
                  </button>
                ) : (
                  <button
                    className="pill-btn active"
                    onClick={() => {
                      setSearchQuery("");
                      setGradeFilter("ALL");
                      setModFilter("ALL");
                    }}
                  >
                    Сбросить фильтры
                  </button>
                )}
              </div>
            </div>
          ) : (
            groupedCards.map((group) => {
              const isExpanded = expandedGroupKey === group.groupKey;
              const currentAttemptIdx = selectedAttemptIndices[group.groupKey] || 0;
              const score = group.attempts[currentAttemptIdx] || group.attempts[0];

              const prevScore =
                group.attempts.length > 1 && currentAttemptIdx + 1 < group.attempts.length
                  ? group.attempts[currentAttemptIdx + 1]
                  : null;

              const accDelta = prevScore ? (score.accuracy - prevScore.accuracy).toFixed(2) : null;
              const missDelta = prevScore ? score.countMiss - prevScore.countMiss : null;
              const comboDelta = prevScore ? score.combo - prevScore.combo : null;
              const ppDelta = prevScore ? score.pp - prevScore.pp : null;
              const urDelta = prevScore ? (score.ur - prevScore.ur).toFixed(1) : null;

              return (
                <div key={group.groupKey} className="score-card">
                  {/* Collapsed View (Always visible) */}
                  <div
                    className="score-card-collapsed"
                    onClick={() => setExpandedGroupKey(isExpanded ? null : group.groupKey)}
                  >
                    <div className="card-left-col">
                      <div className="card-title-row">
                        <span className="card-title">{group.title}</span>
                        <span className="card-diff">[{group.diffName}]</span>
                      </div>
                      <div className="card-sub-row">
                        <span>{group.artist}</span>
                        <span>•</span>
                        <span>{group.creator}</span>
                      </div>
                    </div>

                    <div className="card-right-col">
                      <div className="card-metrics-row">
                        <span className="metric-chip sr">★ {score.sr}</span>
                        <span className="metric-chip bpm">{score.bpm} BPM</span>
                        <span className="metric-chip ar">AR {score.ar}</span>
                        <span className="metric-chip cs">CS {score.cs}</span>
                        <span className="metric-chip od">OD {score.od}</span>
                      </div>

                      <div className="card-score-summary">
                        {/* EARNED PP & CHOKE SUMMARY BADGES */}
                        <div className="pp-badges-container">
                          <span className="pp-earned-badge" title="Реально полученное PP за этот скор">
                            +{score.pp} PP
                          </span>
                          {score.chokePp > 0 && (
                            <span className="pp-loss-badge" title={`Потеряно: 100-ки: -${Math.round(score.count100 * 1.5)}pp, миссы: -${Math.max(0, score.chokePp - Math.round(score.count100 * 1.5))}pp`}>
                              -{score.chokePp} PP
                            </span>
                          )}
                          <span className="pp-fc-badge" title="Потенциал при Full Combo">
                            FC: {score.fcPp} PP
                          </span>
                        </div>

                        <div className="mods-wrap">
                          {score.mods.map((m, i) => (
                            <span key={i} className="mod-badge">
                              {m}
                            </span>
                          ))}
                        </div>

                        <span className={`rank-badge rank-${score.rank.toLowerCase()}`}>
                          {score.rank}
                        </span>

                        <span className="acc-badge">{score.accuracy}%</span>
                        <span className="combo-badge">{score.combo}x</span>
                        {score.countMiss > 0 && (
                          <span className="miss-badge">{score.countMiss}x miss</span>
                        )}

                        <span className="expand-indicator">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Technical View */}
                  {isExpanded && (
                    <div className="score-card-expanded">
                      {/* Attempt Switcher if multiple attempts exist */}
                      {group.attempts.length > 1 && (
                        <div className="attempt-switcher-bar">
                          <span className="attempt-label">Попытки ({group.attempts.length}):</span>
                          {group.attempts.map((att, attIdx) => (
                            <button
                              key={attIdx}
                              className={`attempt-btn ${attIdx === currentAttemptIdx ? "active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAttemptIndices({
                                  ...selectedAttemptIndices,
                                  [group.groupKey]: attIdx,
                                });
                              }}
                            >
                              #{attIdx + 1} ({att.accuracy}% • {att.rank} • +{att.pp}PP)
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Detailed PP Breakdown Banner */}
                      <div className="pp-calculation-breakdown-banner">
                        <div className="pp-calc-col">
                          <span className="pp-calc-label">ПОЛУЧЕНО ЗА КАРТУ</span>
                          <span className="pp-calc-value green">+{score.pp} PP</span>
                          <span className="pp-calc-sub">
                            Aim: +{score.aimPp} | Speed: +{score.speedPp} | Acc: +{score.accPp}
                          </span>
                        </div>

                        <div className="pp-calc-col">
                          <span className="pp-calc-label">ПОТЕРЯНО НА ОШИБКАХ</span>
                          <span className="pp-calc-value red">-{score.chokePp} PP</span>
                          <span className="pp-calc-sub">
                            {score.count100}x 100 (-{Math.round(score.count100 * 1.5)} pp) • {score.countMiss}x miss (-{Math.max(0, score.chokePp - Math.round(score.count100 * 1.5))} pp)
                          </span>
                        </div>

                        <div className="pp-calc-col">
                          <span className="pp-calc-label">FC ПОТЕНЦИАЛ</span>
                          <span className="pp-calc-value blue">{score.fcPp} PP</span>
                          <span className="pp-calc-sub">Максимум при 0 миссов</span>
                        </div>

                        <div className="pp-calc-col">
                          <span className="pp-calc-label">НЕСТАБИЛЬНОСТЬ</span>
                          <span className="pp-calc-value orange">{score.ur} UR</span>
                          <span className="pp-calc-sub">
                            {score.count300}x 300 / {score.count100}x 100 / {score.count50}x 50
                          </span>
                        </div>
                      </div>

                      {/* Delta Comparison with previous attempt */}
                      {prevScore && (
                        <div className="delta-comparison-bar">
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            Динамика относительно попытки #{currentAttemptIdx + 2}:
                          </span>
                          {accDelta && (
                            <span className={`delta-tag ${parseFloat(accDelta) >= 0 ? "pos" : "neg"}`}>
                              Точность: {parseFloat(accDelta) >= 0 ? `+${accDelta}` : accDelta}%
                            </span>
                          )}
                          {ppDelta !== null && (
                            <span className={`delta-tag ${ppDelta >= 0 ? "pos" : "neg"}`}>
                              PP: {ppDelta >= 0 ? `+${ppDelta}` : ppDelta}
                            </span>
                          )}
                          {missDelta !== null && (
                            <span className={`delta-tag ${missDelta <= 0 ? "pos" : "neg"}`}>
                              Миссы: {missDelta <= 0 ? `${missDelta}` : `+${missDelta}`}
                            </span>
                          )}
                          {comboDelta !== null && (
                            <span className={`delta-tag ${comboDelta >= 0 ? "pos" : "neg"}`}>
                              Комбо: {comboDelta >= 0 ? `+${comboDelta}` : comboDelta}x
                            </span>
                          )}
                          {urDelta && (
                            <span className={`delta-tag ${parseFloat(urDelta) <= 0 ? "pos" : "neg"}`}>
                              UR: {parseFloat(urDelta) <= 0 ? `${urDelta}` : `+${urDelta}`}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Technical Breakdown Content */}
                      <div className="expanded-content-grid">
                        <div className="expanded-box">
                          <span className="box-title">Диагностика и разбор</span>
                          <p className="box-desc">{score.errorAnalysis}</p>
                          <div className="box-metrics-row">
                            <span className="box-metric">
                              Смещение тапа: <b>{score.tapBiasMs > 0 ? `+${score.tapBiasMs}ms (Late)` : `${score.tapBiasMs}ms (Early)`}</b>
                            </span>
                            <span className="box-metric">
                              Зона срыва: <b>{score.chokeZone}</b>
                            </span>
                          </div>
                        </div>

                        <div className="expanded-box">
                          <span className="box-title">План исправления тренера</span>
                          <p className="box-desc">{score.coachingAdvice}</p>
                          <div className="plan-list">
                            {score.stepByStepPlan.map((step, sIdx) => (
                              <div key={sIdx} className="plan-item">
                                {step}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Direct & Web Link Actions */}
                      <div className="expanded-actions-bar">
                        {group.beatmapId > 0 && (
                          <>
                            <button
                              className="pill-btn mini active"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenLink(`osu://b/${group.beatmapId}`);
                              }}
                            >
                              Direct в игре
                            </button>

                            <button
                              className="pill-btn mini"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenLink(`https://osu.ppy.sh/b/${group.beatmapId}`);
                              }}
                            >
                              Страница карты
                            </button>

                            <button
                              className="pill-btn mini"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenLink(`https://catboy.best/d/${group.beatmapsetId}`);
                              }}
                            >
                              Скачать .osz
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>

        {/* MODAL: Replay Analyzer (.osr) */}
        {replayModalOpen && replayReport && (
          <div className="modal-backdrop" onClick={() => setReplayModalOpen(false)}>
            <div className="modal-dialog large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Покадровый разбор реплея: {replayReport.player_name}</h3>
                <button className="modal-close-btn" onClick={() => setReplayModalOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                {/* Top Replay KPI Summary */}
                <div className="pp-calculation-breakdown-banner">
                  <div className="pp-calc-col">
                    <span className="pp-calc-label">ПОЛУЧЕНО PP</span>
                    <span className="pp-calc-value green">+{replayReport.earned_pp} PP</span>
                    <span className="pp-calc-sub">Ранг: {replayReport.rank} • Точность: {replayReport.accuracy}%</span>
                  </div>

                  <div className="pp-calc-col">
                    <span className="pp-calc-label">ПОТЕРЯНО НА ОШИБКАХ</span>
                    <span className="pp-calc-value red">-{replayReport.choke_loss_pp} PP</span>
                    <span className="pp-calc-sub">{replayReport.count_miss}x miss • {replayReport.count_100}x 100</span>
                  </div>

                  <div className="pp-calc-col">
                    <span className="pp-calc-label">FC ПОТЕНЦИАЛ</span>
                    <span className="pp-calc-value blue">{replayReport.fc_pp} PP</span>
                    <span className="pp-calc-sub">Комбо: {replayReport.max_combo}x</span>
                  </div>

                  <div className="pp-calc-col">
                    <span className="pp-calc-label">НЕСТАБИЛЬНОСТЬ</span>
                    <span className="pp-calc-value orange">{replayReport.ur} UR</span>
                    <span className="pp-calc-sub">Моды: {replayReport.mods.join(", ")}</span>
                  </div>
                </div>

                {/* Finger Balance K1 vs K2 */}
                <div className="replay-section-card">
                  <div className="section-card-title">Баланс пальцев (K1 vs K2)</div>
                  <div className="finger-balance-row">
                    <span className="finger-label">K1 ({replayReport.k1_count} тапов): {replayReport.k1_pct}%</span>
                    <div className="finger-bar-track">
                      <div className="finger-bar-k1" style={{ width: `${replayReport.k1_pct}%` }} />
                      <div className="finger-bar-k2" style={{ width: `${replayReport.k2_pct}%` }} />
                    </div>
                    <span className="finger-label">K2 ({replayReport.k2_count} тапов): {replayReport.k2_pct}%</span>
                  </div>
                </div>

                {/* Tap Timing Offset Histogram */}
                <div className="replay-section-card">
                  <div className="section-card-title">Гистограмма смещения тапов (Early / Perfect / Late)</div>
                  <div className="histogram-grid">
                    <div className="hist-col">
                      <div className="hist-bar red" style={{ height: `${Math.min(100, replayReport.hit_buckets.early_50 * 5 + 4)}px` }} />
                      <span className="hist-count">{replayReport.hit_buckets.early_50}</span>
                      <span className="hist-name">Early 50</span>
                    </div>
                    <div className="hist-col">
                      <div className="hist-bar orange" style={{ height: `${Math.min(100, replayReport.hit_buckets.early_100 * 4 + 4)}px` }} />
                      <span className="hist-count">{replayReport.hit_buckets.early_100}</span>
                      <span className="hist-name">Early 100</span>
                    </div>
                    <div className="hist-col">
                      <div className="hist-bar blue" style={{ height: `${Math.min(100, replayReport.hit_buckets.early_300 * 2 + 4)}px` }} />
                      <span className="hist-count">{replayReport.hit_buckets.early_300}</span>
                      <span className="hist-name">Early 300</span>
                    </div>
                    <div className="hist-col">
                      <div className="hist-bar green" style={{ height: `${Math.min(100, replayReport.hit_buckets.perfect * 1.5 + 4)}px` }} />
                      <span className="hist-count">{replayReport.hit_buckets.perfect}</span>
                      <span className="hist-name">Perfect 300</span>
                    </div>
                    <div className="hist-col">
                      <div className="hist-bar blue" style={{ height: `${Math.min(100, replayReport.hit_buckets.late_300 * 2 + 4)}px` }} />
                      <span className="hist-count">{replayReport.hit_buckets.late_300}</span>
                      <span className="hist-name">Late 300</span>
                    </div>
                    <div className="hist-col">
                      <div className="hist-bar orange" style={{ height: `${Math.min(100, replayReport.hit_buckets.late_100 * 4 + 4)}px` }} />
                      <span className="hist-count">{replayReport.hit_buckets.late_100}</span>
                      <span className="hist-name">Late 100</span>
                    </div>
                    <div className="hist-col">
                      <div className="hist-bar red" style={{ height: `${Math.min(100, replayReport.hit_buckets.late_50 * 5 + 4)}px` }} />
                      <span className="hist-count">{replayReport.hit_buckets.late_50}</span>
                      <span className="hist-name">Late 50</span>
                    </div>
                  </div>
                </div>

                {/* AI Coach Verdict */}
                <div className="expanded-content-grid" style={{ marginTop: "12px" }}>
                  <div className="expanded-box">
                    <span className="box-title">Диагностика реплея</span>
                    <p className="box-desc">{replayReport.diagnosis}</p>
                  </div>
                  <div className="expanded-box">
                    <span className="box-title">Рекомендации тренера</span>
                    <p className="box-desc">{replayReport.advice}</p>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="pill-btn" onClick={() => fileInputRef.current?.click()}>
                  Загрузить другой .osr
                </button>
                <button className="pill-btn active" onClick={() => setReplayModalOpen(false)}>
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Sessions History & Archive */}
        {sessionsViewOpen && (
          <div className="modal-backdrop" onClick={() => setSessionsViewOpen(false)}>
            <div className="modal-dialog large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">История сессий и База тренировок</h3>
                <button className="modal-close-btn" onClick={() => setSessionsViewOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="session-history-actions">
                  <button className="pill-btn mini" onClick={handleMergeDaily}>
                    Объединить сессии за сегодня
                  </button>
                  <button className="pill-btn mini danger" onClick={handleClearAllSessions}>
                    Очистить архив
                  </button>
                </div>

                <div className="sessions-list-grid">
                  {/* Live session card */}
                  <div
                    className={`session-card-item ${activeSessionKey === "live" ? "active" : ""}`}
                    onClick={() => handleSelectSession("live")}
                  >
                    <div className="session-card-title-row">
                      <span className="session-tag live">LIVE</span>
                      <span className="session-title">Текущая активная сессия</span>
                    </div>
                    <div className="session-sub-row">
                      <span>Сыграно карт: {liveSessionScores.length}</span>
                    </div>
                  </div>

                  {/* Saved Sessions */}
                  {sessionsList.map((s) => (
                    <div
                      key={s.key}
                      className={`session-card-item ${activeSessionKey === s.key ? "active" : ""}`}
                      onClick={() => handleSelectSession(s.key)}
                    >
                      <div className="session-card-title-row">
                        {s.is_main_db ? (
                          <span className="session-tag main">ОСНОВНАЯ БАЗА</span>
                        ) : (
                          <span className="session-tag archive">АРХИВ</span>
                        )}
                        <span className="session-title">{s.title}</span>
                      </div>
                      <div className="session-sub-row">
                        <span>Карт: {s.scores_count}</span>
                        <span>•</span>
                        <span>Точность: {s.avg_acc.toFixed(1)}%</span>
                        {!s.is_main_db && (
                          <button
                            className="delete-session-btn"
                            onClick={(e) => handleDeleteSession(s.key, e)}
                            title="Удалить сессию"
                          >
                            Удалить
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button className="pill-btn active" onClick={() => setSessionsViewOpen(false)}>
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Bottlenecks (Узкие места) */}
        {bottlenecksModalOpen && bottleneckData && (
          <div className="modal-backdrop" onClick={() => setBottlenecksModalOpen(false)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Анализ узких мест (Bottlenecks)</h3>
                <button className="modal-close-btn" onClick={() => setBottlenecksModalOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="kpi-grid modal-kpi">
                  <div className="kpi-card">
                    <span className="kpi-label">БАРЬЕР СКОРОСТИ</span>
                    <span className="kpi-val">{bottleneckData.speed_wall_bpm} BPM</span>
                  </div>
                  <div className="kpi-card">
                    <span className="kpi-label">БАРЬЕР РИДИНГА</span>
                    <span className="kpi-val">AR {bottleneckData.reading_wall_ar}</span>
                  </div>
                  <div className="kpi-card">
                    <span className="kpi-label">БАРЬЕР АИМА</span>
                    <span className="kpi-val">CS {bottleneckData.cs_wall}</span>
                  </div>
                </div>

                <div className="expanded-box" style={{ marginTop: "12px" }}>
                  <span className="box-title">Диагноз системы</span>
                  <p className="box-desc">{bottleneckData.diagnosis_desc}</p>
                </div>

                <div className="expanded-box" style={{ marginTop: "12px" }}>
                  <span className="box-title">Рекомендации по пробитию</span>
                  <div className="plan-list">
                    {bottleneckData.recommendations.map((rec, rIdx) => (
                      <div key={rIdx} className="plan-item">
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="pill-btn active" onClick={() => setBottlenecksModalOpen(false)}>
                  Понятно
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Daily Workout (.osdb & In-Game Injection) */}
        {workoutModalOpen && workoutData && (
          <div className="modal-backdrop" onClick={() => setWorkoutModalOpen(false)}>
            <div className="modal-dialog large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Персональная тренировка дня</h3>
                <button className="modal-close-btn" onClick={() => setWorkoutModalOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="workout-category-section">
                  <h4 className="workout-cat-title">1. Разминка и калибровка аима (3 карты)</h4>
                  <div className="workout-maps-grid">
                    {workoutData.warmup.map((m, idx) => (
                      <div
                        key={idx}
                        className="workout-map-card"
                        onClick={() => handleOpenLink(`https://osu.ppy.sh/b/${m.beatmap_id}`)}
                        style={{ cursor: "pointer" }}
                        title="Нажмите, чтобы открыть карту на сайте osu!"
                      >
                        <div className="wmap-left">
                          <span className="wmap-title">{m.title}</span>
                          <span className="wmap-diff">[{m.diff}] • {m.focus}</span>
                        </div>
                        <div className="wmap-right">
                          <span className="metric-chip sr">★ {m.sr}</span>
                          <span className="metric-chip bpm">{m.bpm} BPM</span>
                          <button
                            className="pill-btn mini"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLink(`https://osu.ppy.sh/b/${m.beatmap_id}`);
                            }}
                            title="Открыть на сайте osu!"
                          >
                            osu!
                          </button>
                          <button
                            className="pill-btn mini active"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLink(`osu://b/${m.beatmap_id}`);
                            }}
                            title="Запустить в osu! Direct"
                          >
                            Direct
                          </button>
                          <button
                            className="pill-btn mini"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLink(`https://catboy.best/d/${m.beatmapset_id}`);
                            }}
                            title="Скачать .osz архив"
                          >
                            .osz
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="workout-category-section">
                  <h4 className="workout-cat-title">2. Пробитие скоростного барьера и фингер-контроль (4 карты)</h4>
                  <div className="workout-maps-grid">
                    {workoutData.drills.map((m, idx) => (
                      <div
                        key={idx}
                        className="workout-map-card"
                        onClick={() => handleOpenLink(`https://osu.ppy.sh/b/${m.beatmap_id}`)}
                        style={{ cursor: "pointer" }}
                        title="Нажмите, чтобы открыть карту на сайте osu!"
                      >
                        <div className="wmap-left">
                          <span className="wmap-title">{m.title}</span>
                          <span className="wmap-diff">[{m.diff}] • {m.focus}</span>
                        </div>
                        <div className="wmap-right">
                          <span className="metric-chip sr">★ {m.sr}</span>
                          <span className="metric-chip bpm">{m.bpm} BPM</span>
                          <button
                            className="pill-btn mini"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLink(`https://osu.ppy.sh/b/${m.beatmap_id}`);
                            }}
                            title="Открыть на сайте osu!"
                          >
                            osu!
                          </button>
                          <button
                            className="pill-btn mini active"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLink(`osu://b/${m.beatmap_id}`);
                            }}
                            title="Запустить в osu! Direct"
                          >
                            Direct
                          </button>
                          <button
                            className="pill-btn mini"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLink(`https://catboy.best/d/${m.beatmapset_id}`);
                            }}
                            title="Скачать .osz архив"
                          >
                            .osz
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="workout-category-section">
                  <h4 className="workout-cat-title">3. Длинные стримы и выносливость (3 карты)</h4>
                  <div className="workout-maps-grid">
                    {workoutData.stamina.map((m, idx) => (
                      <div
                        key={idx}
                        className="workout-map-card"
                        onClick={() => handleOpenLink(`https://osu.ppy.sh/b/${m.beatmap_id}`)}
                        style={{ cursor: "pointer" }}
                        title="Нажмите, чтобы открыть карту на сайте osu!"
                      >
                        <div className="wmap-left">
                          <span className="wmap-title">{m.title}</span>
                          <span className="wmap-diff">[{m.diff}] • {m.focus}</span>
                        </div>
                        <div className="wmap-right">
                          <span className="metric-chip sr">★ {m.sr}</span>
                          <span className="metric-chip bpm">{m.bpm} BPM</span>
                          <button
                            className="pill-btn mini"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLink(`https://osu.ppy.sh/b/${m.beatmap_id}`);
                            }}
                            title="Открыть на сайте osu!"
                          >
                            osu!
                          </button>
                          <button
                            className="pill-btn mini active"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLink(`osu://b/${m.beatmap_id}`);
                            }}
                            title="Запустить в osu! Direct"
                          >
                            Direct
                          </button>
                          <button
                            className="pill-btn mini"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLink(`https://catboy.best/d/${m.beatmapset_id}`);
                            }}
                            title="Скачать .osz архив"
                          >
                            .osz
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer workout-footer">
                <div className="injector-btn-group">
                  <button className="pill-btn active" onClick={handleExportWorkoutOsdb} title="Сохранить файл .osdb (Collection Manager) на Рабочий стол">
                    Сохранить .osdb на Рабочий стол
                  </button>
                  <button className="pill-btn active" onClick={handleExportWorkoutCollectionDb} title="Сохранить collection.db на Рабочий стол">
                    Сохранить collection.db на Рабочий стол
                  </button>
                </div>
                <button className="pill-btn" onClick={() => setWorkoutModalOpen(false)}>
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DRAWER: Real P2P Mesh Network */}
        {peersDrawerOpen && (
          <div className="drawer-backdrop" onClick={() => setPeersDrawerOpen(false)}>
            <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
              <div className="drawer-header">
                <h3 className="drawer-title">P2P Сеть игроков ({p2pPeers.length})</h3>
                <button className="modal-close-btn" onClick={() => setPeersDrawerOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="drawer-body">
                <div className="p2p-info-banner">
                  <span>
                    Локальное автообнаружение UDP активно. Здесь отображаются реальные игроки в сети.
                  </span>
                </div>

                <div className="search-user-box">
                  <input
                    type="text"
                    className="p2p-search-input"
                    placeholder="Найти игрока по никнейму в osu!..."
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchUserQuery.trim()) {
                        handleInspectUser(searchUserQuery.trim());
                      }
                    }}
                  />
                  <button
                    className="pill-btn mini active"
                    onClick={() => {
                      if (searchUserQuery.trim()) {
                        handleInspectUser(searchUserQuery.trim());
                      }
                    }}
                  >
                    Поиск
                  </button>
                </div>

                <div className="peers-list">
                  {/* Always Show Current User at Top of Online List */}
                  <div className="peer-card-item self-peer-card" style={{ borderColor: "rgba(14, 165, 233, 0.4)", background: "rgba(14, 165, 233, 0.04)" }}>
                    <img
                      src={resolveAvatar(currentUser.user_id, currentUser.username)}
                      alt="Avatar"
                      className="peer-avatar"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.username || "P")}&background=0284c7&color=fff&size=128&bold=true`;
                      }}
                    />
                    <div className="peer-details">
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="peer-name">{currentUser.username}</span>
                        <span className="self-badge">(Вы)</span>
                        {getUserRoleBadge(currentUser.username) && (
                          <span className={getUserRoleBadge(currentUser.username)!.badgeClass}>
                            {getUserRoleBadge(currentUser.username)!.title}
                          </span>
                        )}
                      </div>
                      <span className="peer-activity">{currentUser.activity || "В сети"}</span>
                    </div>
                    <span className="peer-ping" style={{ color: "var(--osu-blue)" }}>0ms</span>
                  </div>

                  {/* Render Other Connected Active Peers */}
                  {p2pPeers
                    .filter(
                      (p) =>
                        p.user_id !== currentUser.user_id &&
                        p.user_name.toLowerCase() !== currentUser.username.toLowerCase()
                    )
                    .map((peer) => (
                      <div
                        key={peer.client_id || peer.user_id}
                        className="peer-card-item"
                        onClick={() => handleInspectUser(peer.user_name)}
                      >
                        <img
                          src={peer.avatar_url || resolveAvatar(peer.user_id, peer.user_name)}
                          alt="Avatar"
                          className="peer-avatar"
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(peer.user_name || "P")}&background=0284c7&color=fff&size=128&bold=true`;
                          }}
                        />
                        <div className="peer-details">
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span className="peer-name">{peer.user_name}</span>
                            {getUserRoleBadge(peer.user_name) && (
                              <span className={getUserRoleBadge(peer.user_name)!.badgeClass}>
                                {getUserRoleBadge(peer.user_name)!.title}
                              </span>
                            )}
                          </div>
                          <span className="peer-activity">{peer.activity}</span>
                        </div>
                        <span className="peer-ping">{peer.latency_ms}ms</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Switch Profile / Nickname */}
        {editProfileOpen && (
          <div className="modal-backdrop" onClick={() => setEditProfileOpen(false)}>
            <div
              className="modal-content"
              style={{ maxWidth: "420px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3 className="modal-title">Сменить профиль osu!</h3>
                <button className="modal-close-btn" onClick={() => setEditProfileOpen(false)}>
                  ✕
                </button>
              </div>
              <div className="modal-body" style={{ gap: "16px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Введите ваш никнейм в osu! для автоматической загрузки сессий и статистики:
                </span>
                <input
                  type="text"
                  className="p2p-search-input"
                  placeholder="Ваш никнейм в osu!..."
                  value={profileInputName}
                  onChange={(e) => setProfileInputName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveCustomProfile()}
                  autoFocus
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                  <button className="pill-btn" onClick={() => setEditProfileOpen(false)}>
                    Отмена
                  </button>
                  <button className="pill-btn active" onClick={handleSaveCustomProfile}>
                    Сохранить
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default App;
