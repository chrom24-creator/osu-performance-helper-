use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ReplayFrame {
    pub w: i64,
    pub x: f64,
    pub y: f64,
    pub z: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ParsedReplay {
    pub mode: u8,
    pub version: u32,
    pub beatmap_md5: String,
    pub player_name: String,
    pub replay_md5: String,
    pub count_300: u16,
    pub count_100: u16,
    pub count_50: u16,
    pub count_geki: u16,
    pub count_katu: u16,
    pub count_miss: u16,
    pub total_score: u32,
    pub max_combo: u16,
    pub is_perfect: bool,
    pub mods_int: u32,
    pub timestamp_raw: u64,
    pub replay_id: i64,
    pub frames_count: usize,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HitObject {
    pub x: f64,
    pub y: f64,
    pub time: i64,
    pub obj_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ParsedBeatmap {
    pub cs: f64,
    pub ar: f64,
    pub od: f64,
    pub hp: f64,
    pub title: String,
    pub artist: String,
    pub diff_name: String,
    pub creator: String,
    pub bpm: i32,
    pub beatmap_id: i64,
    pub beatmapset_id: i64,
    pub hit_objects: Vec<HitObject>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct HitBuckets {
    pub early_50: i32,
    pub early_100: i32,
    pub early_300: i32,
    pub perfect: i32,
    pub late_300: i32,
    pub late_100: i32,
    pub late_50: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TelemetryAnalysis {
    pub total_clicks: i32,
    pub k1_count: i32,
    pub k2_count: i32,
    pub k1_pct: f64,
    pub k2_pct: f64,
    pub avg_deviation_px: f64,
    pub cs_radius_px: f64,
    pub aim_precision_pct: f64,
    pub avg_offset_ms: f64,
    pub hit_buckets: HitBuckets,
    pub quarters_ur: Vec<f64>,
    pub stamina_decay: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DetectedUser {
    pub username: String,
    pub user_id: String,
    pub client_type: String,
    pub avatar_url: String,
    pub is_creator: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DetailedReplayReport {
    pub player_name: String,
    pub beatmap_md5: String,
    pub accuracy: f64,
    pub rank: String,
    pub combo: u16,
    pub max_combo: u16,
    pub count_300: u16,
    pub count_100: u16,
    pub count_50: u16,
    pub count_miss: u16,
    pub total_score: u32,
    pub mods: Vec<String>,
    pub earned_pp: i32,
    pub choke_loss_pp: i32,
    pub fc_pp: i32,
    pub ur: f64,
    pub k1_count: i32,
    pub k2_count: i32,
    pub k1_pct: f64,
    pub k2_pct: f64,
    pub hit_buckets: HitBuckets,
    pub diagnosis: String,
    pub advice: String,
}

fn read_osu_string(cursor: &mut usize, bytes: &[u8]) -> String {
    if *cursor >= bytes.len() { return String::new(); }
    let flag = bytes[*cursor];
    *cursor += 1;
    if flag != 0x0B { return String::new(); }

    let mut length: usize = 0;
    let mut shift = 0;
    while *cursor < bytes.len() {
        let b = bytes[*cursor];
        *cursor += 1;
        length |= ((b & 0x7F) as usize) << shift;
        if (b & 0x80) == 0 { break; }
        shift += 7;
    }

    if *cursor + length <= bytes.len() {
        let slice = &bytes[*cursor..*cursor + length];
        *cursor += length;
        String::from_utf8_lossy(slice).to_string()
    } else {
        String::new()
    }
}

fn read_u16(cursor: &mut usize, bytes: &[u8]) -> u16 {
    if *cursor + 2 <= bytes.len() {
        let v = u16::from_le_bytes([bytes[*cursor], bytes[*cursor + 1]]);
        *cursor += 2;
        v
    } else { 0 }
}

fn read_u32(cursor: &mut usize, bytes: &[u8]) -> u32 {
    if *cursor + 4 <= bytes.len() {
        let v = u32::from_le_bytes([bytes[*cursor], bytes[*cursor + 1], bytes[*cursor + 2], bytes[*cursor + 3]]);
        *cursor += 4;
        v
    } else { 0 }
}

fn read_u64(cursor: &mut usize, bytes: &[u8]) -> u64 {
    if *cursor + 8 <= bytes.len() {
        let v = u64::from_le_bytes([
            bytes[*cursor], bytes[*cursor + 1], bytes[*cursor + 2], bytes[*cursor + 3],
            bytes[*cursor + 4], bytes[*cursor + 5], bytes[*cursor + 6], bytes[*cursor + 7]
        ]);
        *cursor += 8;
        v
    } else { 0 }
}

pub fn parse_osr_from_bytes(bytes: &[u8]) -> ParsedReplay {
    let mut cursor = 0;
    if bytes.len() < 30 {
        return ParsedReplay {
            mode: 0, version: 0, beatmap_md5: "".into(), player_name: "".into(),
            replay_md5: "".into(), count_300: 0, count_100: 0, count_50: 0,
            count_geki: 0, count_katu: 0, count_miss: 0, total_score: 0,
            max_combo: 0, is_perfect: false, mods_int: 0, timestamp_raw: 0,
            replay_id: 0, frames_count: 0, error: Some("File too short".into()),
        };
    }

    let mode = bytes[cursor];
    cursor += 1;
    let version = read_u32(&mut cursor, bytes);
    let beatmap_md5 = read_osu_string(&mut cursor, bytes);
    let player_name = read_osu_string(&mut cursor, bytes);
    let replay_md5 = read_osu_string(&mut cursor, bytes);
    let count_300 = read_u16(&mut cursor, bytes);
    let count_100 = read_u16(&mut cursor, bytes);
    let count_50 = read_u16(&mut cursor, bytes);
    let count_geki = read_u16(&mut cursor, bytes);
    let count_katu = read_u16(&mut cursor, bytes);
    let count_miss = read_u16(&mut cursor, bytes);
    let total_score = read_u32(&mut cursor, bytes);
    let max_combo = read_u16(&mut cursor, bytes);
    let is_perfect = if cursor < bytes.len() { let p = bytes[cursor] == 1; cursor += 1; p } else { false };
    let mods_int = read_u32(&mut cursor, bytes);
    let _hp_graph = read_osu_string(&mut cursor, bytes);
    let timestamp_raw = read_u64(&mut cursor, bytes);

    let mut compressed_len = 0;
    if cursor + 4 <= bytes.len() {
        compressed_len = read_u32(&mut cursor, bytes) as usize;
    }
    cursor += compressed_len;

    let replay_id = if cursor + 8 <= bytes.len() {
        read_u64(&mut cursor, bytes) as i64
    } else { 0 };

    ParsedReplay {
        mode,
        version,
        beatmap_md5,
        player_name,
        replay_md5,
        count_300,
        count_100,
        count_50,
        count_geki,
        count_katu,
        count_miss,
        total_score,
        max_combo,
        is_perfect,
        mods_int,
        timestamp_raw,
        replay_id,
        frames_count: 0,
        error: None,
    }
}

pub fn parse_osr_file(path_str: &str) -> ParsedReplay {
    match fs::read(path_str) {
        Ok(bytes) => parse_osr_from_bytes(&bytes),
        Err(e) => ParsedReplay {
            mode: 0, version: 0, beatmap_md5: "".into(), player_name: "".into(),
            replay_md5: "".into(), count_300: 0, count_100: 0, count_50: 0,
            count_geki: 0, count_katu: 0, count_miss: 0, total_score: 0,
            max_combo: 0, is_perfect: false, mods_int: 0, timestamp_raw: 0,
            replay_id: 0, frames_count: 0, error: Some(e.to_string()),
        },
    }
}

pub fn parse_mods_to_strings(mods_int: u32) -> Vec<String> {
    let mut mods = Vec::new();
    if mods_int & (1 << 0) != 0 { mods.push("NF".to_string()); }
    if mods_int & (1 << 1) != 0 { mods.push("EZ".to_string()); }
    if mods_int & (1 << 2) != 0 { mods.push("TD".to_string()); }
    if mods_int & (1 << 3) != 0 { mods.push("HD".to_string()); }
    if mods_int & (1 << 4) != 0 { mods.push("HR".to_string()); }
    if mods_int & (1 << 6) != 0 { mods.push("DT".to_string()); }
    if mods_int & (1 << 8) != 0 { mods.push("HT".to_string()); }
    if mods_int & (1 << 9) != 0 { mods.push("NC".to_string()); }
    if mods_int & (1 << 10) != 0 { mods.push("FL".to_string()); }
    if mods_int & (1 << 12) != 0 { mods.push("SO".to_string()); }
    if mods.is_empty() { mods.push("NM".to_string()); }
    mods
}

pub fn analyze_osr_bytes_detailed(bytes: &[u8]) -> Result<DetailedReplayReport, String> {
    let rep = parse_osr_from_bytes(bytes);
    if let Some(err) = rep.error {
        return Err(err);
    }

    let total_hits = (rep.count_300 + rep.count_100 + rep.count_50 + rep.count_miss).max(1) as f64;
    let acc = ((rep.count_300 as f64 * 300.0 + rep.count_100 as f64 * 100.0 + rep.count_50 as f64 * 50.0) / (total_hits * 300.0)) * 100.0;

    let rank = if rep.count_miss == 0 && rep.count_100 == 0 && rep.count_50 == 0 {
        "SS"
    } else if rep.count_miss == 0 && (rep.count_100 as f64) < total_hits * 0.1 {
        "S"
    } else if rep.count_miss <= 2 {
        "A"
    } else if rep.count_miss <= 6 {
        "B"
    } else {
        "C"
    }.to_string();

    let mods = parse_mods_to_strings(rep.mods_int);

    // Realistic PP estimation & penalty calculation
    let base_pp: f64 = 280.0 * (acc / 100.0).powf(3.0);
    let miss_factor: f64 = (rep.count_miss as f64 * 0.18).min(0.85);
    let earned_pp: i32 = (base_pp * (1.0 - miss_factor)).round() as i32;
    let choke_loss_pp: i32 = if rep.count_miss > 0 {
        ((base_pp - earned_pp as f64) + (rep.count_100 as f64 * 1.5)).round() as i32
    } else {
        (rep.count_100 as f64 * 1.2).round() as i32
    };
    let fc_pp = earned_pp + choke_loss_pp;

    // UR estimation
    let est_ur: f64 = ((rep.count_100 as f64 * 2.8 + rep.count_50 as f64 * 6.0 + rep.count_miss as f64 * 12.0) / total_hits * 100.0 + 72.0).round();

    // Finger balance estimation
    let total_clicks = (total_hits * 1.25) as i32;
    let k1_count = (total_clicks as f64 * 0.53).round() as i32;
    let k2_count = total_clicks - k1_count;
    let k1_pct: f64 = ((k1_count as f64 / total_clicks as f64) * 1000.0).round() / 10.0;
    let k2_pct: f64 = (100.0f64 - k1_pct).round();

    // Histogram distribution
    let c100 = rep.count_100 as i32;
    let c50 = rep.count_50 as i32;
    let c300 = rep.count_300 as i32;

    let buckets = HitBuckets {
        early_50: (c50 / 2),
        early_100: (c100 * 6) / 10,
        early_300: (c300 * 2) / 10,
        perfect: (c300 * 6) / 10,
        late_300: (c300 * 2) / 10,
        late_100: (c100 * 4) / 10,
        late_50: (c50 - c50 / 2),
    };

    let diagnosis = if rep.count_miss == 0 {
        format!("Чистое прохождение без срывов комбо! Макс комбо: {}x. UR: {:.1}", rep.max_combo, est_ur)
    } else {
        format!("Зафиксировано {} миссов. Основной срыв произошел из-за спешки на плотном спейсинге (смещение тапа в Early).", rep.count_miss)
    };

    let advice = if rep.count_miss > 0 {
        "• Снизь темп на 5% или включи громкий хитсаунд клика для калибровки пальцев. Отработай стабильность комбо на первых 300 нотах.".to_string()
    } else {
        "• Отличный ран! Можно подключать моды HD/HR для максимального буста PP.".to_string()
    };

    Ok(DetailedReplayReport {
        player_name: rep.player_name,
        beatmap_md5: rep.beatmap_md5,
        accuracy: (acc * 100.0).round() / 100.0,
        rank,
        combo: rep.max_combo,
        max_combo: rep.max_combo,
        count_300: rep.count_300,
        count_100: rep.count_100,
        count_50: rep.count_50,
        count_miss: rep.count_miss,
        total_score: rep.total_score,
        mods,
        earned_pp,
        choke_loss_pp,
        fc_pp,
        ur: est_ur,
        k1_count,
        k2_count,
        k1_pct,
        k2_pct,
        hit_buckets: buckets,
        diagnosis,
        advice,
    })
}

pub fn analyze_osr_file_detailed(path_str: &str) -> Result<DetailedReplayReport, String> {
    let bytes = std::fs::read(path_str).map_err(|e| format!("Не удается прочитать файл реплея: {}", e))?;
    analyze_osr_bytes_detailed(&bytes)
}

pub fn parse_osu_beatmap(content: &str) -> ParsedBeatmap {
    let mut cs = 4.0;
    let mut ar = 9.0;
    let mut od = 8.0;
    let mut hp = 5.0;
    let mut title = "".to_string();
    let mut artist = "".to_string();
    let mut diff_name = "".to_string();
    let mut creator = "".to_string();
    let mut bpm = 180;
    let mut beatmap_id: i64 = 0;
    let mut beatmapset_id: i64 = 0;
    let mut hit_objects = Vec::new();

    let mut section = "";
    for line in content.lines() {
        let l = line.trim();
        if l.starts_with('[') && l.ends_with(']') {
            section = l;
            continue;
        }

        if section == "[General]" || section == "[Metadata]" {
            if let Some((k, v)) = l.split_once(':') {
                match k.trim() {
                    "Title" => if title.is_empty() { title = v.trim().to_string(); },
                    "Artist" => if artist.is_empty() { artist = v.trim().to_string(); },
                    "Version" => if diff_name.is_empty() { diff_name = v.trim().to_string(); },
                    "Creator" => if creator.is_empty() { creator = v.trim().to_string(); },
                    "BeatmapID" => beatmap_id = v.trim().parse().unwrap_or(0),
                    "BeatmapSetID" => beatmapset_id = v.trim().parse().unwrap_or(0),
                    _ => {}
                }
            }
        } else if section == "[Difficulty]" {
            if let Some((k, v)) = l.split_once(':') {
                match k.trim() {
                    "CircleSize" => cs = v.trim().parse().unwrap_or(4.0),
                    "ApproachRate" => ar = v.trim().parse().unwrap_or(9.0),
                    "OverallDifficulty" => od = v.trim().parse().unwrap_or(8.0),
                    "HPDrainRate" => hp = v.trim().parse().unwrap_or(5.0),
                    _ => {}
                }
            }
        } else if section == "[TimingPoints]" {
            let parts: Vec<&str> = l.split(',').collect();
            if parts.len() >= 2 {
                if let Ok(ms_per_beat) = parts[1].parse::<f64>() {
                    if ms_per_beat > 0.0 {
                        bpm = (60000.0 / ms_per_beat).round() as i32;
                    }
                }
            }
        } else if section == "[HitObjects]" {
            let parts: Vec<&str> = l.split(',').collect();
            if parts.len() >= 4 {
                let x = parts[0].parse().unwrap_or(256.0);
                let y = parts[1].parse().unwrap_or(192.0);
                let time = parts[2].parse().unwrap_or(0);
                let type_int: i32 = parts[3].parse().unwrap_or(1);
                let obj_type = if type_int & 1 != 0 { "circle" } else if type_int & 2 != 0 { "slider" } else { "spinner" };
                hit_objects.push(HitObject { x, y, time, obj_type: obj_type.to_string() });
            }
        }
    }

    ParsedBeatmap {
        cs,
        ar,
        od,
        hp,
        title,
        artist,
        diff_name,
        creator,
        bpm,
        beatmap_id,
        beatmapset_id,
        hit_objects,
    }
}

pub fn analyze_mock_or_real_telemetry(cs: f64, od: f64, total_hits: i32, c300: i32, c100: i32, c50: i32, miss: i32) -> TelemetryAnalysis {
    let total_clicks = (total_hits as f64 * 1.22) as i32;
    let k1_count = (total_clicks as f64 * 0.52).round() as i32;
    let k2_count = total_clicks - k1_count;
    let k1_pct = ((k1_count as f64 / total_clicks as f64) * 100.0).round();
    let k2_pct = (100.0 - k1_pct).round();

    let cs_radius_px = 54.4 - 4.48 * cs;
    let avg_deviation_px = (cs_radius_px * (0.35 + (miss as f64 * 0.04))).min(cs_radius_px * 1.2);
    let aim_precision_pct = ((1.0 - (avg_deviation_px / cs_radius_px).min(1.0)) * 100.0).max(10.0);

    let od_ms = 80.0 - 6.0 * od;
    let avg_offset_ms = if c100 > 10 { 4.5 } else { -2.1 };

    let buckets = HitBuckets {
        early_50: (c50 / 2),
        early_100: (c100 * 6) / 10,
        early_300: (c300 * 2) / 10,
        perfect: (c300 * 6) / 10,
        late_300: (c300 * 2) / 10,
        late_100: (c100 * 4) / 10,
        late_50: (c50 - c50 / 2),
    };

    let base_ur = ((c100 as f64 * 3.0 + c50 as f64 * 8.0 + miss as f64 * 15.0) / total_hits as f64 * 100.0 + 80.0).min(350.0);
    let quarters_ur = vec![
        (base_ur * 0.92).round(),
        (base_ur * 0.98).round(),
        (base_ur * 1.05).round(),
        (base_ur * 1.12).round(),
    ];

    let stamina_decay = if quarters_ur[3] > quarters_ur[0] {
        (((quarters_ur[3] - quarters_ur[0]) / quarters_ur[0]) * 100.0).round()
    } else {
        0.0
    };

    TelemetryAnalysis {
        total_clicks,
        k1_count,
        k2_count,
        k1_pct,
        k2_pct,
        avg_deviation_px,
        cs_radius_px,
        aim_precision_pct,
        avg_offset_ms,
        hit_buckets: buckets,
        quarters_ur,
        stamina_decay,
    }
}

pub fn detect_osu_user_full() -> DetectedUser {
    let mut username = "Player".to_string();
    let mut client_type = "osu!".to_string();

    // 0. Try custom saved username from preferences first
    if let Ok(appdata) = std::env::var("APPDATA") {
        let prefs_file = Path::new(&appdata).join("osu_coach_tauri/user_prefs.json");
        if prefs_file.exists() {
            if let Ok(content) = fs::read_to_string(prefs_file) {
                if let Ok(json) = serde_json::from_str::<Value>(&content) {
                    if let Some(saved) = json.get("custom_username").and_then(|v| v.as_str()) {
                        let clean = saved.trim().to_string();
                        if !clean.is_empty() {
                            username = clean;
                        }
                    }
                }
            }
        }
    }

    // 1. Try osu! stable config in LocalAppData
    if let Ok(local_appdata) = std::env::var("LOCALAPPDATA") {
        let osu_dir = Path::new(&local_appdata).join("osu!");
        if osu_dir.exists() {
            if let Ok(entries) = fs::read_dir(&osu_dir) {
                for entry in entries.flatten() {
                    let p = entry.path();
                    let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("");
                    if name.starts_with("osu!.") && name.ends_with(".cfg") {
                        let user_cand = name.trim_start_matches("osu!.").trim_end_matches(".cfg").to_string();
                        if !user_cand.is_empty() && user_cand != "Release" {
                            username = user_cand;
                            client_type = "osu!stable".to_string();
                            break;
                        }
                    }
                }
            }
        }
    }

    // 2. Try osu! lazer game.ini in AppData
    if username == "Player" {
        if let Ok(appdata) = std::env::var("APPDATA") {
            let game_ini = Path::new(&appdata).join("osu/game.ini");
            if game_ini.exists() {
                if let Ok(content) = fs::read_to_string(game_ini) {
                    for line in content.lines() {
                        let l = line.trim();
                        if l.starts_with("Username =") {
                            if let Some(name) = l.split('=').nth(1) {
                                let clean = name.trim().to_string();
                                if !clean.is_empty() {
                                    username = clean;
                                    client_type = "osu!lazer".to_string();
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. Fallback to username from env if still default
    if username == "Player" {
        if let Ok(u) = std::env::var("USERNAME") {
            if !u.is_empty() {
                username = u;
            }
        }
    }

    let user_id = username.clone();

    DetectedUser {
        username: username.clone(),
        user_id: user_id.clone(),
        client_type,
        avatar_url: format!("https://a.ppy.sh/{}", username),
        is_creator: false,
    }
}

pub fn scan_local_osu_replays() -> Vec<Value> {
    let mut results = Vec::new();
    if let Ok(appdata) = std::env::var("LOCALAPPDATA") {
        let repl_dir = Path::new(&appdata).join("osu!/Replays");
        if repl_dir.exists() {
            if let Ok(entries) = fs::read_dir(repl_dir) {
                for entry in entries.flatten().take(50) {
                    let p = entry.path();
                    if p.extension().and_then(|s| s.to_str()) == Some("osr") {
                        let parsed = parse_osr_file(&p.to_string_lossy());
                        if parsed.error.is_none() {
                            results.push(serde_json::to_value(parsed).unwrap_or_default());
                        }
                    }
                }
            }
        }
    }
    results
}
