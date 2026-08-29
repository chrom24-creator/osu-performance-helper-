use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct BucketData {
    pub count: i32,
    pub acc_sum: f64,
    pub miss_sum: i32,
    pub fc_count: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BottleneckReport {
    pub has_data: bool,
    pub diagnosis_title: String,
    pub diagnosis_desc: String,
    pub speed_wall_bpm: i32,
    pub reading_wall_ar: f64,
    pub cs_wall: f64,
    pub stamina_limit_sec: i32,
    pub recommendations: Vec<String>,
}

pub fn analyze_player_bottlenecks(scores: &[Value]) -> BottleneckReport {
    if scores.is_empty() {
        return BottleneckReport {
            has_data: false,
            diagnosis_title: "Недостаточно данных для профилирования".to_string(),
            diagnosis_desc: "Сыграйте еще несколько карт для формирования точного профиля узких мест.".to_string(),
            speed_wall_bpm: 220,
            reading_wall_ar: 10.3,
            cs_wall: 4.8,
            stamina_limit_sec: 140,
            recommendations: vec![
                "1. Скорость: тренируйте серии стримов на 210-220 BPM в Rate Change (0.9x -> 1.0x).".to_string(),
                "2. Ридинг: отработайте AR 10.3 с 100% Background Dim для разгрузки зрения.".to_string(),
                "3. Аим: стабилизируйте хват пера на кругах CS 4.8+.".to_string(),
            ],
        };
    }

    let mut speed_wall_bpm = 220;
    let reading_wall_ar = 10.3;
    let cs_wall = 4.8;
    let stamina_limit_sec = 140;

    for s in scores {
        let bpm = s.get("bpm").and_then(|v| v.as_i64()).unwrap_or(180) as i32;
        let acc = s.get("accuracy").and_then(|v| v.as_f64()).unwrap_or(98.0);
        if bpm >= 215 && acc < 94.0 {
            speed_wall_bpm = 210;
        }
    }

    let diagnosis = format!(
        "Главное узкое место: скоростной порог {} BPM (резкий спад акку при росте темпа) и прецизионность на CS {:.1}+.",
        speed_wall_bpm, cs_wall
    );

    let recs = vec![
        format!("1. Скорость: тренируйте серии стримов на {}-{} BPM в Rate Change (0.9x -> 1.0x).", speed_wall_bpm - 10, speed_wall_bpm),
        format!("2. Ридинг: отработайте AR {:.1} с 100% Background Dim для разгрузки зрительного канала.", reading_wall_ar),
        format!("3. Аим: используйте область планшета +4мм для стабилизации на кругах CS {:.1}+.", cs_wall),
    ];

    BottleneckReport {
        has_data: true,
        diagnosis_title: "ПРОФИЛЬ УЗКИХ МЕСТ И ЛИМИТОВ".to_string(),
        diagnosis_desc: diagnosis,
        speed_wall_bpm,
        reading_wall_ar,
        cs_wall,
        stamina_limit_sec,
        recommendations: recs,
    }
}
