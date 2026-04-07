/**
 * ===================================================
 * Help Desk — Script de Teste de Carga (Load Test)
 * ===================================================
 * Simula múltiplos usuários simultâneos acessando
 * diferentes endpoints do sistema.
 * 
 * Uso: node scripts/load-test.js
 */

const BASE_URL = "http://localhost:3000";

// ==========================================
// CONFIGURAÇÃO DO TESTE
// ==========================================
const TESTS = [
    {
        name: "Login Page (GET)",
        method: "GET",
        path: "/login",
        concurrent: 50,
        totalRequests: 200,
    },
    {
        name: "Dashboard (GET)",
        method: "GET",
        path: "/dashboard",
        concurrent: 30,
        totalRequests: 150,
    },
    {
        name: "Auth Session (GET)",
        method: "GET",
        path: "/api/auth/session",
        concurrent: 50,
        totalRequests: 200,
    },
    {
        name: "Auth CSRF (GET)",
        method: "GET",
        path: "/api/auth/csrf",
        concurrent: 40,
        totalRequests: 150,
    },
    {
        name: "Login Brute Force (POST)",
        method: "POST",
        path: "/api/auth/callback/credentials",
        concurrent: 20,
        totalRequests: 60,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            identifier: "ataque@teste.com",
            password: "senha_errada_123",
            csrfToken: "fake",
        }),
    },
];

// ==========================================
// ENGINE DE TESTE
// ==========================================
class LoadTester {
    constructor() {
        this.results = [];
    }

    async makeRequest(method, url, headers = {}, body = null) {
        const start = performance.now();
        try {
            const opts = {
                method,
                headers: { ...headers },
                signal: AbortSignal.timeout(10000),
            };
            if (body) opts.body = body;

            const res = await fetch(url, opts);
            const elapsed = performance.now() - start;

            return {
                status: res.status,
                time: elapsed,
                success: true,
                size: parseInt(res.headers.get("content-length") || "0"),
            };
        } catch (err) {
            return {
                status: 0,
                time: performance.now() - start,
                success: false,
                error: err.message,
            };
        }
    }

    async runBatch(test) {
        const url = `${BASE_URL}${test.path}`;
        const results = [];
        let completed = 0;

        // Executa em lotes de 'concurrent' requests simultâneas
        for (let i = 0; i < test.totalRequests; i += test.concurrent) {
            const batchSize = Math.min(test.concurrent, test.totalRequests - i);
            const promises = [];

            for (let j = 0; j < batchSize; j++) {
                promises.push(
                    this.makeRequest(test.method, url, test.headers, test.body)
                );
            }

            const batchResults = await Promise.all(promises);
            results.push(...batchResults);
            completed += batchSize;

            // Progresso
            process.stdout.write(`\r  Progresso: ${completed}/${test.totalRequests}`);
        }

        process.stdout.write("\r" + " ".repeat(50) + "\r");
        return results;
    }

    analyzeResults(results) {
        const times = results.filter(r => r.success).map(r => r.time).sort((a, b) => a - b);
        const errors = results.filter(r => !r.success);
        const statusCodes = {};

        results.forEach(r => {
            const code = r.status || "TIMEOUT";
            statusCodes[code] = (statusCodes[code] || 0) + 1;
        });

        if (times.length === 0) {
            return { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0, errors: errors.length, statusCodes, rps: 0 };
        }

        const totalTime = times.reduce((a, b) => a + b, 0);

        return {
            avg: totalTime / times.length,
            min: times[0],
            max: times[times.length - 1],
            p50: times[Math.floor(times.length * 0.5)],
            p95: times[Math.floor(times.length * 0.95)],
            p99: times[Math.floor(times.length * 0.99)],
            errors: errors.length,
            statusCodes,
            rps: (times.length / (totalTime / 1000)) * 1, // Req/second estimado
            totalTime,
        };
    }

    printResults(testName, stats, totalRequests, concurrent) {
        console.log(`\n  ┌─────────────────────────────────────────────────┐`);
        console.log(`  │ ${testName.padEnd(48)}│`);
        console.log(`  ├─────────────────────────────────────────────────┤`);
        console.log(`  │ Requests: ${String(totalRequests).padEnd(10)} Concorrência: ${String(concurrent).padEnd(13)}│`);
        console.log(`  │ Erros: ${String(stats.errors).padEnd(41)}│`);
        console.log(`  ├─────────────────────────────────────────────────┤`);
        console.log(`  │ Tempo Médio:  ${(stats.avg).toFixed(1).padStart(8)} ms                        │`);
        console.log(`  │ Mínimo:       ${(stats.min).toFixed(1).padStart(8)} ms                        │`);
        console.log(`  │ Máximo:       ${(stats.max).toFixed(1).padStart(8)} ms                        │`);
        console.log(`  │ P50:          ${(stats.p50).toFixed(1).padStart(8)} ms                        │`);
        console.log(`  │ P95:          ${(stats.p95).toFixed(1).padStart(8)} ms                        │`);
        console.log(`  │ P99:          ${(stats.p99).toFixed(1).padStart(8)} ms                        │`);
        console.log(`  ├─────────────────────────────────────────────────┤`);
        console.log(`  │ Req/s estimado: ${(stats.rps).toFixed(1).padStart(7)}                          │`);
        console.log(`  │ Status Codes:                                   │`);
        
        for (const [code, count] of Object.entries(stats.statusCodes)) {
            const pct = ((count / totalRequests) * 100).toFixed(1);
            const icon = String(code).startsWith("2") || String(code).startsWith("3") ? "✅" : 
                         String(code).startsWith("4") ? "⚠️" : "❌";
            console.log(`  │   ${icon} ${String(code).padEnd(5)} → ${String(count).padEnd(5)} (${pct}%)${" ".repeat(Math.max(0, 27 - pct.length))}│`);
        }
        
        console.log(`  └─────────────────────────────────────────────────┘`);
    }

    async run() {
        console.log("\n══════════════════════════════════════════════════════");
        console.log("  🔥 HELP DESK — TESTE DE CARGA");
        console.log("  Alvo: " + BASE_URL);
        console.log("  Data: " + new Date().toLocaleString("pt-BR"));
        console.log("══════════════════════════════════════════════════════");

        const allStats = [];

        for (const test of TESTS) {
            console.log(`\n  ⏳ Executando: ${test.name}...`);
            
            const startTime = performance.now();
            const results = await this.runBatch(test);
            const wallTime = performance.now() - startTime;
            
            const stats = this.analyzeResults(results);
            stats.wallTime = wallTime;
            stats.effectiveRps = (results.length / (wallTime / 1000));

            this.printResults(test.name, stats, test.totalRequests, test.concurrent);
            
            allStats.push({ name: test.name, stats, test });

            // Pequena pausa entre testes
            await new Promise(r => setTimeout(r, 500));
        }

        // Resumo final
        console.log("\n══════════════════════════════════════════════════════");
        console.log("  📊 RESUMO GERAL");
        console.log("══════════════════════════════════════════════════════");
        
        const totalRequests = allStats.reduce((sum, s) => sum + s.test.totalRequests, 0);
        const totalErrors = allStats.reduce((sum, s) => sum + s.stats.errors, 0);
        const avgLatency = allStats.reduce((sum, s) => sum + s.stats.avg, 0) / allStats.length;
        const maxP99 = Math.max(...allStats.map(s => s.stats.p99));
        
        console.log(`\n  Total de Requisições: ${totalRequests}`);
        console.log(`  Total de Erros:      ${totalErrors}`);
        console.log(`  Latência Média:      ${avgLatency.toFixed(1)} ms`);
        console.log(`  Pior P99:            ${maxP99.toFixed(1)} ms`);
        console.log(`  Taxa de Sucesso:     ${(((totalRequests - totalErrors) / totalRequests) * 100).toFixed(2)}%`);
        
        // Veredicto
        console.log("\n  ── VEREDITO ──");
        if (totalErrors === 0 && maxP99 < 2000) {
            console.log("  ✅ SISTEMA SAUDÁVEL — Suportou a carga sem erros.");
        } else if (totalErrors < totalRequests * 0.05 && maxP99 < 5000) {
            console.log("  ⚠️ ATENÇÃO — Alguns erros ou latência alta sob carga.");
        } else {
            console.log("  ❌ PROBLEMAS — Taxa de erro ou latência inaceitáveis.");
        }
        
        console.log("\n══════════════════════════════════════════════════════\n");
    }
}

// Executa
const tester = new LoadTester();
tester.run().catch(console.error);
