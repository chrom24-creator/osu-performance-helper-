export function getUserRoleBadge(username: string): { title: string; color: string; badgeClass: string } | null {
  const u = (username || "").trim().toUpperCase();
  if (u === "CHROM24") {
    return { title: "Создатель", color: "#f43f5e", badgeClass: "role-badge creator" };
  }
  if (u === "IMKICKEDHAEVEN" || u === "IMKICKEDHEAVEN") {
    return { title: "Сооснователь", color: "#a855f7", badgeClass: "role-badge cofounder" };
  }
  return null;
}

export interface P2PPeer {
  client_id: string;
  user_name: string;
  user_id: string;
  client_type: string;
  activity: string;
  sr?: number;
  acc?: number;
  grade?: string;
  combo?: number;
  last_seen: number;
  is_p2p_verified: boolean;
  avatar_url: string;
  latency_ms: number;
}

const WS_ENDPOINTS = [
  "wss://broker.emqx.io:8084/mqtt",
  "wss://broker.hivemq.com:8884/mqtt",
  "wss://test.mosquitto.org:8081/mqtt",
  "wss://public.mqtthq.com:8084/mqtt",
  "ws://broker.emqx.io:8083/mqtt",
  "ws://broker.hivemq.com:8000/mqtt"
];

const P2P_SECRET = "osu_coach_free_mesh_v2";

// Tiny pure JS MD5 implementation for authentication
function md5(string: string): string {
  function rotateLeft(lValue: number, iShiftBits: number) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function addUnsigned(lX: number, lY: number) {
    const lX8 = lX & 0x80000000;
    const lY8 = lY & 0x80000000;
    const lX4 = lX & 0x40000000;
    const lY4 = lY & 0x40000000;
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      else return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    } else return lResult ^ lX8 ^ lY8;
  }
  function F(x: number, y: number, z: number) { return (x & y) | (~x & z); }
  function G(x: number, y: number, z: number) { return (x & z) | (y & ~z); }
  function H(x: number, y: number, z: number) { return x ^ y ^ z; }
  function I(x: number, y: number, z: number) { return y ^ (x | ~z); }

  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function convertToWordArray(str: string) {
    let lWordCount;
    const lMessageLength = str.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    const lWordArray = Array(lNumberOfWords - 1);
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }

  function wordToHex(lValue: number) {
    let WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValue_temp = "0" + lByte.toString(16);
      WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
    }
    return WordToHexValue;
  }

  const x = convertToWordArray(string);
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = FF(a, b, c, d, x[k + 0], 7, 0xd76aa478);
    d = FF(d, a, b, c, x[k + 1], 12, 0xe8c7b756);
    c = FF(c, d, a, b, x[k + 2], 17, 0x242070db);
    b = FF(b, c, d, a, x[k + 3], 22, 0xc1bdceee);
    a = FF(a, b, c, d, x[k + 4], 7, 0xf57c0faf);
    d = FF(d, a, b, c, x[k + 5], 12, 0x4787c62a);
    c = FF(c, d, a, b, x[k + 6], 17, 0xa8304613);
    b = FF(b, c, d, a, x[k + 7], 22, 0xfd469501);
    a = FF(a, b, c, d, x[k + 8], 7, 0x698098d8);
    d = FF(d, a, b, c, x[k + 9], 12, 0x8b44f7af);
    c = FF(c, d, a, b, x[k + 10], 17, 0xffff5bb1);
    b = FF(b, c, d, a, x[k + 11], 22, 0x895cd7be);
    a = FF(a, b, c, d, x[k + 12], 7, 0x6b901122);
    d = FF(d, a, b, c, x[k + 13], 12, 0xfd987193);
    c = FF(c, d, a, b, x[k + 14], 17, 0xa679438e);
    b = FF(b, c, d, a, x[k + 15], 22, 0x49b40821);

    a = GG(a, b, c, d, x[k + 1], 5, 0xf61e2562);
    d = GG(d, a, b, c, x[k + 6], 9, 0xc040b340);
    c = GG(c, d, a, b, x[k + 11], 14, 0x265e5a51);
    b = GG(b, c, d, a, x[k + 0], 20, 0xe9b6c7aa);
    a = GG(a, b, c, d, x[k + 5], 5, 0xd62f105d);
    d = GG(d, a, b, c, x[k + 10], 9, 0x2441453);
    c = GG(c, d, a, b, x[k + 15], 14, 0xd8a1e681);
    b = GG(b, c, d, a, x[k + 4], 20, 0xe7d3fbc8);
    a = GG(a, b, c, d, x[k + 9], 5, 0x21e1cde6);
    d = GG(d, a, b, c, x[k + 14], 9, 0xc33707d6);
    c = GG(c, d, a, b, x[k + 3], 14, 0xf4d50d87);
    b = GG(b, c, d, a, x[k + 8], 20, 0x455a14ed);
    a = GG(a, b, c, d, x[k + 13], 5, 0xa9e3e905);
    d = GG(d, a, b, c, x[k + 2], 9, 0xfcefa3f8);
    c = GG(c, d, a, b, x[k + 7], 14, 0x676f02d9);
    b = GG(b, c, d, a, x[k + 12], 20, 0x8d2a4c8a);

    a = HH(a, b, c, d, x[k + 5], 4, 0xfffa3942);
    d = HH(d, a, b, c, x[k + 8], 11, 0x8771f681);
    c = HH(c, d, a, b, x[k + 11], 16, 0x6d9d6122);
    b = HH(b, c, d, a, x[k + 14], 23, 0xfde5380c);
    a = HH(a, b, c, d, x[k + 1], 4, 0xa4beea44);
    d = HH(d, a, b, c, x[k + 4], 11, 0x4bdecfa9);
    c = HH(c, d, a, b, x[k + 7], 16, 0xf6bb4b60);
    b = HH(b, c, d, a, x[k + 10], 23, 0xbebfbc70);
    a = HH(a, b, c, d, x[k + 13], 4, 0x289b7ec6);
    d = HH(d, a, b, c, x[k + 0], 11, 0xeaa127fa);
    c = HH(c, d, a, b, x[k + 3], 16, 0xd4ef3085);
    b = HH(b, c, d, a, x[k + 6], 23, 0x4881d05);
    a = HH(a, b, c, d, x[k + 9], 4, 0xd9d4d039);
    d = HH(d, a, b, c, x[k + 12], 11, 0xe6db99e5);
    c = HH(c, d, a, b, x[k + 15], 16, 0x1fa27cf8);
    b = HH(b, c, d, a, x[k + 2], 23, 0xc4ac5665);

    a = II(a, b, c, d, x[k + 0], 6, 0xf4292244);
    d = II(d, a, b, c, x[k + 7], 10, 0x432aff97);
    c = II(c, d, a, b, x[k + 14], 15, 0xab9423a7);
    b = II(b, c, d, a, x[k + 5], 21, 0xfc93a039);
    a = II(a, b, c, d, x[k + 12], 6, 0x655b59c3);
    d = II(d, a, b, c, x[k + 3], 10, 0x8f0ccc92);
    c = II(c, d, a, b, x[k + 10], 15, 0xffeff47d);
    b = II(b, c, d, a, x[k + 1], 21, 0x85845dd1);
    a = II(a, b, c, d, x[k + 8], 6, 0x6fa87e4f);
    d = II(d, a, b, c, x[k + 15], 10, 0xfe2ce6e0);
    c = II(c, d, a, b, x[k + 6], 15, 0xa3014314);
    b = II(b, c, d, a, x[k + 13], 21, 0x4e0811a1);
    a = II(a, b, c, d, x[k + 4], 6, 0xf7537e82);
    d = II(d, a, b, c, x[k + 11], 10, 0xbd3af235);
    c = II(c, d, a, b, x[k + 2], 15, 0x2ad7d2bb);
    b = II(b, c, d, a, x[k + 9], 21, 0xeb86d391);

    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }

  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

export class P2PMeshClient {
  private ws: WebSocket | null = null;
  private endpointIdx = 0;
  private clientId = `osu_helper_${Math.floor(Math.random() * 1000000)}`;
  private userName = "Player";
  private userId = "";
  private clientType = "osu!lazer";
  private peers: Map<string, P2PPeer> = new Map();
  private peerMsgTimestamps: Map<string, number> = new Map();
  private isConnected = false;
  private reconnectTimeout: any = null;
  private heartbeatInterval: any = null;
  private pingInterval: any = null;
  public onPeersUpdated: ((peers: P2PPeer[]) => void) | null = null;
  public onAdminAlert: ((author: string, text: string, alertType: string) => void) | null = null;
  public onPeerSessionScores: ((peerId: string, peerName: string, scores: any[]) => void) | null = null;
  private currentSessionScores: any[] = [];

  constructor(
    onPeersUpdated?: (peers: P2PPeer[]) => void,
    onAdminAlert?: (author: string, text: string, alertType: string) => void,
    onPeerSessionScores?: (peerId: string, peerName: string, scores: any[]) => void
  ) {
    if (onPeersUpdated) this.onPeersUpdated = onPeersUpdated;
    if (onAdminAlert) this.onAdminAlert = onAdminAlert;
    if (onPeerSessionScores) this.onPeerSessionScores = onPeerSessionScores;
    this.connect();
  }

  public setSessionScores(scores: any[]) {
    this.currentSessionScores = scores || [];
  }

  public broadcastSessionScores(scores?: any[]) {
    const list = scores || this.currentSessionScores;
    if (!this.userId || !list) return;
    this.publish("osuhub/v2/session_scores", {
      type: "session_scores_broadcast",
      sender_id: this.userId,
      client_id: this.clientId,
      name: this.userName,
      scores: list.slice(0, 40),
      timestamp: Date.now(),
    });
  }

  public requestPeerScores(targetPeerId: string, targetPeerName: string) {
    if (!this.userId) return;
    this.publish("osuhub/v2/scores_req", {
      type: "request_scores",
      requester_id: this.userId,
      requester_cid: this.clientId,
      requester_name: this.userName,
      target_id: targetPeerId,
      target_name: targetPeerName,
      timestamp: Date.now(),
    });
  }

  public broadcastAdminAlert(message: string, alertType = "broadcast") {
    this.publish("osuhub/v2/feed", {
      type: "admin_alert",
      author: this.userName,
      text: message,
      alert_type: alertType,
      timestamp: Date.now(),
    });
  }

  public broadcastNudge(targetUser: string) {
    this.publish("osuhub/v2/feed", {
      type: "admin_alert",
      author: this.userName,
      text: `Создатель ${this.userName} передает вам привет в P2P-сети!`,
      target_user: targetUser,
      alert_type: "nudge",
      timestamp: Date.now(),
    });
  }

  public setUser(userName: string, userId: string, clientType = "osu!lazer") {
    this.userName = userName;
    this.userId = userId;
    this.clientType = clientType;
    if (this.isConnected) {
      this.broadcastPresence("В сети: готов к тренировкам");
    }
  }

  public getPeers(): P2PPeer[] {
    const now = Date.now() / 1000;
    // Robust 120s grace period to completely prevent flickering
    for (const [id, peer] of this.peers.entries()) {
      if (now - peer.last_seen > 120) {
        this.peers.delete(id);
        this.peerMsgTimestamps.delete(id);
      }
    }
    return Array.from(this.peers.values());
  }

  private pendingQueue: { topic: string; data: any }[] = [];

  private connect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }

    this.isConnected = false;
    const url = WS_ENDPOINTS[this.endpointIdx % WS_ENDPOINTS.length];

    try {
      this.ws = new WebSocket(url, ["mqtt"]);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => {
        this.isConnected = true;
        this.sendMqttConnect();
      };

      this.ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          this.processMqttPacket(new Uint8Array(event.data));
        }
      };

      this.ws.onclose = () => {
        this.handleDisconnect();
      };

      this.ws.onerror = () => {
        this.handleDisconnect();
      };
    } catch (e) {
      this.handleDisconnect();
    }
  }

  private handleDisconnect() {
    this.isConnected = false;
    this.stopHeartbeat();
    if (!this.reconnectTimeout) {
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.endpointIdx++;
        this.connect();
      }, 3000);
    }
  }

  private encodeRemLen(len: number): number[] {
    const bytes: number[] = [];
    let val = len;
    do {
      let b = val % 128;
      val = Math.floor(val / 128);
      if (val > 0) b = b | 0x80;
      bytes.push(b);
    } while (val > 0);
    return bytes;
  }

  private sendMqttConnect() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const cidBytes = new TextEncoder().encode(this.clientId);
    const protoBytes = new TextEncoder().encode("MQTT");
    const varHeader = [0, 4, ...protoBytes, 4, 2, 0, 60];
    const payload = [0, cidBytes.length, ...cidBytes];

    const remLen = this.encodeRemLen(varHeader.length + payload.length);
    const packet = new Uint8Array([0x10, ...remLen, ...varHeader, ...payload]);
    this.ws.send(packet.buffer);
  }

  private subscribe(topic: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const tBytes = new TextEncoder().encode(topic);
    const subVar = [0, 1];
    const subPay = [0, tBytes.length, ...tBytes, 0];

    const remLen = this.encodeRemLen(subVar.length + subPay.length);
    const packet = new Uint8Array([0x82, ...remLen, ...subVar, ...subPay]);
    this.ws.send(packet.buffer);
  }

  private publish(topic: string, data: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.pendingQueue.push({ topic, data });
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.connect();
      }
      return;
    }
    data.auth_token = md5(`${this.userId}:${this.clientId}:${P2P_SECRET}`);
    const tBytes = new TextEncoder().encode(topic);
    const msgBytes = new TextEncoder().encode(JSON.stringify(data));

    const pubVar = [0, tBytes.length, ...tBytes];
    const remLen = this.encodeRemLen(pubVar.length + msgBytes.length);
    const packet = new Uint8Array([0x30, ...remLen, ...pubVar, ...msgBytes]);
    this.ws.send(packet.buffer);
  }

  public broadcastPresence(activity = "В сети: готов к тренировкам", sr = 0, acc = 0, grade = "S", combo = 0) {
    if (!this.userId) return;
    const avatar = `https://a.ppy.sh/${this.userId}`;
    this.publish("osuhub/v2/presence", {
      type: "presence",
      sender_id: this.userId,
      client_id: this.clientId,
      name: this.userName,
      client: this.clientType,
      avatar_url: avatar,
      activity,
      sr,
      acc,
      grade,
      combo,
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    // 1-second watchdog & keepalive presence broadcast as requested
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.userId) {
        this.broadcastPresence();
      }
    }, 1000);

    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(new Uint8Array([0xc0, 0x00]).buffer); // PINGREQ
      }
    }, 3000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.heartbeatInterval = null;
    this.pingInterval = null;
  }

  private processMqttPacket(pkt: Uint8Array) {
    if (pkt.length === 0) return;
    const ptype = pkt[0] >> 4;

    if (ptype === 2) {
      // CONNACK
      this.subscribe("osuhub/v2/presence");
      this.subscribe("osuhub/v2/feed");
      this.subscribe("osuhub/v2/session_scores");
      this.subscribe("osuhub/v2/scores_req");
      this.startHeartbeat();
      this.broadcastPresence();

      // Flush queued messages
      while (this.pendingQueue.length > 0) {
        const item = this.pendingQueue.shift();
        if (item) this.publish(item.topic, item.data);
      }
    } else if (ptype === 3) {
      // PUBLISH
      let offset = 1;
      while ((pkt[offset] & 0x80) !== 0 && offset < pkt.length) {
        offset++;
      }
      offset++;
      if (offset + 2 > pkt.length) return;
      const tlen = (pkt[offset] << 8) | pkt[offset + 1];
      offset += 2;
      if (offset + tlen > pkt.length) return;
      const topic = new TextDecoder().decode(pkt.subarray(offset, offset + tlen));
      offset += tlen;
      const payloadStr = new TextDecoder().decode(pkt.subarray(offset));

      try {
        const data = JSON.parse(payloadStr);
        this.handleMessage(topic, data);
      } catch (e) {}
    }
  }

  private handleMessage(topic: string, data: any) {
    const senderId = String(data.sender_id || "");
    const senderCid = String(data.client_id || "");

    // Ignore self packets
    if (
      (senderCid && senderCid === this.clientId) ||
      (this.userId && senderId && senderId === this.userId) ||
      (this.userName && data.name && String(data.name).trim().toLowerCase() === this.userName.trim().toLowerCase())
    ) {
      return;
    }

    const now = Date.now() / 1000;
    const lastMsg = this.peerMsgTimestamps.get(senderId || senderCid) || 0;
    if (now - lastMsg < 0.05) return;
    this.peerMsgTimestamps.set(senderId || senderCid, now);

    if (topic === "osuhub/v2/presence") {
      const peerName = String(data.name || "Player").trim();
      const peerId = senderId || senderCid || peerName;
      let peerAvatar = data.avatar_url;
      const upperName = peerName.toUpperCase();
      if (upperName === "CHROM24" || peerId === "36024039") {
        peerAvatar = "https://a.ppy.sh/36024039";
      } else if (upperName === "IMKICKEDHAEVEN" || upperName === "IMKICKEDHEAVEN" || peerId === "32238069") {
        peerAvatar = "https://a.ppy.sh/32238069";
      } else if (!peerAvatar || !peerAvatar.startsWith("http")) {
        peerAvatar = peerId.match(/^\d+$/)
          ? `https://a.ppy.sh/${peerId}`
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(peerName)}&background=0284c7&color=fff&size=128&bold=true`;
      }

      const peer: P2PPeer = {
        client_id: senderCid,
        user_name: peerName,
        user_id: peerId,
        client_type: String(data.client || "osu!lazer"),
        activity: String(data.activity || "В сети"),
        sr: Number(data.sr || 0),
        acc: Number(data.acc || 0),
        grade: String(data.grade || "S"),
        combo: Number(data.combo || 0),
        last_seen: now,
        is_p2p_verified: true,
        avatar_url: peerAvatar,
        latency_ms: 12,
      };

      const isNew = !this.peers.has(peerId);
      this.peers.set(peerId, peer);

      if (this.onPeersUpdated) {
        this.onPeersUpdated(this.getPeers());
      }

      if (isNew) {
        this.broadcastPresence();
      }
    } else if (topic === "osuhub/v2/scores_req") {
      const targetId = String(data.target_id || "").trim();
      const targetName = String(data.target_name || "").trim().toLowerCase();
      const myName = (this.userName || "").trim().toLowerCase();
      const myId = (this.userId || "").trim();
      if (
        (!targetId && !targetName) ||
        (targetId && targetId === myId) ||
        (targetName && targetName === myName)
      ) {
        // Reply with our session scores immediately
        this.broadcastSessionScores();
      }
    } else if (topic === "osuhub/v2/session_scores") {
      if (data.scores && Array.isArray(data.scores) && this.onPeerSessionScores) {
        this.onPeerSessionScores(
          senderId,
          String(data.name || "Player"),
          data.scores
        );
      }
    } else if (topic === "osuhub/v2/feed") {
      if (data.type === "admin_alert" && this.onAdminAlert) {
        const target = String(data.target_user || "").trim().toLowerCase();
        const myName = (this.userName || "").trim().toLowerCase();
        if (!target || target === myName || target === (this.userId || "").trim().toLowerCase()) {
          this.onAdminAlert(
            String(data.author || "Создатель"),
            String(data.text || ""),
            String(data.alert_type || "broadcast")
          );
        }
      }
    }
  }
}
