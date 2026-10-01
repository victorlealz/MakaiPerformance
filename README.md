# Makai Performance System [BETA]

Aplicativo web mobile-first para registro individual de treinos de musculação e artes marciais. O MVP registra uma sessão, preserva o rascunho no navegador e prepara uma mensagem para o próprio WhatsApp do usuário, que funciona como histórico pessoal nesta versão.

> By Victor Leal Antunes

## Arquitetura Cloudflare

Esta versão foi ajustada para **Cloudflare Workers Static Assets**.

O projeto não usa Pages e não precisa de um Worker JavaScript próprio. O Wrangler publica os arquivos estáticos da pasta `public/` diretamente em um Worker usando a configuração `assets.directory`.

Arquitetura:

```text
GitHub
   ↓
Cloudflare Workers Builds
   ↓
wrangler deploy
   ↓
Workers Static Assets
```

## Tecnologias

- HTML5
- CSS3
- JavaScript Vanilla (ES6+)
- `localStorage`
- APIs nativas do navegador
- Cloudflare Workers Static Assets
- Wrangler

Não há backend, banco de dados, autenticação ou API própria.

## Estrutura

```text
/
├── public/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── main.js
│   └── assets/
│       ├── images/
│       └── icons/
├── package.json
├── wrangler.jsonc
├── .gitignore
└── README.md
```

A pasta `public/` é a raiz pública do site. Somente seu conteúdo é publicado como Static Assets.

## Instalação local

```bash
git clone URL_DO_REPOSITORIO
cd makai-auto-registro
npm install
```

## Desenvolvimento local

```bash
npm run dev
```

Isso executa:

```bash
wrangler dev
```

O Wrangler lê `wrangler.jsonc` e serve os arquivos de `./public` usando o ambiente de desenvolvimento do Workers.

## Deploy manual

Autentique o Wrangler, se necessário:

```bash
npx wrangler login
```

Depois publique:

```bash
npm run deploy
```

O script executa:

```bash
wrangler deploy
```

Como `wrangler.jsonc` possui:

```jsonc
"assets": {
  "directory": "./public"
}
```

o Wrangler reconhece o projeto como um Worker com Static Assets. Não é necessário definir `main` nem criar `src/index.js` para este site puramente estático.

## Cloudflare Workers via GitHub

Para usar o repositório com Builds do Cloudflare Workers:

1. Faça push deste projeto para o GitHub.
2. No Cloudflare Dashboard, abra **Workers & Pages**.
3. Crie ou abra o Worker desejado.
4. Conecte o repositório GitHub.
5. Use `main` como branch de produção.
6. Se houver campo de build command, não é necessário processo de build para o frontend estático.
7. Configure o deploy command como:

```bash
npx wrangler deploy
```

8. Faça o deploy.

O erro `Missing entry-point to Worker script or to assets directory` não deve ocorrer nesta versão porque `wrangler.jsonc` declara explicitamente `assets.directory` como `./public`.

## package.json

Os scripts são:

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  }
}
```

## WhatsApp

O projeto não utiliza API do WhatsApp nem credenciais da Meta.

Ao concluir um treino, a aplicação prepara uma URL no formato:

```text
https://wa.me/NUMERO?text=MENSAGEM
```

O usuário ainda precisa tocar em **Enviar** dentro do WhatsApp.

Abrir o WhatsApp não encerra a sessão automaticamente. Os dados permanecem disponíveis até o usuário tocar em **Já enviei**.

## localStorage

O navegador pode usar as seguintes chaves:

- `makaiAutoRegistro.phone`
- `makaiAutoRegistro.rememberPhone`
- `makaiAutoRegistro.activeSession`
- `makaiAutoRegistro.draft`
- `makaiAutoRegistro.preferences`

Não existe histórico remoto ou banco de dados próprio.

## Privacidade

- Não existe conta de usuário.
- Não existe banco de dados remoto.
- Não existem cookies, analytics, pixels ou trackers.
- Telefone e registros não são enviados a servidores MAKAI.
- Os dados temporários ficam no navegador.
- O WhatsApp só é aberto por ação do usuário.

## GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin URL_DO_REPOSITORIO
git push -u origin main
```

Não versione `node_modules/`, `.wrangler/`, `.env` ou credenciais.
