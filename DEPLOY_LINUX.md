# Guia de Deploy em Prod (Servidores Linux Debian/Ubuntu)

Este documento centraliza as instruções e orientações sobre como executar o deploy do Software Help Desk em servidores bare-metal, VPS e Clouds (DigitalOcean, AWS EC2, Linode, Azure, Oracle).

O script `deploy.sh` incluso automatiza rigorosamente quase todas as infraestruturas necessárias, permitindo você subir o ar em minutos.

---

## Pré-requisitos

- Um servidor Linux em branco preferencialmente Ubuntu 20.04LTS, 22.04LTS ou Debian.
- Conexão Root ou autoridade `sudo`.
- Seu projeto versionado sem erros num repositório web contínuo (Ex: conta Github/Gitlab).

---

## O que o autómato `deploy.sh` faz por você?

A automação programática cobre 95% do stack exigido em ambiente produtivo:

1. **Node.js**: Adiciona a runtime Node20 e gerencia o pacote global do `pm2` para transformar a aplicação web em um "microserviço" independente à prova de quedas.
2. **Motores de Banco de Dados**: Instala sob demanda tanto Postgres ou MySQL e constrói imediatamente as credenciais (aleatórias altíssimas) e super usuários transparentemente sem interação humana.
3. **Conversão instantânea do ORM**: Substitui as dependências puras de SQlite via script de substituição (`sed`) convertendo as diretrizes do Next/Prisma para os Drives Linux originais escolhidos garantindo compatibilidade pesada.
4. **Construção .env Dinâmica**: Fornece variáveis secretas de Sessões Cryptográficas (NEXTAUTH_SECRET).
5. **Next.js Builder**: Exerce toda a instalação do Package Manager, `prisma generate` e transpila o executável da pasta pura.
6. **NGINX Reverse Engine**: Intervém na porta bruta local (`:3000`), encapsulando-a sob o NGINX e servindo ao mundo na Porta Padrão Web `:80`.

## 👷 Como iniciar a Mágica

Mova o arquivo `deploy.sh` ou simplesmente cole via Nano dentro do servidor alvo recém adquirido.

```bash
# Permita a execução Root do binário
chmod +x deploy.sh

# Inicie o instalador
sudo ./deploy.sh
```

A tela solicitará somente:

1. Se deverá arquitetar **[1] PostgreSQL** ou **[2] MySQL**.
2. **E-mail de Acesso Inicial**: Para que o script já injete a autoridade Root sem precisar rodar comandos avulsos de infra.
3. **Senha Mestre** visando o login no ato.

Após isso você não precisa apertar mais nada, o script assumirá todo o processo.

---

## 🔧 O QUE NÃO DEVE/PODE SER AUTOMATIZADO (Passos Finais)

Como nem o script, sequer o servidor Linux sabem quem você é ou que provedor de DNS/Host usará, algumas definições externas fogem do poder da implantação automatizada.

**Faça-as nos 5 minutos pós-scripts:**

### 1) Apontar seu DNS e Certificado Seguro (SSL/HTTPS)

O site estrará disponível ao vivo direto pelo `HTTP://IP.DO.SERVIDOR`. Como você vai querer acender seu DNS (ex: *suporte.suaempresa.com.br*), instale o protocolo gratuito da EFF na máquina após vincular pelo portal do seu provedor Domain:

```bash
sudo apt install certbot python3-certbot-nginx
# E chame a função mágica do DNS:
sudo certbot --nginx -d suporte.suaempresa.com.br
```

### 2) Mapear novo endereço no Backend (.)ENV

Ao ativar o link real criptografado no Certificado ACIMA, é terminantemente obrigatório relatar a nossa Auth API de que não estamos mais operando em Localhost (evitando falha de Redirecionamento 403 e problemas de Cokie).

```bash
# Abra o Environment gerado:
cd /var/www/help-desk
nano .env

# Altere a tag:
NEXTAUTH_URL="https://suporte.suaempresa.com.br"
```

Reative as configurações dando Reload no container global PM2 do site: `pm2 restart help-desk`.

### 3) Gestão de CI/CD (Pulls futuros manuais)

Caso atualize este projeto localmente e queira subir as pequenas correções para a máquina viva: É inseguro re-executar todo o script de deploy longo. O NGINX e NGROK já correm.
Use simples Git Hooks ou digite a sequência padrão para manter as evoluções sem downtime:

```bash
cd /var/www/help-desk
git pull
npm install
npx prisma generate && npm run build
pm2 reload help-desk # Zero Downtime
```
