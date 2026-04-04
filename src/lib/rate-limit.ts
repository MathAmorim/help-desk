import { LRUCache } from "lru-cache";

// LRU Cache for IP-based Rate Limiting (Brute Force Protection)
const ipRateLimitMap = new LRUCache<string, number[]>({
    max: 500, // Armazena até 500 IPs diferentes na memória
    ttl: 3 * 60 * 1000 // A janela decai em 3 Minutos
});

// LRU Cache for Authenticated User ID Rate Limiting (Spam/Flooding Protection)
const userRateLimitMap = new LRUCache<string, number[]>({
    max: 1000,
    ttl: 60 * 1000 // Janela de 1 Minuto
});

export function checkRateLimitIp(ip: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    let timestamps = ipRateLimitMap.get(ip) || [];

    // Remove registros mais velhos que a janela permitida
    timestamps = timestamps.filter(time => now - time < windowMs);

    if (timestamps.length >= limit) {
        return false; // Rate Limit Exceeded
    }

    timestamps.push(now);
    // Dinamicamente aplica a TTL ao setting específico 
    ipRateLimitMap.set(ip, timestamps, { ttl: windowMs });
    return true; // Allowed
}

export function checkRateLimitUser(userId: string, actionPrefix: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const key = `${userId}:${actionPrefix}`;
    let timestamps = userRateLimitMap.get(key) || [];

    // Remove registros mais velhos que a janela
    timestamps = timestamps.filter(time => now - time < windowMs);

    if (timestamps.length >= limit) {
        return false; // Rate Limit Exceeded
    }

    timestamps.push(now);
    userRateLimitMap.set(key, timestamps, { ttl: windowMs });
    return true; // Allowed
}
