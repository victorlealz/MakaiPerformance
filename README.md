# Makai Performance System [BETA]

Aplicativo web mobile-first para registro individual de treinos de musculação e artes marciais. O MVP registra uma sessão, preserva o rascunho no navegador e prepara uma mensagem para o próprio WhatsApp do usuário, que funciona como histórico pessoal nesta versão.

> By Victor Leal Antunes

## Objetivo

Resolver uma tarefa com o mínimo de atrito: registrar o treino do dia. O fluxo principal é selecionar a modalidade, iniciar, finalizar, informar poucos indicadores, revisar o registro e abrir o WhatsApp com a mensagem pronta.

Não há autenticação, backend ou banco de dados remoto. O aplicativo é um site estático.

## Tecnologias

- HTML5
- CSS3
- JavaScript Vanilla (ES6+)
- `localStorage`
- APIs nativas do navegador
- Cloudflare Pages
- Wrangler apenas como ferramenta de desenvolvimento/deploy

## Estrutura

```text
/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── main.js
├── assets/
│   ├── images/
│   └── icons/
├── package.json
├── wrangler.jsonc
├── .gitignore
└── README.md
```

Os diretórios `assets/images/` e `assets/icons/` ficam vazios no MVP porque não há recursos gráficos externos necessários.

## Requisitos

Para uso no navegador, o site não depende de Node.js. Node.js e npm são necessários somente para executar o Wrangler localmente e para fazer deploy por CLI.

Use uma versão do Node.js atualmente suportada pelo Wrangler.

## Instalação

```bash
git clone URL_DO_REPOSITORIO
cd makai-auto-registro
npm install
```

## Desenvolvimento local

```bash
npm run dev
```

O Wrangler servirá a raiz do projeto como Cloudflare Pages local.

## GitHub

Depois de salvar os arquivos no diretório do projeto:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin URL_DO_REPOSITORIO
git push -u origin main
```

Substitua `URL_DO_REPOSITORIO` pela URL real do repositório criado no GitHub.

## Cloudflare Pages via GitHub

Para publicar com integração Git:

1. Abra o Cloudflare Dashboard.
2. Acesse **Workers & Pages**.
3. Escolha **Create application**.
4. Selecione a opção de **Pages** e importe um repositório Git existente.
5. Autorize/conecte sua conta GitHub, se solicitado.
6. Selecione o repositório deste projeto.
7. Use `main` como branch de produção.
8. Use **Framework preset: None**.
9. Como este projeto não possui etapa de compilação, deixe o Build command em branco quando o painel permitir. Se o fluxo exigir um comando explícito, use `exit 0`.
10. Use `.` como diretório de saída/conteúdo do site estático.
11. Salve e faça o primeiro deploy.

Depois disso, novos pushes para a branch de produção poderão gerar novos deployments automaticamente.

## Deploy via Wrangler

Se preferir fazer deploy pela CLI:

```bash
npx wrangler login
npm run deploy
```

O projeto configurado no comando de deploy é `makai-auto-registro`.

## WhatsApp

O projeto não utiliza a API do WhatsApp e não possui token da Meta.

Ao finalizar o registro, o navegador cria uma URL no formato:

```text
https://wa.me/NUMERO?text=MENSAGEM
```

A mensagem é codificada com `encodeURIComponent`. O envio final depende sempre da ação do usuário dentro do WhatsApp.

Abrir o WhatsApp não é considerado confirmação de envio. O registro permanece salvo até o usuário retornar ao site e tocar em **Já enviei**.

## localStorage

O navegador pode usar as seguintes chaves:

- `makaiAutoRegistro.phone`
- `makaiAutoRegistro.rememberPhone`
- `makaiAutoRegistro.activeSession`
- `makaiAutoRegistro.draft`
- `makaiAutoRegistro.preferences`

A sessão ativa e o rascunho permitem recuperar um treino caso o navegador seja fechado ou recarregado.

O número do WhatsApp só é mantido entre sessões quando o usuário marca a opção de salvá-lo neste aparelho.

Não existe histórico local completo de treinos concluídos.

## Privacidade

- Não existe banco de dados remoto.
- Não existe conta de usuário.
- Não existe backend próprio.
- Não existem cookies, analytics, pixels ou trackers.
- Telefone e registros não são enviados a servidores MAKAI.
- O registro é levado ao WhatsApp somente quando o usuário solicita.
- É possível apagar os dados locais pelo menu do aplicativo.

## Limitações do MVP

- O WhatsApp funciona como histórico pessoal dos registros enviados.
- Não existe sincronização entre aparelhos.
- Limpar os dados do navegador remove a sessão ativa e os rascunhos locais.
- O site não consegue confirmar automaticamente que o usuário tocou em **Enviar** no WhatsApp.
- Não existe recuperação remota de dados.
- Não há funcionamento offline completo nem service worker nesta versão.

## Fluxos de teste recomendados

### Jiu-Jitsu

1. Selecione Jiu-Jitsu.
2. Inicie o treino.
3. Recarregue a página e confirme que a sessão foi restaurada.
4. Finalize.
5. Informe RPE, sono e dor.
6. Preencha tipo, rounds e foco técnico, se desejar.
7. Gere o registro.
8. Abra o WhatsApp.
9. Retorne ao navegador e confirme que o registro ainda existe.
10. Toque em **Já enviei**.

### Musculação

1. Inicie Musculação.
2. Finalize.
3. Informe sessão, exercício principal, carga e séries/repetições.
4. Informe RPE, sono e dor.
5. Gere e revise a mensagem.

### Telefone

O normalizador foi preparado para entradas brasileiras como:

```text
83999999999
(83) 99999-9999
+55 83 99999-9999
5583999999999
```

Todas são convertidas para o padrão numérico usado pelo `wa.me` quando válidas.
