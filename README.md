# MathPlay Solutions

Portal educacional gamificado desenvolvido a partir do desafio do PDF do TCC SESI 2B.

## Funcionalidades

- Cadastro e login de usuários com persistência em sessão
- Página dedicada de login e cadastro em `/login`
- Identidade visual da empresa Rocckouware e logo fornecida
- Dashboard com estatísticas, conquistas e histórico de partidas
- Banco de dados SQLite com persistência de resultados
- 8 jogos matemáticos funcionais:
  - Batalha dos Inteiros
  - Poções de Frações
  - Balança do Equilíbrio
  - Construtor de Cidades
  - Desafio da Loja
  - Detetives dos Dados
  - Missão no Plano
  - Batalha das Potências
- 23 conquistas por tema, desempenho, dificuldade e progresso
- Três níveis de dificuldade com conjuntos de questões próprios em cada jogo
- Interface responsiva e acessível para mobile, tablet e desktop

## Como executar

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Inicie a aplicação:
   ```bash
   npm start
   ```
3. Acesse:
   ```bash
   http://localhost:3000
   ```

## Tecnologias

- Node.js
- Express
- SQLite
- HTML/CSS/JS

## Estrutura principal

- `server.js` — backend e regras de autenticação
- `public/index.html` — interface do portal
- `public/styles.css` — estilos responsivos
- `public/app.js` — lógica frontend e jogos
- `mathplay.db` — banco de dados gerado automaticamente
