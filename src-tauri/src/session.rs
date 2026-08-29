use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use serde_json::Value;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionFileSummary {
    pub key: String,
    pub timestamp: u64,
    pub title: String,
    pub scores_count: usize,
    pub avg_acc: f64,
    pub is_main_db: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserPreferences {
    pub theme: String,
    pub resolution_idx: usize,
    pub card_alpha: f32,
    pub favorite_users: Vec<String>,
    #[serde(default)]
    pub custom_username: Option<String>,
}

impl Default for UserPreferences {
    fn default() -> Self {
        UserPreferences {
            theme: "dark".to_string(),
            resolution_idx: 0,
            card_alpha: 0.90,
            favorite_users: Vec::new(),
            custom_username: None,
        }
    }
}

pub fn get_app_dir() -> PathBuf {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let dir = Path::new(&appdata).join("osu_coach_tauri");
        let _ = fs::create_dir_all(&dir);
        return dir;
    }
    PathBuf::from("./osu_coach_tauri")
}

pub fn get_preferences() -> UserPreferences {
    let p = get_app_dir().join("preferences.json");
    if let Ok(txt) = fs::read_to_string(p) {
        if let Ok(prefs) = serde_json::from_str::<UserPreferences>(&txt) {
            return prefs;
        }
    }
    UserPreferences::default()
}

pub fn save_preferences(prefs: &UserPreferences) -> bool {
    let p = get_app_dir().join("preferences.json");
    if let Ok(txt) = serde_json::to_string_pretty(prefs) {
        return fs::write(p, txt).is_ok();
    }
    false
}

pub fn auto_archive_previous_live() {
    let dir = get_app_dir();
    let live_file = dir.join("live_active.json");
    if live_file.exists() {
        if let Ok(txt) = fs::read_to_string(&live_file) {
            if let Ok(scores) = serde_json::from_str::<Vec<Value>>(&txt) {
                if !scores.is_empty() {
                    let ts = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs() as i64;
                    let _ = save_session_file(ts, &scores);
                }
            }
        }
        let _ = fs::remove_file(&live_file);
    }
}

pub fn sync_live_session(scores: &[Value]) -> bool {
    let dir = get_app_dir();
    let live_file = dir.join("live_active.json");
    if let Ok(txt) = serde_json::to_string_pretty(scores) {
        return fs::write(live_file, txt).is_ok();
    }
    false
}

pub fn get_all_history_sources() -> Vec<PathBuf> {
    let mut sources = Vec::new();

    if let Ok(appdata) = std::env::var("APPDATA") {
        let godot_base = Path::new(&appdata).join("Godot/app_userdata");
        
        let db1 = godot_base.join("Osu! Perfomance Helper/scores.db");
        if db1.exists() { sources.push(db1); }

        let db2 = godot_base.join("osu! Coach/scores.db");
        if db2.exists() { sources.push(db2); }

        let db3 = godot_base.join("osu! Performance Hub/scores.db");
        if db3.exists() { sources.push(db3); }

        let h1 = godot_base.join("Osu! Perfomance Helper/history");
        if h1.exists() { sources.push(h1); }

        let h2 = godot_base.join("osu! Coach/history");
        if h2.exists() { sources.push(h2); }
    }

    let local_db = get_app_dir().join("scores.db");
    if local_db.exists() { sources.push(local_db); }

    let local_h = get_app_dir().join("history");
    let _ = fs::create_dir_all(&local_h);
    sources.push(local_h);

    sources
}

pub fn load_scores_db_file(path: &Path) -> Vec<Value> {
    let mut scores = Vec::new();
    if let Ok(txt) = fs::read_to_string(path) {
        for line in txt.lines() {
            let l = line.trim();
            if l.is_empty() { continue; }
            if let Ok(val) = serde_json::from_str::<Value>(l) {
                let b_id = val.get("beatmap_id").and_then(|v| v.as_i64()).unwrap_or(0);
                let title = val.get("title").and_then(|v| v.as_str()).unwrap_or("Beatmap").to_string();
                let artist = val.get("artist").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let version = val.get("version").and_then(|v| v.as_str()).unwrap_or("Diff").to_string();
                let sr = val.get("sr").and_then(|v| v.as_f64()).unwrap_or(5.0);
                let bpm = val.get("bpm").and_then(|v| v.as_i64()).unwrap_or(180);
                let ar = val.get("ar").and_then(|v| v.as_f64()).unwrap_or(9.0);
                let cs = val.get("cs").and_then(|v| v.as_f64()).unwrap_or(4.0);
                let od = val.get("od").and_then(|v| v.as_f64()).unwrap_or(8.0);
                let c300 = val.get("c300").and_then(|v| v.as_i64()).unwrap_or(0);
                let c100 = val.get("c100").and_then(|v| v.as_i64()).unwrap_or(0);
                let c50 = val.get("c50").and_then(|v| v.as_i64()).unwrap_or(0);
                let miss = val.get("miss").and_then(|v| v.as_i64()).unwrap_or(0);
                let total_hits = (c300 + c100 + c50 + miss).max(1);

                let normalized = serde_json::json!({
                    "id": val.get("id").unwrap_or(&Value::from(0)),
                    "user_name": val.get("player_name").unwrap_or(&Value::from("CHROM24")),
                    "accuracy": val.get("accuracy").and_then(|v| v.as_f64()).unwrap_or(90.0) / 100.0,
                    "combo": val.get("combo").unwrap_or(&Value::from(0)),
                    "max_combo": val.get("max_combo").unwrap_or(&Value::from(total_hits)),
                    "rank": val.get("rank").unwrap_or(&Value::from("F")),
                    "passed": val.get("passed").unwrap_or(&Value::from(true)),
                    "pp": val.get("pp").unwrap_or(&Value::from(0)),
                    "aim_pp": val.get("aim_pp").unwrap_or(&Value::from(0)),
                    "speed_pp": val.get("speed_pp").unwrap_or(&Value::from(0)),
                    "acc_pp": val.get("acc_pp").unwrap_or(&Value::from(0)),
                    "fc_pp": val.get("fc_pp").unwrap_or(&Value::from(0)),
                    "mods": [val.get("mods").and_then(|v| v.as_str()).unwrap_or("+NM").replace('+', "")],
                    "statistics": {
                        "great": c300,
                        "ok": c100,
                        "meh": c50,
                        "miss": miss,
                        "slider_tail_hit": 0
                    },
                    "beatmap": {
                        "id": b_id,
                        "difficulty_rating": sr,
                        "bpm": bpm,
                        "ar": ar,
                        "cs": cs,
                        "od": od,
                        "hp": 5.0,
                        "version": version,
                        "count_circles": (total_hits as f64 * 0.7) as i32,
                        "count_sliders": (total_hits as f64 * 0.3) as i32,
                        "count_spinners": 1,
                        "beatmapset": {
                            "id": b_id,
                            "title": title,
                            "artist": artist,
                            "creator": "Mapper"
                        }
                    },
                    "beatmapset": {
                        "id": b_id,
                        "title": title,
                        "artist": artist,
                        "creator": "Mapper"
                    }
                });
                scores.push(normalized);
            }
        }
    }
    scores.reverse();
    scores
}

pub fn get_sessions_list() -> Vec<SessionFileSummary> {
    auto_archive_previous_live();
    let mut list = Vec::new();
    let sources = get_all_history_sources();

    for src in sources {
        if src.is_file() && src.extension().and_then(|s| s.to_str()) == Some("db") {
            let scores = load_scores_db_file(&src);
            if !scores.is_empty() {
                let count = scores.len();
                let sum_acc: f64 = scores.iter()
                    .filter_map(|s| s.get("accuracy").and_then(|a| a.as_f64()))
                    .sum();
                let avg_acc = (sum_acc / count as f64) * 100.0;
                
                list.push(SessionFileSummary {
                    key: src.to_string_lossy().to_string(),
                    timestamp: 1787909538,
                    title: "Основная база сессий (scores.db)".to_string(),
                    scores_count: count,
                    avg_acc: (avg_acc * 100.0).round() / 100.0,
                    is_main_db: true,
                });
            }
        } else if src.is_dir() {
            if let Ok(entries) = fs::read_dir(&src) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.extension().and_then(|s| s.to_str()) == Some("json") {
                        let filename = path.file_name().and_then(|s| s.to_str()).unwrap_or("session");
                        let mtime = path.metadata().and_then(|m| m.modified()).ok();
                        let ts = mtime.and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok()).map(|d| d.as_secs()).unwrap_or(0);
                        let scores = load_session_file(&path.to_string_lossy());
                        let count = scores.len();
                        let sum_acc: f64 = scores.iter()
                            .filter_map(|s| s.get("accuracy").and_then(|a| a.as_f64()))
                            .sum();
                        let avg_acc = if count > 0 { (sum_acc / count as f64) * 100.0 } else { 0.0 };

                        let clean_title = if filename.starts_with("session_") {
                            let raw_ts = filename.replace("session_", "").replace(".json", "");
                            if let Ok(parsed_ts) = raw_ts.parse::<u64>() {
                                let dt = chrono_format_ts(parsed_ts);
                                format!("Архивная сессия ({})", dt)
                            } else {
                                format!("Сессия: {}", filename.replace(".json", ""))
                            }
                        } else {
                            format!("Сессия: {}", filename.replace(".json", ""))
                        };

                        list.push(SessionFileSummary {
                            key: path.to_string_lossy().to_string(),
                            timestamp: ts,
                            title: clean_title,
                            scores_count: count,
                            avg_acc: (avg_acc * 100.0).round() / 100.0,
                            is_main_db: false,
                        });
                    }
                }
            }
        }
    }

    list
}

fn chrono_format_ts(ts: u64) -> String {
    // Simple fast timestamp formatter without external chrono crate
    let hours = (ts / 3600) % 24;
    let minutes = (ts / 60) % 60;
    format!("{:02}:{:02}", hours, minutes)
}

pub fn load_session_file(key: &str) -> Vec<Value> {
    let path = Path::new(key);
    if path.extension().and_then(|s| s.to_str()) == Some("db") {
        return load_scores_db_file(path);
    }

    if let Ok(txt) = fs::read_to_string(path) {
        if let Ok(json) = serde_json::from_str::<Value>(&txt) {
            if let Some(arr) = json.as_array() {
                return arr.clone();
            } else if let Some(arr) = json.get("scores").and_then(|s| s.as_array()) {
                return arr.clone();
            }
        }
    }

    Vec::new()
}

pub fn save_session_file(ts: i64, scores: &[Value]) -> bool {
    let dir = get_app_dir().join("history");
    let _ = fs::create_dir_all(&dir);
    let path = dir.join(format!("session_{}.json", ts));
    if let Ok(txt) = serde_json::to_string_pretty(scores) {
        return fs::write(path, txt).is_ok();
    }
    false
}

pub fn delete_session_file(key: &str) -> bool {
    let path = Path::new(key);
    if path.exists() && path.is_file() {
        return fs::remove_file(path).is_ok();
    }
    false
}

pub fn merge_daily_sessions() -> usize {
    let dir = get_app_dir().join("history");
    let mut all_scores = Vec::new();
    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.extension().and_then(|s| s.to_str()) == Some("json") {
                let scores = load_session_file(&p.to_string_lossy());
                all_scores.extend(scores);
                let _ = fs::remove_file(p);
            }
        }
    }
    if !all_scores.is_empty() {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;
        let _ = save_session_file(ts, &all_scores);
    }
    all_scores.len()
}

pub fn clear_all_sessions() -> bool {
    let sources = get_all_history_sources();
    for src in sources {
        if src.is_dir() {
            if let Ok(entries) = fs::read_dir(&src) {
                for entry in entries.flatten() {
                    let _ = fs::remove_file(entry.path());
                }
            }
        }
    }
    true
}
