# Pluma Project

Projeto desenvolvido para fins acadêmicos com foco em acessibilidade, bem-estar e interação do usuário.

## 🌐 Deploy

Acesse o projeto online:

https://pluma-7xdk9q5b0-igorrmouras-projects.vercel.app

---

## 🤖 Como a IA é conectada

A Pluma conversa com um modelo de linguagem usando a API do **Ollama**. Há dois modos,
escolhidos no botão de engrenagem do chat (tela da IA ou janela do diário):

| Modo | Onde o modelo roda | O que a pessoa precisa fazer |
| --- | --- | --- |
| **Nuvem** (padrão) | No servidor, via **Ollama Cloud** | Nada — é só usar |
| **Local** | Na própria máquina, via `ollama serve` | Instalar o Ollama e baixar o modelo |

O modo **nuvem** funciona porque o site tem um proxy em `api/chat.js`: o navegador fala
com o servidor do site, e o servidor fala com a Ollama Cloud usando a chave que está na
variável de ambiente `OLLAMA_API_KEY`. Assim a chave **nunca** é enviada ao navegador
e o site funciona para qualquer pessoa, mesmo sem Ollama instalado.

O modo **local** continua disponível para desenvolvimento (e é o que a equipe usava
antes): o navegador chama `http://localhost:11434` direto, o que exige o Ollama rodando
com CORS liberado (`OLLAMA_ORIGINS="*"`).

### Configurar a chave (obrigatório para o modo nuvem)

1. Crie uma chave em <https://ollama.com/settings/keys>.
2. Cole a chave no arquivo `.env` da pasta do projeto:

   ```bash
   OLLAMA_API_KEY=sua_chave_aqui
   ```

   O `.env` está no `.gitignore` e no `.vercelignore`: ele **nunca** é publicado
   nem enviado para o deploy. Ele serve para testar localmente com `npx vercel dev`
   (o CLI lê o arquivo sozinho).

3. Mande a chave para a Vercel, que é onde o site roda:

   ```bash
   vercel link
   sed -n 's/^OLLAMA_API_KEY=//p' .env | tr -d '"' | vercel env add OLLAMA_API_KEY production
   ```

   Pelo painel funciona igual: **Settings → Environment Variables** → `OLLAMA_API_KEY`
   (marque Production e Preview).

4. Faça novo deploy.

> A chave da Ollama Cloud nunca é enviada ao navegador: o proxy `api/chat.js` a lê
> do servidor e só usa para falar com o provedor.

### Rodar localmente

O site é estático e pode ser servido com qualquer servidor simples:

```bash
python3 -m http.server 8000
```

Para testar o proxy (`/api/chat` e `/api/health`) junto com o site, use o CLI da Vercel:

```bash
npx vercel dev
```

### Modelos e custo

Na nuvem, os modelos disponíveis vêm de `https://ollama.com/api/tags` e aparecem como
sugestão no campo de modelo. Os liberados pelo projeto são `gpt-oss:20b` (padrão),
`gpt-oss:120b`, `gemma4:31b`, `nemotron-3-nano:30b` e outros.

O Ollama Cloud cobra por token (plano Free já vem com créditos iniciais; Pro custa
US$ 20/mês com US$ 60 de crédito). Com `gpt-oss:20b`, uma conversa custa em torno de
US$ 0,0004 por turno.

---

## 🔒 Privacidade

- Diário, humor e conversas ficam **só no navegador** (`localStorage`).
- Ao conversar, o conteúdo é enviado ao provedor de IA (Ollama Cloud, hospedado nos
  EUA) — a Ollama declara que não usa esses dados para treinar modelos.
- O proxy não registra o conteúdo das conversas; a chave da API fica apenas no servidor.

---

## 📁 Estrutura

O projeto utiliza uma estrutura simples baseada em:

- HTML
- CSS
- JavaScript

```
api/            proxy serverless para a Ollama Cloud (roda na Vercel)
css/            estilos de cada tela
js/             lógica do app (app.js, ia.js, diario.js, humor.js, ...)
```

# Pluma-FaculProject
