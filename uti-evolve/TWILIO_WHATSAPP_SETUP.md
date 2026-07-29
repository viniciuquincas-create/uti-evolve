# Integração WhatsApp + Twilio

O endpoint `POST /api/whatsapp` recebe mensagens do Twilio, valida a assinatura e atualiza o leito correspondente no registro `config/leitos_data` do Supabase.

## Formato inicial

```text
Leito 1, nora 20, propofol 10, psv, ps 10, fi 30, peep 6
```

Campos reconhecidos: leito/box, noradrenalina/nora, propofol/prop, modo ventilatório, PS, FiO2/FI, PEEP, O2 e fluxo. Valores já existentes não citados são preservados.

## Variáveis de ambiente no Vercel

```bash
TWILIO_AUTH_TOKEN=...
TWILIO_WEBHOOK_URL=https://SEU-DOMINIO/api/whatsapp
WHATSAPP_ALLOWED_SENDERS=+5511999999999,+5511888888888
SUPABASE_URL=https://scuqankwjemqmtjwgema.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

Use uma chave secreta do Supabase somente no backend. Nunca use `SUPABASE_SECRET_KEY` no React nem com prefixo `VITE_`.

## Configuração no Twilio

1. Para testes, ative o **WhatsApp Sandbox** e conecte o seu número.
2. Em **When a message comes in**, selecione `POST` e informe exatamente o valor de `TWILIO_WEBHOOK_URL`.
3. Salve e envie a mensagem de exemplo ao número do Sandbox.
4. Confira a resposta no WhatsApp e volte ao UTI Evolve; o app sincroniza os dados ao ganhar foco.

O Sandbox é somente para testes. Antes da produção, configure um remetente WhatsApp aprovado e valide os requisitos institucionais de privacidade, auditoria e tratamento de dados clínicos.

## Testes

```bash
npm install
npm run test:whatsapp
npm run build
```
