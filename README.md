# Painel interativo de análise de vendas

Dashboard didático para a atividade de **Fundamentos de IA e Análise de Dados**. Ele abre com os 1.367 registros da base original, incorporados em `public/dados-embutidos.js`, por isso também funciona ao abrir `public/index.html` diretamente, sem buscar um arquivo local. A soma da coluna `quantidade` nessa base é de 2.060 unidades vendidas. Os produtos seguem a base da hamburgueria: X-Bacon, X-Burger, X-Salada, X-Tudo, Batata Frita, Refrigerante, Suco e Milkshake.

Há um arquivo original `vendas_hamburgueria.csv` na raiz do projeto. Ele foi preservado. A estrutura foi examinada: são 1.367 linhas e 12 colunas, com vendas de julho a setembro de 2026; não há a coluna `regiao`. Para cobrir a comparação regional pedida na atividade, as linhas iniciais recebem **Não informado** nessa dimensão. O arquivo original também pode ser importado pelo painel.

## Como abrir

Abra `public/index.html` em um navegador moderno. Não é necessário instalar ferramentas, iniciar servidor ou compilar arquivos. A demonstração e os filtros funcionam localmente. Os gráficos e a importação de CSV usam Chart.js 4.4.7 e Papa Parse 5.4.1 carregados por CDN, portanto essas funções precisam de acesso à internet. As imagens do catálogo visual também são carregadas de URLs externas; sem conexão, a análise continua funcionando, mas essas fotos podem não aparecer. As fontes personalizadas também são carregadas pela internet; sem conexão, o navegador usa fontes locais parecidas.

## Como importar sua base

1. Salve a planilha como CSV UTF-8, com cabeçalho na primeira linha.
2. Clique em **Importar CSV** e selecione o arquivo. A leitura é feita localmente no navegador; o arquivo não é enviado a um servidor.
3. Para os indicadores, a base precisa conter `id_venda`, `data`, `quantidade` e `preco_unitario`. `produto`, `categoria` e `regiao` completam os detalhes e gráficos. Se `regiao`, `categoria` ou `produto` não existirem, o painel usa **Não informado** nessas colunas.
4. As datas aceitas são `AAAA-MM-DD` e `DD/MM/AAAA`. Números aceitam ponto decimal ou vírgula decimal (por exemplo, `12.50` ou `12,50`). Quantidade e preço podem ser zero; números negativos, ausentes ou inválidos não são aceitos.
5. A mensagem acima da tabela informa as linhas descartadas e os motivos. Uma linha é descartada se o ID estiver ausente, a data for inválida, ou quantidade/preço estiverem ausentes, inválidos ou negativos. Quantidade deve ser um número inteiro de unidades. Colunas categóricas vazias são preservadas como **Não informado**. IDs repetidos não removem linhas: cada linha continua representando um produto vendido, e os cartões contam IDs únicos.

O dashboard usa estas colunas na demonstração e em `public/dados-exemplo.csv`:

| Coluna | Descrição |
| --- | --- |
| `id_venda` | Identificador da venda; pode se repetir quando a venda tiver mais de um produto. |
| `data` | Data da venda no formato `AAAA-MM-DD`. |
| `produto` | Nome do produto vendido. |
| `categoria` | Categoria do produto. |
| `regiao` | Região associada à venda. |
| `quantidade` | Unidades vendidas naquela linha. |
| `preco_unitario` | Preço por unidade, sem símbolo de moeda. |

## Indicadores e regras

- **Faturamento por linha:** `quantidade × preco_unitario`.
- **Faturamento total:** soma do faturamento das linhas após os filtros de período, categoria e região.
- **Vendas:** quantidade de `id_venda` distintos após os filtros. Linhas repetidas não são removidas.
- **Unidades vendidas:** soma de `quantidade` após os filtros.
- **Ticket médio:** faturamento total dividido pela quantidade de IDs únicos. Quando não há vendas, o resultado é R$ 0,00.
- **Faturamento mensal, por categoria e por região:** soma do faturamento por grupo após os mesmos filtros.
- **Participação por categoria:** gráfico de rosca com a fatia de cada categoria no faturamento filtrado.
- **Unidades por produto:** gráfico polar com o volume de unidades vendido por produto após os filtros.

Os valores ausentes em categoria, produto ou região são apresentados como **Não informado**; são diferentes do número zero. Quantidade e preço iguais a zero são aceitos e geram faturamento de zero. Pesquisa e ordenação atuam na tabela; exportar inclui as linhas que correspondem aos filtros e à pesquisa atual, com a coluna adicional `faturamento_calculado`.

## Publicar no Render como Static Site

1. Envie o projeto ao GitHub, mantendo `public/` na raiz do repositório.
2. No Render, crie um serviço do tipo **Static Site** e conecte o repositório.
3. Configure:

   - **Branch:** a branch que contém o projeto.
   - **Root Directory:** deixe vazio.
   - **Build Command:** `echo "Site pronto"`
   - **Publish Directory:** `public`

4. Crie o serviço. O Render publicará `public/index.html` e os arquivos relacionados. Em atualizações futuras, basta enviar commits para a branch configurada.

