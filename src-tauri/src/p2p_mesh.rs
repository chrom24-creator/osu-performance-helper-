use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::net::{UdpSocket, SocketAddr};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use socket2::{Socket, Domain, Type, Protocol, SockAddr};

const P2P_PORT: u16 = 48291;
const P2P_SECRET_SALT: &str = "osu_coach_free_mesh_v2";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct P2PPacket {
    pub msg_type: String, // "presence", "score_share", "ping"
    pub client_id: String,
    pub user_name: String,
    pub user_id: String,
    pub client_type: String,
    pub activity: String,
    pub timestamp: u64,
    pub auth_token: String,
    pub payload: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct P2PPeerInfo {
    pub client_id: String,
    pub user_name: String,
    pub user_id: String,
    pub client_type: String,
    pub activity: String,
    pub last_seen: u64,
    pub is_p2p_verified: bool,
    pub avatar_url: String,
    pub latency_ms: u32,
}

pub fn compute_p2p_auth(user_id: &str, client_id: &str) -> String {
    let input = format!("{}:{}:{}", user_id, client_id, P2P_SECRET_SALT);
    let digest = md5::compute(input.as_bytes());
    format!("{:x}", digest)
}

#[derive(Clone)]
pub struct P2PMeshManager {
    pub socket: Option<Arc<UdpSocket>>,
    pub peers: Arc<Mutex<HashMap<String, P2PPeerInfo>>>,
    pub my_client_id: String,
}

static mut GLOBAL_P2P: Option<P2PMeshManager> = None;
static P2P_INIT: std::sync::Once = std::sync::Once::new();

pub fn get_p2p_manager() -> P2PMeshManager {
    unsafe {
        P2P_INIT.call_once(|| {
            let socket_addr: SocketAddr = format!("0.0.0.0:{}", P2P_PORT).parse().unwrap();
            
            // Setup UDP socket with SO_REUSEADDR for multi-instance support on the same PC
            let socket = match Socket::new(Domain::IPV4, Type::DGRAM, Some(Protocol::UDP)) {
                Ok(sock) => {
                    let _ = sock.set_reuse_address(true);
                    #[cfg(not(windows))]
                    let _ = sock.set_reuse_port(true);
                    
                    let _ = sock.set_broadcast(true);
                    
                    match sock.bind(&SockAddr::from(socket_addr)) {
                        Ok(_) => {
                            let std_sock: UdpSocket = sock.into();
                            Some(Arc::new(std_sock))
                        }
                        Err(_) => {
                            // Fallback to random port if bind fails
                            match Socket::new(Domain::IPV4, Type::DGRAM, Some(Protocol::UDP)) {
                                Ok(fallback_sock) => {
                                    let _ = fallback_sock.set_reuse_address(true);
                                    let _ = fallback_sock.set_broadcast(true);
                                    let fallback_addr: SocketAddr = "0.0.0.0:0".parse().unwrap();
                                    if fallback_sock.bind(&SockAddr::from(fallback_addr)).is_ok() {
                                        Some(Arc::new(fallback_sock.into()))
                                    } else {
                                        None
                                    }
                                }
                                Err(_) => None,
                            }
                        }
                    }
                }
                Err(_) => None,
            };

            let cid = format!("node_{:x}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis());

            let mgr = P2PMeshManager {
                socket,
                peers: Arc::new(Mutex::new(HashMap::new())),
                my_client_id: cid,
            };

            GLOBAL_P2P = Some(mgr.clone());

            // Start listening thread for genuine P2P mesh packets
            let peers_clone = mgr.peers.clone();
            let sock_clone = mgr.socket.clone();
            let my_cid = mgr.my_client_id.clone();
            
            if let Some(sock) = sock_clone {
                thread::spawn(move || {
                    let mut buf = [0u8; 4096];
                    loop {
                        // Blocking read is highly efficient and runs in background thread
                        if let Ok((len, _src)) = sock.recv_from(&mut buf) {
                            if len > 0 {
                                if let Ok(pkt) = serde_json::from_slice::<P2PPacket>(&buf[..len]) {
                                    if pkt.client_id != my_cid {
                                        let expected_auth = compute_p2p_auth(&pkt.user_id, &pkt.client_id);
                                        let is_valid = pkt.auth_token == expected_auth;
                                        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
                                        
                                        let mut map = peers_clone.lock().unwrap();
                                        map.insert(pkt.client_id.clone(), P2PPeerInfo {
                                            client_id: pkt.client_id,
                                            user_name: pkt.user_name,
                                            user_id: pkt.user_id.clone(),
                                            client_type: pkt.client_type,
                                            activity: pkt.activity,
                                            last_seen: now,
                                            is_p2p_verified: is_valid,
                                            avatar_url: format!("https://a.ppy.sh/{}", pkt.user_id),
                                            latency_ms: 15,
                                        });
                                    }
                                }
                            }
                        }
                    }
                });
            }
        });

        GLOBAL_P2P.as_ref().unwrap().clone()
    }
}

pub fn broadcast_my_p2p_presence(user_name: &str, user_id: &str, activity: &str) -> bool {
    let mgr = get_p2p_manager();
    if let Some(sock) = &mgr.socket {
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
        let auth = compute_p2p_auth(user_id, &mgr.my_client_id);

        let packet = P2PPacket {
            msg_type: "presence".to_string(),
            client_id: mgr.my_client_id.clone(),
            user_name: user_name.to_string(),
            user_id: user_id.to_string(),
            client_type: "osu! Coach (Tauri P2P)".to_string(),
            activity: activity.to_string(),
            timestamp: now,
            auth_token: auth,
            payload: None,
        };

        if let Ok(bytes) = serde_json::to_vec(&packet) {
            let _ = sock.send_to(&bytes, format!("255.255.255.255:{}", P2P_PORT));
            let _ = sock.send_to(&bytes, format!("127.0.0.1:{}", P2P_PORT));
            let _ = sock.send_to(&bytes, format!("224.0.0.1:{}", P2P_PORT)); // Multicast to all subnets
            return true;
        }
    }
    false
}

pub fn get_active_p2p_peers() -> Vec<P2PPeerInfo> {
    let mgr = get_p2p_manager();
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();

    let mut map = mgr.peers.lock().unwrap();
    // Prune stale peers not seen for 35s
    map.retain(|_, p| now.saturating_sub(p.last_seen) < 35);

    let mut list: Vec<P2PPeerInfo> = map.values().cloned().collect();
    list.sort_by(|a, b| b.last_seen.cmp(&a.last_seen));
    list
}
