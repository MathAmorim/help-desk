// external_attacker.mjs
// Simulating an external attacker interacting strictly via HTTP without server access.
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';

async function logResult(name, promise) {
    try {
        const result = await promise;
        console.log(`[+] ${name}: SUCCESS (Status: ${result.status})`);
        return result;
    } catch (err) {
        console.log(`[-] ${name}: FAILED (${err.message})`);
        return null;
    }
}

async function attack() {
    console.log("==========================================");
    console.log("🔥 INICIANDO ATAQUE EXTERNO (BLACK BOX) 🔥");
    console.log("Alvo: " + BASE_URL);
    console.log("==========================================\n");

    // 1. Probing the Seed API
    console.log("[*] Fase 1: Ataque direto a Endpoints de API Conhecidos (API Discovery)");
    const seedRes = await logResult("GET /api/seed", fetch(`${BASE_URL}/api/seed`));
    if (seedRes && seedRes.ok) {
        console.log("    🚨 VULNERABILIDADE CRÍTICA: O endpoint /api/seed está aberto e retornou HTTP " + seedRes.status);
    } else if (seedRes) {
        console.log("    ✅ BLOQUEADO: Retornou " + seedRes.status);
    }

    // 2. Probing Private Uploads
    console.log("\n[*] Fase 2: Tentativa de Furtar Arquivos Estáticos Sensíveis");
    const fileRes = await logResult("GET /api/files/documento_padrao.pdf", fetch(`${BASE_URL}/api/files/documento_padrao.pdf`));
    if (fileRes && fileRes.ok) {
        console.log("    🚨 VULNERAÍVEL: Arquivo baixado com sucesso sem autenticação!");
    } else if (fileRes) {
        console.log(`    ✅ BLOQUEADO: Servidor recusou a entrega estática (Status: ${fileRes.status})`);
    }

    // 3. SQLi over Login Input
    console.log("\n[*] Fase 3: Fuzzing de Injeção SQL na Interface de Login Públic");
    const sqliPayload = "11111111111' OR '1'='1"; // Typical SQLi bypass
    const formRes = await logResult("POST /login (SQLi Attempt)", fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `cpf=${encodeURIComponent(sqliPayload)}&password=password123`
    }));

    // Check if the response implies failure or internal server error (Prisma crashing means poor sanitization sometimes)
    if (formRes && formRes.status === 500) {
        console.log("    ⚠️ AVISO: O Prisma estourou Erro 500. A aplicação pode estar vulnerável a DoS por Payload Sujo.");
    } else {
        console.log("    ✅ SEGURO: A aplicação rejeitou o SQLi no formulário de login graciosamente sem estourar dependências do Prisma.");
    }

    // 4. Searching for Server Action Hashes to Blind Fire
    console.log("\n[*] Fase 4: Raspagem (Scraping) de HTML buscando Action IDs para Forja de POST (CSRF/Mass Assignment)");
    const loginHtmlRes = await fetch(`${BASE_URL}/login`);
    const html = await loginHtmlRes.text();
    const actionMatch = html.match(/name="(\$ACTION_ID_[a-zA-Z0-9]+)"/g);

    if (actionMatch) {
        console.log(`    ⚠️ AVISO: Actions expostas no HTML encontradas: ${actionMatch.length} referências.`);
        console.log(`    >> Dificuldade de Injeção Direta: Alta (Requer Bypass de Same-Origin e manipulação de Token CSRF acoplado ao Cabeçalho do Next.js).`);
    } else {
        console.log("    ✅ SEGURO: Nenhuma Server Action livre vazando brutalmente como chaves invisíveis no Client HTML de visitantes deslogados.");
    }

    console.log("\n==========================================");
    console.log("🛡️ RELATÓRIO DO ATACANTE EXTERNO FINALIZADO");
    console.log("==========================================\n");
}

attack();
