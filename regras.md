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

    // Pedidos: o site só pode CRIAR, com formato conferido; o admin logado cria
    // pedidos manuais e é o único que vê, muda a etapa ou apaga.
    match /pedidos/{doc} {
      // o admin logado também cria (pedido que chegou pelo WhatsApp / balcão)
      allow create: if request.auth != null;
      allow create: if request.resource.data.keys().hasOnly(['numero', 'codigo', 'dia', 'criadoEm', 'origem', 'tipo', 'bairro', 'cliente', 'telefone', 'endereco', 'observacoes', 'talher', 'troco', 'pagamento', 'status', 'token', 'itens', 'qtdItens', 'subtotal', 'desconto', 'taxaEntrega', 'total'])
                    && request.resource.data.origem == 'site'
                    && request.resource.data.status == 'recebido'
                    && request.resource.data.criadoEm == request.time
                    && request.resource.data.total is number
                    && request.resource.data.total >= 0 && request.resource.data.total < 5000
                    && request.resource.data.itens is list
                    && request.resource.data.itens.size() > 0 && request.resource.data.itens.size() <= 50;
      allow read, update, delete: if request.auth != null;
    }

    // Lançamentos de entradas e saídas (caixa) — só o admin
    match /caixa/{doc} {
      allow read, write: if request.auth != null;
    }

    // Avaliações: o cliente cria UMA por pedido, e só com o código secreto (token)
    // que veio no link do WhatsApp. A loja mostra só as que a dona aprovou.
    match /avaliacoes/{pedidoId} {
      allow create: if request.resource.data.keys().hasOnly(['pedidoId', 'token', 'nota', 'comentario', 'nome', 'permitirPublicar', 'aprovada', 'criadoEm'])
                    && request.resource.data.pedidoId == pedidoId
                    && exists(/databases/$(database)/documents/pedidos/$(pedidoId))
                    && get(/databases/$(database)/documents/pedidos/$(pedidoId)).data.token == request.resource.data.token
                    && request.resource.data.nota is int
                    && request.resource.data.nota >= 1 && request.resource.data.nota <= 5
                    && request.resource.data.comentario is string && request.resource.data.comentario.size() <= 500
                    && request.resource.data.nome is string && request.resource.data.nome.size() <= 40
                    && request.resource.data.permitirPublicar is bool
                    && request.resource.data.aprovada == false
                    && request.resource.data.criadoEm == request.time;
      allow read: if resource.data.aprovada == true || request.auth != null;
      allow update, delete: if request.auth != null;
    }

    // Numeração diária dos pedidos: o site só pode criar o contador do dia
    // começando em 1, ou somar exatamente +1. Visitante não consegue apagar nem
    // pular números.
    // Estoque e histórico de movimentações: só o admin logado
    match /estoque/{doc} {
      allow read, write: if request.auth != null;
    }
    match /estoqueMov/{doc} {
      allow read, write: if request.auth != null;
    }

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
- **pedidos**: cada pedido enviado pelo site (horário, itens, valores, cliente, telefone e endereço para atender o pedido). O site só cria; só o admin logado vê, muda a etapa ou apaga.
- **caixa**: despesas e entradas lançadas à mão no admin (aba Entradas e saídas). Só o admin.
- **avaliacoes**: uma avaliação por pedido (nota, comentário, primeiro nome). Só quem tem o link do pedido avalia; a loja mostra só as aprovadas pela dona.
- **contadores**: numeração diária dos pedidos (`pedidos-AAAA-MM-DD`). O site só consegue somar +1; só o admin logado apaga.

## Pré-requisito

Essas regras só funcionam depois de:
1. Criar o projeto no Firebase e preencher o `firebaseConfig` em `admin.html`.
2. Ativar **Authentication → Sign-in method → E-mail/senha**.
3. Criar o usuário admin em **Authentication → Users**.

Sem isso, `request.auth` nunca será preenchido e as escritas ficarão bloqueadas até o login por e-mail/senha estar configurado.
