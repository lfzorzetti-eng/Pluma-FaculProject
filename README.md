# Pluma

Projeto acadêmico de apoio ao bem-estar emocional. A Pluma reúne, em um único site,
ferramentas simples para a pessoa acompanhar como se sente: registrar o dia no diário,
marcar o humor, fazer exercícios de respiração e conversar com uma assistente de IA
acolhedora quando precisar desabafar.

## Funcionalidades

- **Diário emocional** — entradas com título, texto e emoção, organizadas por data.
- **Registro de humor** — acompanhamento do estado emocional ao longo do tempo.
- **Exercícios de respiração** — sessões guiadas para acalmar e reduzir a ansiedade.
- **Assistente de IA (Pluma)** — conversa em português com tom acolhedor, que usa o
  contexto do diário e do humor para responder de forma mais pessoal. A resposta
  aparece em tempo real (streaming) e a conversa fica salva no histórico.
- **Histórico emocional** — visualização das entradas, humores e conversas anteriores.
- **Conta e configurações** — login, perfil, tema escuro, tamanho da fonte,
  sons, notificações de lembretes e exportação/limpeza dos dados.

## Assistente de IA

A Pluma é uma companheira de conversa, não um substituto para atendimento
psicológico. Ela reconhece sinais de sofrimento intenso e responde com acolhimento,
orientando a pessoa a procurar ajuda e informando o CVV (188), disponível 24 horas.

A IA pode funcionar de duas formas: no servidor do site, com um modelo de linguagem
hospedado na nuvem, ou usando um modelo que roda na própria máquina da pessoa.
No modo nuvem basta abrir o site; no modo local é preciso ter o Ollama instalado.

## Privacidade

- Diário, humor, conversas e preferências ficam salvos **apenas no navegador** da pessoa.
- Quando a conversa acontece na nuvem, o texto das mensagens é enviado ao provedor de IA
  para gerar a resposta; o servidor do site não guarda o conteúdo das conversas.
- Nenhuma chave de acesso fica exposta no navegador.

## Acessibilidade

- Navegação por teclado, rótulos ARIA e foco visível nos controles.
- Tema escuro, ajuste do tamanho da fonte e respeito à preferência do sistema por
  menos animações.
- Layout responsivo para celular e computador.

## Tecnologias

HTML, CSS e JavaScript puro no front-end, com os dados no `localStorage` do navegador.
A parte de IA usa uma função serverless como intermediária para falar com o provedor
de modelos, mantendo a chave de API fora do alcance do público.

```
api/    função serverless que conversa com o provedor de IA
css/    estilos de cada tela
js/     lógica do app (diário, humor, respiração, IA, configurações)
*.html  telas do site (início, login, diário, humor, respiração, IA, histórico, ajustes)
```

Projeto online: <https://pluma-facul.vercel.app>
