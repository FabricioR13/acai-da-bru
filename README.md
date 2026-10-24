# Açaí da Bru

Catálogo online com pedido pelo WhatsApp para o **Açaí da Bru** — desenvolvido pela TF Solutions.

## Arquivos

- `index.html`, `script.js`, `style.css` — a loja (categorias, produtos, carrinho e envio do pedido pelo WhatsApp)
- `admin.html` — painel da loja (produtos, categorias, cupons, PDV, relatório e configurações)
- `seed-firebase.html` — cadastra o cardápio inicial no Firestore (rodar uma única vez — SOBRESCREVE os produtos)
- `atualizar-firebase.html` — aplica a atualização de 21/10 (combo com 2 açaís, taxas por bairro, fotos novas) sem apagar edições feitas no admin
- `regras.md` — regras de segurança do Firestore
- `assets/` — fotos dos produtos (recortes das artes da loja) e logo da TF Solutions

## Plano Gestão (admin)

- **Pedidos** — pedidos do site ao vivo (som + contador), etapas Recebido → Em preparo → Saiu para entrega → Entregue, aviso ao cliente pelo WhatsApp em cada etapa, marcar como pago.
- **Painel** — vendas, despesas, lucro do mês (caixa), lucro nas vendas (custo × preço), ticket médio, comparação com o mês anterior, mais vendidos e margem do cardápio. Botão **Relatório do mês (PDF)** com comentários automáticos.
- **Entradas e saídas** — despesas e outras entradas lançadas à mão; vendas do PDV e pedidos pagos entram sozinhos; exportação para planilha (CSV).
- **Avaliações** — link de avaliação vai na mensagem de "Entregue" (`avaliar.html`, uma avaliação por pedido); a dona aprova quais aparecem na loja.
- **Ingredientes** — lista única de complementos e adicionais (preço, custo, liga/desliga).
- **Relatório** — vendas por dia, pedidos por horário e mapa dia da semana × horário.

Coleções do Firestore: `produtos`, `categorias`, `cupons`, `configuracoes`, `vendas` (PDV), `pedidos` (site), `caixa`, `avaliacoes`, `contadores`. Regras em `regras.md`.

## Colocar no ar

1. Criar o projeto no Firebase, ativar Firestore e Authentication (e-mail/senha) e criar o usuário admin.
2. O `firebaseConfig` (projeto `acai-da-bru-41a8d`) já está em `script.js`, `admin.html` e `seed-firebase.html`.
3. Publicar as regras do `regras.md`.
4. Abrir `seed-firebase.html`, entrar com o admin e enviar os produtos.
5. Publicar no GitHub Pages.
