use serde_json::Value;
use std::fs;
use std::path::Path;
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, USER_AGENT, AUTHORIZATION};

pub fn get_lazer_token() -> Option<String> {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let lazer_ini = Path::new(&appdata).join("osu/game.ini");
        if lazer_ini.exists() {
            if let Ok(txt) = fs::read_to_string(lazer_ini) {
                for line in txt.lines() {
                    let l = line.trim();
                    if l.starts_with("Token =") {
                        if let Some((_, v)) = l.split_once('=') {
                            let raw_token = v.trim().split('|').next().unwrap_or("");
                            if !raw_token.is_empty() {
                                return Some(raw_token.to_string());
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

pub async fn poll_latest_scores(user_id: &str) -> Vec<Value> {
    let clean_user = user_id.trim();
    if clean_user.is_empty() {
        return Vec::new();
    }

    let client = match reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(5))
        .build() {
            Ok(c) => c,
            Err(_) => return Vec::new(),
        };

    // 1. Try official osu! web endpoint (Public XMLHttpRequest - works for all users with username OR numeric ID without token!)
    let official_url = format!("https://osu.ppy.sh/users/{}/scores/recent?mode=osu&limit=25&include_fails=1", clean_user);
    if let Ok(resp) = client.get(&official_url)
        .header("x-requested-with", "XMLHttpRequest")
        .header("Accept", "application/json")
        .send().await {
        if resp.status().is_success() {
            if let Ok(json) = resp.json::<Vec<Value>>().await {
                if !json.is_empty() {
                    return json;
                }
            }
        }
    }

    // 2. Try official osu! v2 API with lazer token if available
    if let Some(token) = get_lazer_token() {
        let v2_url = format!("https://osu.ppy.sh/api/v2/users/{}/scores/recent?mode=osu&limit=25&include_fails=1", clean_user);
        let mut headers = HeaderMap::new();
        headers.insert(ACCEPT, HeaderValue::from_static("application/json"));
        headers.insert(USER_AGENT, HeaderValue::from_static("osu-lazer"));
        headers.insert("x-api-version", HeaderValue::from_static("20240130"));
        if let Ok(auth_val) = HeaderValue::from_str(&format!("Bearer {}", token)) {
            headers.insert(AUTHORIZATION, auth_val);
        }

        if let Ok(resp) = client.get(&v2_url).headers(headers).send().await {
            if resp.status().is_success() {
                if let Ok(json) = resp.json::<Vec<Value>>().await {
                    if !json.is_empty() {
                        return json;
                    }
                }
            }
        }
    }

    // 3. Fallback to Catboy mirror
    let mirror_url = "https://catboy.best/api/get_user_recent";
    if let Ok(resp) = client.get(mirror_url)
        .query(&[("u", clean_user), ("limit", "25")])
        .send().await {
        if resp.status().is_success() {
            if let Ok(json) = resp.json::<Vec<Value>>().await {
                if !json.is_empty() {
                    return json;
                }
            }
        }
    }

    Vec::new()
}
