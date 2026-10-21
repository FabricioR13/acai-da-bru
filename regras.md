# Regras do Firestore — Açaí da Bru

Copie o bloco abaixo e cole no Console do Firebase:

**Firestore Database → Regras** → apague o conteúdo atual → cole isto → **Publicar**.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /produtos/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /categorias/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /cupons/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /configuracoes/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /vendas/{doc} {
      allow read, write: if request.auth != null;
    }

    // Numeração diária dos pedidos: o site só pode criar o contador do dia
    // começando em 1, ou somar exatamente +1. Visitante não consegue apagar nem
    // pular números.
    match /contadores/{doc} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasOnly(['total'])
                    && request.resource.data.total == 1;
      allow update: if request.resource.data.keys().hasOnly(['total'])
                    && request.resource.data.total == resource.data.total + 1;
      allow delete: if request.auth != null;
    }
  }
}
```

## O que essas regras fazem

- **produtos, categorias, cupons, configuracoes**: qualquer visitante da loja pode *ler* (necessário para o site funcionar sem login), mas só usuários logados no admin podem *escrever* (criar, editar, excluir).
- **vendas**: dado sensível (faturamento) — só usuários logados podem ler ou escrever. Não é público.
- **contadores**: numeração diária dos pedidos (`pedidos-AAAA-MM-DD`). O site só consegue somar +1; só o admin logado apaga.

## Pré-requisito

Essas regras só funcionam depois de:
1. Criar o projeto no Firebase e preencher o `firebaseConfig` em `admin.html`.
2. Ativar **Authentication → Sign-in method → E-mail/senha**.
3. Criar o usuário admin em **Authentication → Users**.

Sem isso, `request.auth` nunca será preenchido e as escritas ficarão bloqueadas até o login por e-mail/senha estar configurado.
