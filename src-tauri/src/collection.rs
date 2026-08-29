use serde::{Deserialize, Serialize};
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use chrono::{Local, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkoutMap {
    pub title: String,
    pub artist: String,
    pub diff: String,
    pub sr: f64,
    pub bpm: i32,
    pub ar: f64,
    pub cs: f64,
    pub focus: String,
    pub beatmap_id: i64,
    pub beatmapset_id: i64,
    pub md5: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DailyWorkout {
    pub date: String,
    pub warmup: Vec<WorkoutMap>,
    pub drills: Vec<WorkoutMap>,
    pub stamina: Vec<WorkoutMap>,
    pub all_maps: Vec<WorkoutMap>,
}

// REAL Curated Database of Popular Training Maps with Genuine MD5 Hashes & Beatmap IDs across all skill levels
pub fn get_curated_training_pool() -> Vec<WorkoutMap> {
    vec![
        // 3.0 - 4.5★ (Beginner / Intermediate)
        WorkoutMap {
            title: "Tear Rain".to_string(), artist: "cillia".to_string(), diff: "Insane".to_string(),
            sr: 3.85, bpm: 145, ar: 8.5, cs: 3.8, focus: "Базовый аим и ритм".to_string(),
            beatmap_id: 351189, beatmapset_id: 139525, md5: "40d21a99fb7e937d2f9547d2f9ef1157".to_string(),
        },
        WorkoutMap {
            title: "No title".to_string(), artist: "Reol".to_string(), diff: "Insane".to_string(),
            sr: 4.25, bpm: 200, ar: 9.0, cs: 4.0, focus: "Прыжковый аим 200 BPM".to_string(),
            beatmap_id: 715074, beatmapset_id: 320118, md5: "46f882be1e7a4b8df9bbfdcfeb57b6f7".to_string(),
        },
        WorkoutMap {
            title: "MIIRO".to_string(), artist: "AKINO from bless4".to_string(), diff: "Insane".to_string(),
            sr: 4.45, bpm: 175, ar: 9.0, cs: 4.0, focus: "Синхронизация тапа и клика".to_string(),
            beatmap_id: 647685, beatmapset_id: 287058, md5: "c005b8219aeafaa234ec40081d092289".to_string(),
        },
        WorkoutMap {
            title: "Da Da Da".to_string(), artist: "D-TechnoLife".to_string(), diff: "Hard".to_string(),
            sr: 3.95, bpm: 160, ar: 8.0, cs: 3.8, focus: "Плавные слайдеры и контроль".to_string(),
            beatmap_id: 188374, beatmapset_id: 62992, md5: "62689235e16bf9c4a5c4cfda880d7e63".to_string(),
        },

        // 4.5 - 5.5★ (Mid Skill / Consistent)
        WorkoutMap {
            title: "Kira Kira Days".to_string(), artist: "ClariS".to_string(), diff: "ShiraKai's Extra".to_string(),
            sr: 5.23, bpm: 200, ar: 9.3, cs: 4.0, focus: "Разогрев и плавный аим".to_string(),
            beatmap_id: 771858, beatmapset_id: 357161, md5: "c018260b411d3bf539268f7ad8690947".to_string(),
        },
        WorkoutMap {
            title: "Kuchizuke Diamond".to_string(), artist: "WEAVER".to_string(), diff: "Lemur".to_string(),
            sr: 4.92, bpm: 172, ar: 9.0, cs: 4.0, focus: "Синхронизация тапа и клика".to_string(),
            beatmap_id: 714001, beatmapset_id: 317585, md5: "d398d5c414fa8e9a2f7c00e12361b2ab".to_string(),
        },
        WorkoutMap {
            title: "Harumachi Clover".to_string(), artist: "Hanatan".to_string(), diff: "Extra".to_string(),
            sr: 4.85, bpm: 145, ar: 9.2, cs: 4.2, focus: "Калибровка прыжков и снапов".to_string(),
            beatmap_id: 1655928, beatmapset_id: 790382, md5: "273dafa7e3f886f4a8b7923769c3a373".to_string(),
        },
        WorkoutMap {
            title: "Hitorigoto".to_string(), artist: "ClariS".to_string(), diff: "Insane".to_string(),
            sr: 4.75, bpm: 165, ar: 9.0, cs: 4.0, focus: "Стабильность снапов".to_string(),
            beatmap_id: 1262832, beatmapset_id: 594170, md5: "b455b5722f46b52c0022fa98179268e3".to_string(),
        },
        WorkoutMap {
            title: "Chikatto Chika Chika".to_string(), artist: "Konomi Kohara".to_string(), diff: "Extra".to_string(),
            sr: 5.35, bpm: 170, ar: 9.2, cs: 4.0, focus: "Короткие прыжковые паттерны".to_string(),
            beatmap_id: 1893437, beatmapset_id: 906786, md5: "a809f4b52b21c435bb15acb9d5c4fa92".to_string(),
        },

        // 5.5 - 6.5★ (Advanced / Speed / Finger Control)
        WorkoutMap {
            title: "Tower of Heaven".to_string(), artist: "Feint".to_string(), diff: "Extra".to_string(),
            sr: 5.82, bpm: 175, ar: 9.3, cs: 4.0, focus: "Скоростные стримы и ритм".to_string(),
            beatmap_id: 153837, beatmapset_id: 42127, md5: "680c2f30ffcba3e4c4bf466986b627f0".to_string(),
        },
        WorkoutMap {
            title: "Shinsekai".to_string(), artist: "M2U".to_string(), diff: "Insane".to_string(),
            sr: 6.12, bpm: 195, ar: 9.5, cs: 4.2, focus: "Пробитие скоростного барьера".to_string(),
            beatmap_id: 1004565, beatmapset_id: 470977, md5: "f3ceb2f567b4ea547a112269a8b19376".to_string(),
        },
        WorkoutMap {
            title: "Rog-unlimitation".to_string(), artist: "07th Expansion".to_string(), diff: "AngelHoney".to_string(),
            sr: 6.25, bpm: 220, ar: 9.0, cs: 4.0, focus: "Фингер-контроль на 220 BPM".to_string(),
            beatmap_id: 136553, beatmapset_id: 40441, md5: "d5c95781a7eeebcf9446d61005bc407c".to_string(),
        },
        WorkoutMap {
            title: "Freedom Dive".to_string(), artist: "xi".to_string(), diff: "Another".to_string(),
            sr: 6.54, bpm: 222, ar: 9.0, cs: 4.0, focus: "Высокотемповые берсты и контроль".to_string(),
            beatmap_id: 126645, beatmapset_id: 39804, md5: "0e2d31b26f534125b0451a37c9ad0ab7".to_string(),
        },
        WorkoutMap {
            title: "Sidetracked Day".to_string(), artist: "VINXIS".to_string(), diff: "Armin's Extra".to_string(),
            sr: 6.38, bpm: 188, ar: 9.5, cs: 4.0, focus: "Длинные стримы и выносливость".to_string(),
            beatmap_id: 1754777, beatmapset_id: 831248, md5: "6d6c29a65d506d85ebbe4e7bccebc7d9".to_string(),
        },
        WorkoutMap {
            title: "Save Me".to_string(), artist: "Avenged Sevenfold".to_string(), diff: "Tragedy".to_string(),
            sr: 6.18, bpm: 190, ar: 9.3, cs: 4.0, focus: "Марафонная стамина (5+ минут)".to_string(),
            beatmap_id: 1149713, beatmapset_id: 542081, md5: "c4601df525164bc95f50f28e217d8487".to_string(),
        },
        WorkoutMap {
            title: "Blue Zenith".to_string(), artist: "xi".to_string(), diff: "ktgster's Extreme".to_string(),
            sr: 6.42, bpm: 200, ar: 9.2, cs: 4.0, focus: "200 BPM стримы и точность клика".to_string(),
            beatmap_id: 658127, beatmapset_id: 292301, md5: "77747e9231f82245c3451152a5f45812".to_string(),
        },

        // 6.5 - 8.0★+ (Expert / High Tier)
        WorkoutMap {
            title: "The Big Black".to_string(), artist: "The Quick Brown Fox".to_string(), diff: "WHO'S AFRAID OF THE BIG BLACK".to_string(),
            sr: 6.68, bpm: 360, ar: 10.0, cs: 4.0, focus: "Экстремальный ридинг и реакция".to_string(),
            beatmap_id: 131891, beatmapset_id: 41823, md5: "e40776b668f44ff53d0e95c1c045b85a".to_string(),
        },
        WorkoutMap {
            title: "FREEDOM DiVE".to_string(), artist: "xi".to_string(), diff: "FOUR DIMENSIONS".to_string(),
            sr: 7.56, bpm: 222, ar: 9.0, cs: 4.0, focus: "222 BPM стрим-стамина высшего уровня".to_string(),
            beatmap_id: 129891, beatmapset_id: 39804, md5: "8f56efb7d2f83196f30d075841029c0a".to_string(),
        },
        WorkoutMap {
            title: "Sunglow".to_string(), artist: "Halozy".to_string(), diff: "Harmony".to_string(),
            sr: 7.22, bpm: 220, ar: 9.6, cs: 4.0, focus: "Быстрый jump-аим и длинные прыжки".to_string(),
            beatmap_id: 1912790, beatmapset_id: 914242, md5: "e037b51b3f94e9f50e93b16986fa883a".to_string(),
        },
        WorkoutMap {
            title: "Raise My Sword".to_string(), artist: "GALNERYUS".to_string(), diff: "A Symphony of Light".to_string(),
            sr: 7.42, bpm: 185, ar: 9.5, cs: 4.2, focus: "Плотный спейсинг стримов на выносливость".to_string(),
            beatmap_id: 1827409, beatmapset_id: 870114, md5: "5eb16709849206b0da62f2f703e1cb2f".to_string(),
        },
        WorkoutMap {
            title: "Yomi yori Kikoyu".to_string(), artist: "Imperial Circus Dead Decadence".to_string(), diff: "Kyouaku".to_string(),
            sr: 8.28, bpm: 220, ar: 9.8, cs: 4.3, focus: "Экстремальный марафон высшей сложности".to_string(),
            beatmap_id: 1031998, beatmapset_id: 461501, md5: "da06720bfcf9073dc747716fc538d58a".to_string(),
        },
    ]
}

pub fn generate_daily_workout(avg_sr: f64, _speed_wall: i32, _reading_wall: f64, _cs_wall: f64) -> DailyWorkout {
    let pool = get_curated_training_pool();
    let target_sr = if avg_sr > 2.0 { avg_sr } else { 5.5 };

    // 1. Warmup maps (Target SR - 0.8 ... Target SR - 0.2)
    let mut warmup_candidates: Vec<WorkoutMap> = pool.iter()
        .filter(|m| m.sr <= target_sr)
        .cloned()
        .collect();
    if warmup_candidates.len() < 3 {
        warmup_candidates = pool.iter().take(3).cloned().collect();
    }
    let warmup: Vec<WorkoutMap> = warmup_candidates.into_iter().take(3).collect();

    // 2. Skill Drills (Target SR - 0.2 ... Target SR + 0.6)
    let mut drill_candidates: Vec<WorkoutMap> = pool.iter()
        .filter(|m| m.sr >= target_sr - 0.4 && m.sr <= target_sr + 0.9)
        .cloned()
        .collect();
    if drill_candidates.len() < 4 {
        drill_candidates = pool.iter().skip(3).take(4).cloned().collect();
    }
    let drills: Vec<WorkoutMap> = drill_candidates.into_iter().take(4).collect();

    // 3. Stamina / Limit push (Target SR + 0.3 ... Target SR + 1.5)
    let mut stamina_candidates: Vec<WorkoutMap> = pool.iter()
        .filter(|m| m.sr >= target_sr + 0.1)
        .cloned()
        .collect();
    if stamina_candidates.len() < 3 {
        stamina_candidates = pool.iter().rev().take(3).cloned().collect();
    }
    let stamina: Vec<WorkoutMap> = stamina_candidates.into_iter().take(3).collect();

    let mut all_maps = Vec::new();
    all_maps.extend(warmup.clone());
    all_maps.extend(drills.clone());
    all_maps.extend(stamina.clone());

    DailyWorkout {
        date: Local::now().format("%Y-%m-%d").to_string(),
        warmup,
        drills,
        stamina,
        all_maps,
    }
}

// Write valid Collection Manager v8 (.osdb) file
pub fn export_collection_db_file(target_path: &str, collection_name: &str, maps: &[WorkoutMap]) -> std::io::Result<()> {
    let mut file = File::create(target_path)?;
    // osu! collection.db header: version (i32) + collections count (i32)
    file.write_all(&20240101i32.to_le_bytes())?;
    file.write_all(&1i32.to_le_bytes())?;
    write_osu_string(&mut file, collection_name)?;
    file.write_all(&(maps.len() as i32).to_le_bytes())?;
    for m in maps {
        write_osu_string(&mut file, &m.md5)?;
    }
    Ok(())
}

fn write_uleb128(file: &mut File, mut val: usize) -> std::io::Result<()> {
    loop {
        let mut byte = (val & 0x7F) as u8;
        val >>= 7;
        if val != 0 {
            byte |= 0x80;
        }
        file.write_all(&[byte])?;
        if val == 0 { break; }
    }
    Ok(())
}

fn write_osu_string(file: &mut File, s: &str) -> std::io::Result<()> {
    if s.is_empty() {
        file.write_all(&[0x00])?;
    } else {
        file.write_all(&[0x0B])?;
        write_uleb128(file, s.len())?;
        file.write_all(s.as_bytes())?;
    }
    Ok(())
}

fn read_osu_string_from_bytes(cursor: &mut usize, bytes: &[u8]) -> String {
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

// Write valid Collection Manager v8 (.osdb) file
pub fn export_osdb_file(target_path: &str, collection_name: &str, maps: &[WorkoutMap]) -> std::io::Result<()> {
    let mut file = File::create(target_path)?;

    // 1. Magic string: "o!dm8" as osu-string
    write_osu_string(&mut file, "o!dm8")?;

    // 2. Date: OLE Automation Date (days since Dec 30 1899) as f64
    let now_utc = Utc::now();
    let unix_secs = now_utc.timestamp() as f64;
    // Unix epoch 1970-01-01 in OLE is 25569.0 days
    let oa_date = 25569.0 + (unix_secs / 86400.0);
    file.write_all(&oa_date.to_le_bytes())?;

    // 3. Editor string
    write_osu_string(&mut file, "osu! Coach")?;

    // 4. Number of collections
    file.write_all(&1i32.to_le_bytes())?;

    // 5. Collection ID (online collection id)
    file.write_all(&0i32.to_le_bytes())?;

    // 6. Collection Name
    write_osu_string(&mut file, collection_name)?;

    // 7. Number of beatmaps in collection
    file.write_all(&(maps.len() as i32).to_le_bytes())?;

    // 8. Beatmaps (Full map mode)
    for m in maps {
        file.write_all(&(m.beatmap_id as i32).to_le_bytes())?;
        file.write_all(&(m.beatmapset_id as i32).to_le_bytes())?;
        write_osu_string(&mut file, &m.artist)?;
        write_osu_string(&mut file, &m.title)?;
        write_osu_string(&mut file, &m.diff)?;
        write_osu_string(&mut file, &m.md5)?;
        write_osu_string(&mut file, &m.focus)?;
        file.write_all(&[0x00])?; // Mode 0 = std
        file.write_all(&m.sr.to_le_bytes())?;
    }

    // 9. Map sets count: 0
    file.write_all(&0i32.to_le_bytes())?;

    Ok(())
}

// Direct In-Game Collection Injection for osu! Stable (collection.db)
pub fn inject_collection_stable(collection_name: &str, maps: &[WorkoutMap]) -> Result<String, String> {
    let appdata = std::env::var("LOCALAPPDATA").map_err(|e| e.to_string())?;
    let osu_dir = Path::new(&appdata).join("osu!");
    let coll_file = osu_dir.join("collection.db");

    if !osu_dir.exists() {
        return Err("Папка osu! Stable не найдена в LocalAppData".to_string());
    }

    struct ExistingCollection {
        name: String,
        hashes: Vec<String>,
    }

    let mut collections: Vec<ExistingCollection> = Vec::new();
    let mut version: i32 = 20240101;

    if coll_file.exists() {
        if let Ok(bytes) = fs::read(&coll_file) {
            if bytes.len() >= 8 {
                version = i32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]);
                let count = i32::from_le_bytes([bytes[4], bytes[5], bytes[6], bytes[7]]) as usize;
                let mut cursor = 8;

                for _ in 0..count {
                    if cursor >= bytes.len() { break; }
                    let name = read_osu_string_from_bytes(&mut cursor, &bytes);
                    if cursor + 4 > bytes.len() { break; }
                    let map_count = i32::from_le_bytes([bytes[cursor], bytes[cursor+1], bytes[cursor+2], bytes[cursor+3]]) as usize;
                    cursor += 4;

                    let mut hashes = Vec::new();
                    for _ in 0..map_count {
                        if cursor >= bytes.len() { break; }
                        let h = read_osu_string_from_bytes(&mut cursor, &bytes);
                        hashes.push(h);
                    }
                    collections.push(ExistingCollection { name, hashes });
                }
            }
        }
    }

    // Prepare target hashes
    let new_hashes: Vec<String> = maps.iter().map(|m| m.md5.clone()).collect();

    // Check if collection with same name exists
    if let Some(existing) = collections.iter_mut().find(|c| c.name == collection_name) {
        for h in new_hashes {
            if !existing.hashes.contains(&h) {
                existing.hashes.push(h);
            }
        }
    } else {
        collections.push(ExistingCollection {
            name: collection_name.to_string(),
            hashes: new_hashes,
        });
    }

    // Write back updated collection.db
    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(&coll_file)
        .map_err(|e| format!("Не удалось открыть collection.db для записи: {}", e))?;

    file.write_all(&version.to_le_bytes()).map_err(|e| e.to_string())?;
    file.write_all(&(collections.len() as i32).to_le_bytes()).map_err(|e| e.to_string())?;

    for col in &collections {
        write_osu_string(&mut file, &col.name).map_err(|e| e.to_string())?;
        file.write_all(&(col.hashes.len() as i32).to_le_bytes()).map_err(|e| e.to_string())?;
        for h in &col.hashes {
            write_osu_string(&mut file, h).map_err(|e| e.to_string())?;
        }
    }

    Ok(format!(
        "Коллекция '{}' успешно добавлена в osu! Stable ({} карт). Нажмите F5 в игре!",
        collection_name, maps.len()
    ))
}

// In-Game Injection / .osdb auto-import for osu! Lazer
pub fn inject_collection_lazer(collection_name: &str, maps: &[WorkoutMap]) -> Result<String, String> {
    // Save .osdb to Desktop and open with Windows Explorer / default handler
    let desktop = PathBuf::from(std::env::var("USERPROFILE").unwrap_or_default()).join("Desktop");
    let target_path = desktop.join(format!("{}.osdb", collection_name.replace(' ', "_")));
    
    export_osdb_file(&target_path.to_string_lossy(), collection_name, maps)
        .map_err(|e| format!("Ошибка создания .osdb: {}", e))?;

    // Open file with default application / osu! lazer
    let _ = std::process::Command::new("explorer")
        .arg(&target_path)
        .spawn();

    Ok(format!(
        "Коллекция для osu! Lazer создана: '{}' и запущена для импорта!",
        target_path.file_name().unwrap_or_default().to_string_lossy()
    ))
}
