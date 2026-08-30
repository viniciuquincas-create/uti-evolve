# ChatGPT → UTI Evolve: áudio, prévia e confirmação

## Fluxo

1. O usuário envia/fala o áudio na conversa do ChatGPT.
2. O ChatGPT transcreve o áudio na própria conversa.
3. O ChatGPT organiza apenas os dados expressamente informados em `clinicalData` e chama `POST /api/chatgpt-preview`.
4. A API valida leito, campos e operações, gera uma prévia e **não altera** os dados.
5. O ChatGPT mostra leito, paciente e campos interpretados e pede confirmação explícita.
6. Somente depois de o usuário confirmar, a Action chama `POST /api/chatgpt-confirm` com `confirm: true`.
7. A API verifica token de uso único, validade de 10 minutos e se o paciente do leito continua sendo o mesmo; então grava `leitos_data` e `evolucao_data`.

Este fluxo não usa WhatsApp nem Twilio e não encaminha o áudio a outro provedor pela API. Para Actions, apenas a transcrição é enviada ao UTI Evolve.

## Variáveis no Vercel

Crie dois segredos aleatórios diferentes, somente para backend:

```env
CHATGPT_INTEGRATION_SECRET=...
CHATGPT_CONFIRMATION_SECRET=...
```

Mantenha também `SUPABASE_URL` e `SUPABASE_SECRET_KEY` já configurados. Faça redeploy após salvar.

## Configurar uma Action em um GPT

1. No editor do GPT, abra **Actions → Create new action**.
2. Importe `docs/chatgpt-action-openapi.yaml`.
3. Em autenticação, selecione **API Key**, tipo **Bearer**.
4. Use como chave o valor de `CHATGPT_INTEGRATION_SECRET`.
5. Nas instruções do GPT, determine:
   - transcrever literalmente o áudio;
   - chamar `previewClinicalUpdate`;
   - sempre mostrar a prévia completa;
   - nunca chamar `confirmClinicalUpdate` antes de uma confirmação explícita do usuário;
   - se o usuário corrigir qualquer campo, gerar nova prévia em vez de confirmar a anterior.
   - nunca inferir achados, doses ou unidades ausentes;
   - enviar mensagens digitadas e áudios pelo mesmo fluxo;
   - mapear exame físico, ventilação, drogas, dieta e dispositivos somente nos campos definidos pelo schema;
   - enviar sempre `targetPatientName` nas atualizações de pacientes já internados, usando o nome atual lido ou informado, para diferenciar leitos com o mesmo número em UTIs distintas;
   - em fotos da folha de coleta, ler todas as colunas preenchidas e enviá-las juntas em `clinicalDataList`; cada coluna preenchida é um item e colunas vazias devem ser omitidas;
   - incluir `tableDate` e `tableUpdates` para controles, laboratoriais e gasometria legíveis, sem completar valores por suposição;
   - apresentar uma única prévia consolidada e confirmar todos os pacientes preenchidos em uma única confirmação explícita;
   - usar `operation: admit` apenas quando o usuário pedir explicitamente para ocupar um leito vago.

## Endpoints

- `POST /api/chatgpt-preview`: recebe `transcript` e `clinicalDataList`; cria uma prévia conjunta com validade de 10 minutos.
- `POST /api/chatgpt-confirm`: recebe `{ "previewId":"...", "confirmationToken":"...", "confirm":true }`; grava uma única vez.

## Segurança aplicada

- Bearer token obrigatório em ambos os endpoints.
- Chaves do Supabase somente no servidor.
- Token de confirmação aleatório armazenado apenas como HMAC.
- Prévia expira em 10 minutos e não pode ser reutilizada.
- Confirmação rejeitada se o paciente do leito tiver mudado.
- Lista fechada de campos permitidos; campos desconhecidos são rejeitados no servidor.
- Respostas com `Cache-Control: no-store`.

## Cobertura clínica

O schema v2 aceita identificação/admissão em leito vago, dados demográficos, ventilação mecânica e oxigenoterapia, drogas em bomba, dieta e metas nutricionais, dispositivos invasivos e todos os campos textuais dos sistemas do Beira-leito. Para dispositivos múltiplos, atualizar ou remover exige o `deviceId` somente quando houver mais de um item do mesmo tipo.
