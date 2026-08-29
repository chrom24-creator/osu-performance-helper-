pub mod osu_math;
pub mod replay_parser;
pub mod bottleneck;
pub mod collection;
pub mod session;
pub mod live_tracker;
pub mod p2p_mesh;

use osu_math::{get_modded_stats, calculate_pp_breakdown, ModdedStats, PpBreakdown};
use replay_parser::{
    parse_osr_file, parse_osu_beatmap, analyze_mock_or_real_telemetry,
    detect_osu_user_full, scan_local_osu_replays, analyze_osr_file_detailed,
    ParsedReplay, ParsedBeatmap, TelemetryAnalysis, DetectedUser, DetailedReplayReport
};
use bottleneck::{analyze_player_bottlenecks, BottleneckReport};
use collection::{
    generate_daily_workout, export_osdb_file, export_collection_db_file, inject_collection_stable,
    inject_collection_lazer, DailyWorkout, WorkoutMap
};
use session::{
    get_sessions_list, load_session_file, save_session_file, delete_session_file, get_preferences,
    save_preferences, merge_daily_sessions, clear_all_sessions, sync_live_session,
    SessionFileSummary, UserPreferences
};
use live_tracker::poll_latest_scores;
use p2p_mesh::{get_active_p2p_peers, broadcast_my_p2p_presence, P2PPeerInfo};
use serde::{Serialize, Deserialize};
use serde_json::Value;

#[tauri::command]
fn get_modded_stats_cmd(bmap: Value, s: Value) -> ModdedStats {
    get_modded_stats(&bmap, &s)
}

#[tauri::command]
fn calculate_pp_cmd(mstats: ModdedStats, total_objects: i32, max_combo: i32, s: Value) -> PpBreakdown {
    calculate_pp_breakdown(&mstats, total_objects, max_combo, &s)
}

#[tauri::command]
fn parse_osr_file_cmd(path: String) -> ParsedReplay {
    parse_osr_file(&path)
}

#[tauri::command]
fn analyze_osr_file_detailed_cmd(path: String) -> Result<DetailedReplayReport, String> {
    analyze_osr_file_detailed(&path)
}

#[tauri::command]
fn parse_osu_beatmap_cmd(content_or_path: String) -> ParsedBeatmap {
    parse_osu_beatmap(&content_or_path)
}

#[tauri::command]
fn analyze_telemetry_cmd(cs: f64, od: f64, total_hits: i32, c300: i32, c100: i32, c50: i32, miss: i32) -> TelemetryAnalysis {
    analyze_mock_or_real_telemetry(cs, od, total_hits, c300, c100, c50, miss)
}

#[tauri::command]
fn analyze_bottlenecks_cmd(scores: Vec<Value>) -> BottleneckReport {
    analyze_player_bottlenecks(&scores)
}

#[tauri::command]
fn generate_workout_cmd(avg_sr: f64, speed_wall: i32, reading_wall: f64, cs_wall: f64) -> DailyWorkout {
    generate_daily_workout(avg_sr, speed_wall, reading_wall, cs_wall)
}

fn get_export_target_dir() -> std::path::PathBuf {
    let user_profile = std::env::var("USERPROFILE").unwrap_or_else(|_| ".".to_string());
    let up = std::path::Path::new(&user_profile);

    let candidates = [
        up.join("Desktop"),
        up.join("OneDrive").join("Desktop"),
        up.join("OneDrive").join("Рабочий стол"),
        up.join("Рабочий стол"),
        up.join("Downloads"),
        up.join("Загрузки"),
        up.join("Documents"),
        up.join("Документы"),
    ];

    for c in &candidates {
        if c.exists() && c.is_dir() {
            return c.clone();
        }
    }

    let fallback = up.join("Desktop");
    let _ = std::fs::create_dir_all(&fallback);
    if fallback.exists() {
        return fallback;
    }

    std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."))
}

#[tauri::command]
fn export_osdb_cmd(collection_name: String, maps: Vec<WorkoutMap>) -> Result<String, String> {
    let export_dir = get_export_target_dir();
    let safe_name = collection_name.replace(' ', "_");
    let target_path = export_dir.join(format!("{}.osdb", safe_name));
    if let Some(parent) = target_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let target_str = target_path.to_string_lossy().to_string();
    export_osdb_file(&target_str, &collection_name, &maps).map_err(|e| e.to_string())?;
    Ok(target_str)
}

#[tauri::command]
fn export_collection_db_cmd(collection_name: String, maps: Vec<WorkoutMap>) -> Result<String, String> {
    let export_dir = get_export_target_dir();
    let target_path = export_dir.join("collection.db");
    if let Some(parent) = target_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let target_str = target_path.to_string_lossy().to_string();
    export_collection_db_file(&target_str, &collection_name, &maps).map_err(|e| e.to_string())?;
    Ok(target_str)
}

#[tauri::command]
fn inject_collection_stable_cmd(collection_name: String, maps: Vec<WorkoutMap>) -> Result<String, String> {
    inject_collection_stable(&collection_name, &maps)
}

#[tauri::command]
fn inject_collection_lazer_cmd(collection_name: String, maps: Vec<WorkoutMap>) -> Result<String, String> {
    inject_collection_lazer(&collection_name, &maps)
}

#[tauri::command]
fn get_sessions_list_cmd() -> Vec<SessionFileSummary> {
    get_sessions_list()
}

#[tauri::command]
fn load_session_scores_cmd(key: String) -> Vec<Value> {
    load_session_file(&key)
}

#[tauri::command]
fn save_session_scores_cmd(ts: i64, scores: Vec<Value>) -> bool {
    save_session_file(ts, &scores)
}

#[tauri::command]
fn sync_live_session_cmd(scores: Vec<Value>) -> bool {
    sync_live_session(&scores)
}

#[tauri::command]
fn delete_session_cmd(key: String) -> bool {
    delete_session_file(&key)
}

#[tauri::command]
fn merge_daily_sessions_cmd() -> usize {
    merge_daily_sessions()
}

#[tauri::command]
fn clear_all_sessions_cmd() -> bool {
    clear_all_sessions()
}

#[tauri::command]
fn get_preferences_cmd() -> UserPreferences {
    get_preferences()
}

#[tauri::command]
fn save_preferences_cmd(prefs: UserPreferences) -> bool {
    save_preferences(&prefs)
}

#[tauri::command]
fn detect_osu_user_cmd() -> DetectedUser {
    detect_osu_user_full()
}

#[tauri::command]
fn scan_local_replays_cmd() -> Vec<Value> {
    scan_local_osu_replays()
}

#[tauri::command]
async fn poll_live_scores_cmd(user_id: String) -> Vec<Value> {
    poll_latest_scores(&user_id).await
}

#[tauri::command]
fn get_p2p_peers_cmd() -> Vec<P2PPeerInfo> {
    get_active_p2p_peers()
}

#[tauri::command]
fn broadcast_p2p_presence_cmd(user_name: String, user_id: String, activity: String) -> bool {
    broadcast_my_p2p_presence(&user_name, &user_id, &activity)
}

#[tauri::command]
fn analyze_osr_bytes_detailed_cmd(bytes: Vec<u8>) -> Result<replay_parser::DetailedReplayReport, String> {
    replay_parser::analyze_osr_bytes_detailed(&bytes)
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ResolvedOsuUser {
    pub username: String,
    pub user_id: String,
    pub avatar_url: String,
}

#[tauri::command]
async fn resolve_osu_user_cmd(username: String) -> Result<ResolvedOsuUser, String> {
    let clean = username.trim();
    if clean.is_empty() {
        return Err("Empty username".to_string());
    }

    if clean.chars().all(|c| c.is_ascii_digit()) {
        return Ok(ResolvedOsuUser {
            username: clean.to_string(),
            user_id: clean.to_string(),
            avatar_url: format!("https://a.ppy.sh/{}", clean),
        });
    }

    // 1. Check osu! 302 redirect
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .timeout(std::time::Duration::from_secs(4))
        .build()
        .map_err(|e| e.to_string())?;

    let check_url = format!("https://osu.ppy.sh/users/{}", clean);
    if let Ok(resp) = client.get(&check_url).send().await {
        if let Some(loc) = resp.headers().get("location") {
            if let Ok(loc_str) = loc.to_str() {
                if let Some(pos) = loc_str.find("/users/") {
                    let numeric_id = loc_str[pos + 7..].split('?').next().unwrap_or("").to_string();
                    if !numeric_id.is_empty() && numeric_id.chars().all(|c| c.is_ascii_digit()) {
                        return Ok(ResolvedOsuUser {
                            username: clean.to_string(),
                            user_id: numeric_id.clone(),
                            avatar_url: format!("https://a.ppy.sh/{}", numeric_id),
                        });
                    }
                }
            }
        }
    }

    // 2. Check catboy.best mirror
    let mirror_url = format!("https://catboy.best/api/get_user?u={}", clean);
    if let Ok(resp) = client.get(&mirror_url).send().await {
        if let Ok(json) = resp.json::<Vec<Value>>().await {
            if let Some(first) = json.first() {
                if let Some(uid) = first.get("user_id").and_then(|v| v.as_str()) {
                    return Ok(ResolvedOsuUser {
                        username: clean.to_string(),
                        user_id: uid.to_string(),
                        avatar_url: format!("https://a.ppy.sh/{}", uid),
                    });
                }
            }
        }
    }

    Ok(ResolvedOsuUser {
        username: clean.to_string(),
        user_id: clean.to_string(),
        avatar_url: format!("https://a.ppy.sh/{}", clean),
    })
}

#[tauri::command]
async fn fetch_online_scores_cmd(username: String) -> Result<Vec<Value>, String> {
    let clean_user = username.trim();
    if clean_user.is_empty() {
        return Ok(Vec::new());
    }

    let no_redirect_client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(6))
        .build()
        .map_err(|e| e.to_string())?;

    // 1. Resolve numeric ID
    let mut resolved_id = if clean_user.chars().all(|c| c.is_ascii_digit()) {
        clean_user.to_string()
    } else {
        let check_url = format!("https://osu.ppy.sh/users/{}", clean_user);
        if let Ok(resp) = no_redirect_client.get(&check_url).send().await {
            if let Some(loc) = resp.headers().get("location") {
                if let Ok(loc_str) = loc.to_str() {
                    if let Some(pos) = loc_str.find("/users/") {
                        loc_str[pos + 7..].split('?').next().unwrap_or("").to_string()
                    } else {
                        clean_user.to_string()
                    }
                } else {
                    clean_user.to_string()
                }
            } else {
                clean_user.to_string()
            }
        } else {
            clean_user.to_string()
        }
    };

    if resolved_id.is_empty() {
        resolved_id = clean_user.to_string();
    }

    let api_client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(8))
        .build()
        .map_err(|e| e.to_string())?;

    // 2. Fetch RECENT session scores first (identical to Godot fetch_recent_scores)
    let official_recent_url = format!("https://osu.ppy.sh/users/{}/scores/recent?mode=osu&limit=100&include_fails=1", resolved_id);
    if let Ok(resp) = api_client.get(&official_recent_url).header("x-requested-with", "XMLHttpRequest").send().await {
        if resp.status().is_success() {
            if let Ok(json) = resp.json::<Vec<Value>>().await {
                if !json.is_empty() {
                    return Ok(json);
                }
            }
        }
    }

    // 3. Fallback to recent mirror
    let mirror_recent_url = "https://catboy.best/api/get_user_recent";
    if let Ok(resp) = api_client.get(mirror_recent_url).query(&[("u", &resolved_id), ("limit", &"100".to_string())]).send().await {
        if resp.status().is_success() {
            if let Ok(json) = resp.json::<Vec<Value>>().await {
                if !json.is_empty() {
                    return Ok(json);
                }
            }
        }
    }

    // 4. Fallback to best plays if no recent plays exist
    let official_best_url = format!("https://osu.ppy.sh/users/{}/scores/best?mode=osu&limit=50", resolved_id);
    if let Ok(resp) = api_client.get(&official_best_url).header("x-requested-with", "XMLHttpRequest").send().await {
        if resp.status().is_success() {
            if let Ok(json) = resp.json::<Vec<Value>>().await {
                if !json.is_empty() {
                    return Ok(json);
                }
            }
        }
    }

    Ok(Vec::new())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_modded_stats_cmd,
            calculate_pp_cmd,
            parse_osr_file_cmd,
            analyze_osr_file_detailed_cmd,
            analyze_osr_bytes_detailed_cmd,
            parse_osu_beatmap_cmd,
            analyze_telemetry_cmd,
            analyze_bottlenecks_cmd,
            generate_workout_cmd,
            export_osdb_cmd,
            export_collection_db_cmd,
            inject_collection_stable_cmd,
            inject_collection_lazer_cmd,
            get_sessions_list_cmd,
            load_session_scores_cmd,
            save_session_scores_cmd,
            sync_live_session_cmd,
            delete_session_cmd,
            merge_daily_sessions_cmd,
            clear_all_sessions_cmd,
            get_preferences_cmd,
            save_preferences_cmd,
            detect_osu_user_cmd,
            scan_local_replays_cmd,
            poll_live_scores_cmd,
            get_p2p_peers_cmd,
            broadcast_p2p_presence_cmd,
            fetch_online_scores_cmd,
            resolve_osu_user_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
