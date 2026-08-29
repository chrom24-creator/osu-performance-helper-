use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModdedStats {
    pub bpm: i32,
    pub sr: f64,
    pub cs: f64,
    pub cs_px: i32,
    pub ar: f64,
    pub ar_ms: i32,
    pub od: f64,
    pub w300: i32,
    pub w100: i32,
    pub w50: i32,
    pub hp: f64,
    pub speed_mult: f64,
    pub mods_str: String,
    pub has_dt: bool,
    pub has_ht: bool,
    pub has_hr: bool,
    pub has_ez: bool,
    pub has_hd: bool,
    pub has_fl: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeepBeatmapInfo {
    pub total_len_sec: i32,
    pub drain_len_sec: i32,
    pub total_objects: i32,
    pub circles: i32,
    pub sliders: i32,
    pub spinners: i32,
    pub circle_pct: f64,
    pub slider_pct: f64,
    pub spinner_pct: f64,
    pub density: f64,
    pub w300: i32,
    pub w100: i32,
    pub w50: i32,
    pub max_tails: i32,
    pub mapper: String,
    pub status: String,
    pub bmap_id: i64,
    pub max_combo: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PpBreakdown {
    pub pp: i64,
    pub aim_pp: i64,
    pub speed_pp: i64,
    pub acc_pp: i64,
    pub fl_pp: i64,
    pub fc_pp: i64,
    pub choke_loss: i64,
    pub fc_aim_pp: i64,
    pub fc_speed_pp: i64,
}

pub fn get_modded_stats(bmap: &Value, s: &Value) -> ModdedStats {
    let base_sr = bmap.get("difficulty_rating").and_then(|v| v.as_f64()).unwrap_or(4.0);
    let base_bpm = bmap.get("bpm").and_then(|v| v.as_f64()).unwrap_or(180.0);
    let base_ar = bmap.get("ar").and_then(|v| v.as_f64()).unwrap_or(9.0);
    let base_cs = bmap.get("cs").and_then(|v| v.as_f64()).unwrap_or(4.0);
    let base_od = bmap.get("od").and_then(|v| v.as_f64()).unwrap_or(8.0);
    let base_hp = bmap.get("hp").and_then(|v| v.as_f64()).unwrap_or(6.0);

    let mut has_dt = false;
    let mut has_ht = false;
    let mut has_hr = false;
    let mut has_ez = false;
    let mut has_hd = false;
    let mut has_fl = false;
    let mut mods_str_arr: Vec<String> = Vec::new();

    if let Some(mods_raw) = s.get("mods").and_then(|v| v.as_array()) {
        for m in mods_raw {
            let mut acronym = String::new();
            if let Some(str_val) = m.as_str() {
                acronym = str_val.to_uppercase();
            } else if let Some(ac) = m.get("acronym").and_then(|v| v.as_str()) {
                acronym = ac.to_uppercase();
            }

            if !acronym.is_empty() {
                mods_str_arr.push(acronym.clone());
                match acronym.as_str() {
                    "DT" | "NC" => has_dt = true,
                    "HT" | "DC" => has_ht = true,
                    "HR" => has_hr = true,
                    "EZ" => has_ez = true,
                    "HD" => has_hd = true,
                    "FL" => has_fl = true,
                    _ => {}
                }
            }
        }
    }

    let speed_mult = if has_dt { 1.5 } else if has_ht { 0.75 } else { 1.0 };
    let final_bpm = (base_bpm * speed_mult).round() as i32;

    let mut final_cs = base_cs;
    if has_hr {
        final_cs = 10.0f64.min(base_cs * 1.3);
    } else if has_ez {
        final_cs = base_cs * 0.5;
    }
    let cs_px = (54.4 - 4.48 * final_cs).round() as i32;

    let mut ar_val = base_ar;
    if has_hr {
        ar_val = 10.0f64.min(base_ar * 1.4);
    } else if has_ez {
        ar_val = base_ar * 0.5;
    }

    let mut ar_ms = if ar_val <= 5.0 {
        1800.0 - ar_val * 120.0
    } else {
        1200.0 - (ar_val - 5.0) * 150.0
    };
    ar_ms /= speed_mult;

    let mut final_ar = if ar_ms > 1200.0 {
        (1800.0 - ar_ms) / 120.0
    } else {
        5.0 + (1200.0 - ar_ms) / 150.0
    };
    final_ar = final_ar.clamp(0.0, 11.5);

    let mut od_val = base_od;
    if has_hr {
        od_val = 10.0f64.min(base_od * 1.4);
    } else if has_ez {
        od_val = base_od * 0.5;
    }

    let w300 = (80.0 - 6.0 * od_val) / speed_mult;
    let w100 = (140.0 - 8.0 * od_val) / speed_mult;
    let w50 = (200.0 - 10.0 * od_val) / speed_mult;
    let final_od = ((80.0 - w300) / 6.0).clamp(0.0, 11.5);

    let mut final_sr = base_sr;
    if has_dt { final_sr *= 1.38; }
    else if has_ht { final_sr *= 0.72; }
    if has_hr { final_sr *= 1.10; }
    else if has_ez { final_sr *= 0.88; }
    if has_fl { final_sr *= 1.15; }

    let mods_str = if mods_str_arr.is_empty() {
        "+NM".to_string()
    } else {
        format!("+{}", mods_str_arr.join(""))
    };

    ModdedStats {
        bpm: final_bpm,
        sr: final_sr,
        cs: final_cs,
        cs_px,
        ar: final_ar,
        ar_ms: ar_ms.round() as i32,
        od: final_od,
        w300: w300.round() as i32,
        w100: w100.round() as i32,
        w50: w50.round() as i32,
        hp: base_hp,
        speed_mult,
        mods_str,
        has_dt,
        has_ht,
        has_hr,
        has_ez,
        has_hd,
        has_fl,
    }
}

pub fn calculate_pp_breakdown(mstats: &ModdedStats, total_objects: i32, max_combo: i32, s: &Value) -> PpBreakdown {
    let sr = mstats.sr;
    let ar = mstats.ar;
    let od = mstats.od;

    let mut acc_pct = s.get("accuracy").and_then(|v| v.as_f64()).unwrap_or(1.0);
    if acc_pct <= 1.0 && acc_pct > 0.0 {
        acc_pct *= 100.0;
    }
    let acc = (acc_pct / 100.0).clamp(0.01, 1.0);

    let combo = s.get("max_combo").and_then(|v| v.as_i64()).unwrap_or(max_combo as i64) as i32;
    let actual_max_combo = if max_combo <= 0 { combo.max(1) } else { max_combo };

    let stats = s.get("statistics");
    let miss = stats.and_then(|st| st.get("miss")).and_then(|v| v.as_i64()).unwrap_or(0) as i32;
    let c100 = stats.and_then(|st| st.get("ok")).and_then(|v| v.as_i64()).unwrap_or(0) as i32;
    let c50 = stats.and_then(|st| st.get("meh")).and_then(|v| v.as_i64()).unwrap_or(0) as i32;
    let c300 = stats.and_then(|st| st.get("great")).and_then(|v| v.as_i64()).unwrap_or(0) as i32;

    let objs = if total_objects <= 0 { (c300 + c100 + c50 + miss).max(1) } else { total_objects };

    let compute_components = |target_combo: i32, target_miss: i32, target_acc: f64| -> (f64, f64, f64, f64, f64) {
        let target_c_ratio = ((target_combo as f64) / (actual_max_combo.max(1) as f64)).clamp(0.01, 1.0);
        let combo_bonus = target_c_ratio.powf(0.8);

        let mut len_bonus = 0.95 + 0.4 * 1.0f64.min((objs as f64) / 2000.0);
        if objs > 2000 {
            len_bonus += ((objs as f64) / 2000.0).ln() * 0.5;
        }

        let mut miss_penalty = 1.0;
        if target_miss > 0 {
            let m_ratio = 1.0f64.min((target_miss as f64) / (objs as f64));
            miss_penalty = 0.97 * (1.0 - m_ratio).powf(0.77);
        }

        let mut ar_factor = 0.0;
        if ar > 10.33 {
            ar_factor = 0.3 * (ar - 10.33);
        } else if ar < 8.0 {
            ar_factor = 0.05 * (8.0 - ar);
        }
        let ar_bonus = 1.0 + ar_factor * 1.0f64.min((objs as f64) / 1000.0);

        let mut hd_factor = 1.0;
        if mstats.has_hd {
            hd_factor = 1.0 + 0.04 * (12.0 - ar);
        }

        // Aim PP
        let aim_stars = sr * 0.52;
        let aim_val = (5.0 * 1.0f64.max(aim_stars / 0.0675) - 4.0).powi(3) / 100000.0;
        let aim_acc_mult = 0.5 + (target_acc / 2.0);
        let aim_pp = aim_val * len_bonus * combo_bonus * miss_penalty * ar_bonus * hd_factor * aim_acc_mult;

        // Speed PP
        let speed_stars = sr * 0.48;
        let speed_val = (5.0 * 1.0f64.max(speed_stars / 0.0675) - 4.0).powi(3) / 100000.0;
        let speed_acc_mult = 0.95 + target_acc.powf(12.0) * 0.05;
        let speed_pp = speed_val * len_bonus * combo_bonus * miss_penalty * ar_bonus * hd_factor * speed_acc_mult;

        // Acc PP
        let acc_val = (1.52163f64).powf(od) * target_acc.powf(24.0) * 2.83;
        let acc_len_bonus = 1.15f64.min(((objs as f64) / 1000.0).powf(0.3));
        let acc_hd_bonus = if mstats.has_hd { 1.08 } else { 1.0 };
        let acc_fl_bonus = if mstats.has_fl { 1.02 } else { 1.0 };
        let acc_pp = acc_val * acc_len_bonus * acc_hd_bonus * acc_fl_bonus;

        // Flashlight PP
        let mut fl_pp = 0.0;
        if mstats.has_fl {
            fl_pp = sr.powi(2) * 25.0 * combo_bonus * len_bonus * miss_penalty;
        }

        let mut mult = 1.12;
        if mstats.has_ez { mult *= 0.95; }
        if mstats.has_ht { mult *= 0.85; }

        let total_pp = (aim_pp.powf(1.1) + speed_pp.powf(1.1) + acc_pp.powf(1.1) + fl_pp.powf(1.1)).powf(1.0 / 1.1) * mult;
        (aim_pp, speed_pp, acc_pp, fl_pp, total_pp)
    };

    let (aim_pp, speed_pp, acc_pp, fl_pp, total_pp) = compute_components(combo, miss, acc);

    // If-FC calculation
    let mut fc_acc = acc;
    if miss > 0 {
        let total_hits = (c300 + c100 + c50 + miss).max(1);
        let new_c300 = c300 + miss;
        fc_acc = (((new_c300 * 300 + c100 * 100 + c50 * 50) as f64) / ((total_hits * 300) as f64)).clamp(0.5, 1.0);
    }
    let (fc_aim_pp, fc_speed_pp, _, _, fc_total_pp) = compute_components(actual_max_combo, 0, fc_acc);

    let choke_loss = 0.max((fc_total_pp.round() as i64) - (total_pp.round() as i64));

    PpBreakdown {
        pp: total_pp.round() as i64,
        aim_pp: aim_pp.round() as i64,
        speed_pp: speed_pp.round() as i64,
        acc_pp: acc_pp.round() as i64,
        fl_pp: fl_pp.round() as i64,
        fc_pp: fc_total_pp.round() as i64,
        choke_loss,
        fc_aim_pp: fc_aim_pp.round() as i64,
        fc_speed_pp: fc_speed_pp.round() as i64,
    }
}

pub fn calculate_dynamic_patterns(bpm: i32, sr: f64, mstats: &ModdedStats, slider_pct: f64, circle_pct: f64, density: f64) -> Vec<String> {
    let mut tags = Vec::new();

    if circle_pct >= 65.0 && bpm >= 180 && sr >= 5.0 && slider_pct <= 30.0 {
        tags.push("1-2 Jump Farm".to_string());
    } else if mstats.cs >= 5.0 {
        tags.push(format!("High-CS Micro-Aim ({:.1})", mstats.cs));
    } else if sr >= 6.2 && bpm >= 195 {
        tags.push("Cross-Screen Jumps".to_string());
    } else if slider_pct >= 42.0 {
        tags.push("Tech Sliders & Velocity".to_string());
    } else if circle_pct >= 55.0 && bpm >= 185 {
        tags.push("Wide-Angle Spaced Jumps".to_string());
    } else {
        tags.push("Hybrid Aim Geometry".to_string());
    }

    if bpm >= 240 {
        tags.push(format!("Extreme Speed ({} BPM)", bpm));
    } else if bpm >= 210 && circle_pct >= 60.0 {
        tags.push(format!("Deathstreams ({} BPM)", bpm));
    } else if bpm >= 185 && circle_pct >= 48.0 {
        tags.push(format!("Speed Bursts ({} BPM)", bpm));
    } else if slider_pct >= 35.0 && bpm <= 175 {
        tags.push("Finger Control & 1/3-1/6".to_string());
    } else if bpm >= 190 {
        tags.push(format!("Alt & High Tempo ({} BPM)", bpm));
    } else {
        tags.push(format!("Classical 1/4 Rhythmics ({} BPM)", bpm));
    }

    if mstats.has_hd {
        tags.push("Hidden Reading".to_string());
    }
    if mstats.ar >= 10.3 {
        tags.push(format!("High AR React ({:.1} / {}ms)", mstats.ar, mstats.ar_ms));
    } else if mstats.ar <= 8.5 && sr >= 4.5 {
        tags.push("Dense Low AR Reading".to_string());
    } else if mstats.has_hr {
        tags.push(format!("OD10 Precision (±{}ms)", mstats.w300));
    } else if mstats.has_ez {
        tags.push("EZ Stack Depth".to_string());
    }

    tags.push(format!("Плотность: {:.2} об/сек", density));
    tags
}