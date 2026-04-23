# UTI Evolve — Deploy

## Passo 1 — Supabase: criar a tabela

1. Acesse https://supabase.com → seu projeto
2. Vá em **SQL Editor** (ícone de banco de dados na barra lateral)
3. Clique em **New query**
4. Cole o conteúdo do arquivo `supabase_setup.sql` e clique **Run**
5. Deve aparecer "Success. No rows returned"

---

## Passo 2 — GitHub: subir o código

> Se não tiver Git instalado: https://git-scm.com/downloads

Abra o terminal na pasta `uti-evolve` e rode:

```bash
git init
git add .
git commit -m "UTI Evolve v1"
```

Agora crie um repositório no GitHub:
1. Acesse https://github.com/new
2. Nome: `uti-evolve`  
3. Deixe **privado** (Private) ✓
4. Clique **Create repository**
5. Copie os comandos que aparecem na seção "…or push an existing repository" e rode no terminal

---

## Passo 3 — Vercel: deploy

1. Acesse https://vercel.com → **Add New Project**
2. Importe o repositório `uti-evolve` do GitHub
3. Clique **Deploy** (as configurações já estão corretas para Vite)
4. Aguarda ~1 minuto

Pronto! O link do seu site aparece no final (algo como `uti-evolve.vercel.app`).

---

## Usar no celular

Abra o link no Safari (iOS) ou Chrome (Android) e adicione à tela inicial:
- iOS: botão compartilhar → "Adicionar à Tela de Início"
- Android: menu do Chrome → "Adicionar à tela inicial"

Vai funcionar como um app nativo.
