# MathPlay Solutions

Portal educacional gamificado desenvolvido a partir do desafio do PDF do TCC SESI 2B.

## Funcionalidades

- Cadastro e login de usuários com persistência em sessão
- Página de perfil com nome, foto, banner, pontos, atividade e mural de conquistas recentes
- Edição de nome, foto e banner em aba separada do perfil, com saudação personalizada na página inicial
- Exclusão permanente da conta pelo perfil, com confirmação e remoção dos dados associados
- Página dedicada de login e cadastro em `/login`
- Página de perfil e edição em abas separadas em `/perfil`
- Página de conquistas do usuário em `/conquistas`
- Compatibilidade com leitores de tela, incluindo TalkBack, atalhos para pular ao conteúdo, foco visível e leitura em voz alta em português
- Widget VLibras para tradução de conteúdo em português para Libras nas páginas principais
- Identidade visual da empresa Rocckouware e logo fornecida
- Tema rock and roll em todas as páginas e componentes, com visual escuro, neon roxo e efeitos de palco
- Dashboard com estatísticas, conquistas e histórico de partidas
- Banco de dados MySQL com persistência de usuários, partidas e conquistas
- 8 jogos matemáticos funcionais:
  - Batalha dos Inteiros
  - Poções de Frações
  - Balança do Equilíbrio
  - Construtor de Cidades
  - Desafio da Loja
  - Detetives dos Dados
  - Missão no Plano
  - Batalha das Potências
- 50 conquistas por jogo, desempenho, dificuldade e progresso
- Três níveis de dificuldade com conjuntos de questões próprios em cada jogo
- 10 questões geradas aleatoriamente e sem repetição em cada rodada, nos três níveis
- Interface responsiva e acessível para mobile, tablet e desktop

## Como executar

1. Instale as dependências:
   ```bash
   npm install
   ```
2. No MySQL Workbench, abra e execute `database/mathplay.sql` para criar o banco e as tabelas.
3. Configure o `.env` local (já criado a partir de `.env.example`) com o usuário e a senha do MySQL em `DB_USER` e `DB_PASSWORD`.
4. (Opcional) Para levar usuários, partidas e conquistas do antigo `mathplay.db` ao banco MySQL recém-criado, execute:
   ```bash
   npm run migrate:sqlite
   ```
   A migração só aceita tabelas de destino vazias e cancela a operação se já houver dados, para evitar misturas acidentais.
5. Inicie a aplicação:
   ```bash
   npm start
   ```
6. Acesse:
   ```bash
   http://localhost:3000
   ```

## Tecnologias

- Node.js
- Express
- MySQL 8+
- HTML/CSS/JS

## Estrutura principal

- `server.js` — backend e regras de autenticação
- `database/mathplay.sql` — script MySQL para importar pelo Workbench
- `scripts/migrate-sqlite-to-mysql.js` — migração opcional do banco SQLite anterior
- `.env.example` — exemplo das configurações locais de conexão
- `public/index.html` — interface do portal
- `public/styles.css` — estilos responsivos
- `public/app.js` — lógica frontend e jogos
- `mathplay.db` — banco SQLite anterior, mantido como origem da migração opcional

O nome, a foto e o banner do perfil ficam salvos no MySQL. Ao iniciar, o servidor acrescenta automaticamente as colunas de perfil necessárias a bancos existentes; imagens são reduzidas no navegador antes do envio.

Não compartilhe o arquivo `.env`: ele contém as credenciais locais de acesso ao banco.
