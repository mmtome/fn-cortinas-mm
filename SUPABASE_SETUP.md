# Ligar o backend (Supabase) — passo a passo

Hoje o app funciona **100% local** (dados no navegador). Este guia liga o
**backend na nuvem**: login real + sincronização entre dispositivos, com
segurança no próprio banco (RLS). Enquanto as variáveis não forem preenchidas,
nada muda — o app continua no modo local.

Tempo: ~10 minutos.

---

## 1. Criar o projeto no Supabase
1. Acesse https://supabase.com e crie uma conta (grátis).
2. **New project** → dê um nome (ex.: `fn-cortinas`), defina a senha do banco e a região (South America / São Paulo).
3. Espere provisionar (~2 min).

## 2. Criar as tabelas + segurança
1. No projeto, abra **SQL Editor** → **New query**.
2. Cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Deve terminar sem erros. Isso cria as tabelas (propostas, estoque, clientes, settings), os vínculos de loja (tenants/memberships) e as políticas de RLS (isolamento por loja).

## 3. Criar o primeiro usuário e vinculá-lo à loja
1. **Authentication → Users → Add user** (defina e-mail e senha). *(Se quiser, desligue "Confirm email" em Authentication → Providers → Email para facilitar o teste.)*
2. Volte ao **SQL Editor** e rode, trocando o e-mail:
   ```sql
   -- cria a loja e já devolve o id
   insert into public.tenants (nome) values ('FN Cortinas') returning id;
   ```
   Copie o `id` retornado e rode:
   ```sql
   insert into public.memberships (user_id, tenant_id, role)
   select u.id, 'COLE_O_TENANT_ID_AQUI', 'Admin'
   from auth.users u where u.email = 'voce@exemplo.com';
   ```
   Pronto: esse usuário é **Admin** dessa loja.

## 4. Pegar as chaves
Em **Project Settings → API**, copie:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

> A `anon key` é pública por design; a segurança vem do RLS. **Nunca** use a `service_role` no app.

## 5. Configurar as variáveis
**Local:** crie um arquivo `.env` na raiz (baseado em `.env.example`) com as duas variáveis.

**Vercel:** Project → **Settings → Environment Variables** → adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Production + Preview) → **Redeploy**.

## 6. Testar
1. Abra o app → agora a tela de login pede **e-mail e senha** (login real).
2. Entre com o usuário criado. O app abre com o cabeçalho do usuário e a loja vinculada.
3. Faça uma alteração (ex.: cadastre um cliente). O indicador de sync mostra o envio.
4. Abra em outro dispositivo/navegador com o mesmo usuário → os dados aparecem (sincronizados).
5. Modo avião: as alterações entram na fila e sobem sozinhas ao reconectar.

---

## Como a segurança funciona
- **RLS (Row Level Security):** cada linha tem `tenant_id`; as políticas só deixam o usuário ler/escrever linhas das lojas às quais ele pertence (`memberships`). Uma loja nunca vê dados de outra — garantido pelo Postgres, não pelo app.
- **Auth:** senhas e sessões são gerenciadas pelo Supabase (hash, tokens JWT com expiração/refresh).
- **Multi-tenant pronto:** para vender a outras lojas, cada uma é um `tenant` isolado no mesmo banco.

## Convidar mais usuários (depois)
Authentication → Users → Add user, depois um `insert` em `memberships` vinculando o `user_id` ao `tenant_id` com role `Admin` ou `Operador`. (Dá pra automatizar isso numa tela de gestão futura.)

## Gestão de usuários no app
No modo local existe a aba **Ajustes → Usuários**. Com o backend ligado, a
gestão passa a ser pelo painel do Supabase (ou por uma tela de convites a ser
construída) — por isso a aba local some quando o Supabase está configurado.
