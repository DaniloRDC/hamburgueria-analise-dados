/*
 * Dashboard didático de vendas.
 * A demonstração fica neste arquivo para funcionar também com file://, sem fetch.
 */
const PRODUCTS = [
  { produto: 'X-Bacon', categoria: 'Lanche', preco_unitario: 29.9 },
  { produto: 'X-Burger', categoria: 'Lanche', preco_unitario: 25.9 },
  { produto: 'X-Salada', categoria: 'Lanche', preco_unitario: 27.9 },
  { produto: 'X-Tudo', categoria: 'Lanche', preco_unitario: 34.9 },
  { produto: 'Batata Frita', categoria: 'Acompanhamento', preco_unitario: 15.0 },
  { produto: 'Refrigerante', categoria: 'Bebida', preco_unitario: 6.9 },
  { produto: 'Suco', categoria: 'Bebida', preco_unitario: 9.5 },
  { produto: 'Milkshake', categoria: 'Sobremesa', preco_unitario: 16.9 },
];
const REGIONS = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

function makeDemoData() {
  return Array.from({ length: 200 }, (_, index) => {
    const product = PRODUCTS[(index * 7 + Math.floor(index / 3)) % PRODUCTS.length];
    return {
      id_venda: String(index + 1),
      data: new Date(Date.UTC(2025, index % 12, Math.floor(index / 12) + 1)).toISOString().slice(0, 10),
      produto: product.produto,
      categoria: product.categoria,
      regiao: REGIONS[(index * 3 + Math.floor(index / 7)) % REGIONS.length],
      quantidade: (index * 5 + Math.floor(index / 4)) % 4 + 1,
      preco_unitario: product.preco_unitario
    };
  });
}

const embeddedRows = Array.isArray(window.EMBEDDED_SALES) ? window.EMBEDDED_SALES : makeDemoData();
const demoRows = embeddedRows.map((row) => ({ ...row, regiao: row.regiao || 'Não informado' }));
let rows = demoRows.map((row) => ({ ...row, faturamento: row.quantidade * row.preco_unitario, original: { ...row } }));
let sourceHeaders = Object.keys(demoRows[0] || { id_venda: '', data: '', produto: '', categoria: '', regiao: '', quantidade: '', preco_unitario: '' });
let monthlyChart;
let categoryChart;
let regionChart;
let categoryShareChart;
let productVolumeChart;
let sortState = { key: 'data', direction: 'desc' };

const elements = {
  file: document.getElementById('csv-file'),
  uploadTrigger: document.getElementById('upload-trigger'),
  uploadLabel: document.querySelector('.upload-label'),
  sourceBadge: document.getElementById('source-badge'),
  dateFrom: document.getElementById('date-from'),
  dateTo: document.getElementById('date-to'),
  category: document.getElementById('category-filter'),
  region: document.getElementById('region-filter'),
  clear: document.getElementById('clear-filters'),
  search: document.getElementById('table-search'),
  export: document.getElementById('export-csv'),
  recordCount: document.getElementById('record-count'),
  tableCount: document.getElementById('table-count'),
  totalRevenue: document.getElementById('total-revenue'),
  saleCount: document.getElementById('sale-count'),
  unitCount: document.getElementById('unit-count'),
  averageTicket: document.getElementById('average-ticket'),
  tableBody: document.getElementById('sales-table-body'),
  tableScroll: document.getElementById('table-scroll'),
  empty: document.getElementById('empty-state'),
  message: document.getElementById('data-message')
};

const currencyFormat = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const chartColors = ['#3478ed', '#18a67a', '#f0a83c', '#8b6bd6', '#e27675', '#39a8b9', '#7892ad'];
const categoryPalette = { Lanche: '#ff7a5c', Bebida: '#55e7ff', Acompanhamento: '#ffc857', Sobremesa: '#b18cff' };

function formatCurrency(value) { return currencyFormat.format(value || 0); }
function formatNumber(value) { return numberFormat.format(value || 0); }
function displayText(value) { return value == null || value === '' ? 'Não informado' : String(value); }

function showMessage(message, warning = false) {
  elements.message.textContent = message;
  elements.message.hidden = !message;
  elements.message.classList.toggle('warning', warning);
}

function setUploadLoading(isLoading) {
  elements.file.disabled = isLoading;
  elements.uploadTrigger.classList.toggle('is-loading', isLoading);
  elements.uploadTrigger.setAttribute('aria-busy', String(isLoading));
  elements.uploadLabel.textContent = isLoading ? 'Carregando…' : 'Importar CSV';
  elements.message.setAttribute('aria-busy', String(isLoading));
}

function monthKey(dateString) { return dateString.slice(0, 7); }

function getFilteredRows() {
  const start = elements.dateFrom.value;
  const end = elements.dateTo.value;
  return rows.filter((row) => {
    if (start && row.data < start) return false;
    if (end && row.data > end) return false;
    if (elements.category.value && row.categoria !== elements.category.value) return false;
    if (elements.region.value && row.regiao !== elements.region.value) return false;
    return true;
  });
}

function getTableRows(filteredRows) {
  const query = elements.search.value.trim().toLocaleLowerCase('pt-BR');
  const searchableRows = query
    ? filteredRows.filter((row) => [row.id_venda, row.data, row.produto, row.categoria, row.regiao, row.quantidade, row.preco_unitario, row.faturamento]
      .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(query)))
    : [...filteredRows];
  const direction = sortState.direction === 'asc' ? 1 : -1;
  return searchableRows.sort((a, b) => {
    const left = a[sortState.key];
    const right = b[sortState.key];
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction;
    return String(left ?? '').localeCompare(String(right ?? ''), 'pt-BR', { numeric: true }) * direction;
  });
}

function updateMetrics(filteredRows) {
  const revenue = filteredRows.reduce((sum, row) => sum + row.faturamento, 0);
  const units = filteredRows.reduce((sum, row) => sum + row.quantidade, 0);
  const uniqueSales = new Set(filteredRows.map((row) => row.id_venda)).size;
  elements.totalRevenue.textContent = formatCurrency(revenue);
  elements.saleCount.textContent = formatNumber(uniqueSales);
  elements.unitCount.textContent = formatNumber(units);
  elements.averageTicket.textContent = formatCurrency(uniqueSales ? revenue / uniqueSales : 0);
  elements.recordCount.textContent = `${formatNumber(filteredRows.length)} ${filteredRows.length === 1 ? 'registro' : 'registros'}`;
}

function getChartBaseOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 220 },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (context) => ` ${formatCurrency(context.parsed.y ?? context.parsed.x)}` } }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#8ea8c4', font: { family: 'DM Sans', size: 10 } }, border: { display: false } },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(125, 174, 221, .13)' },
        ticks: { color: '#8ea8c4', font: { family: 'DM Sans', size: 10 }, callback: (value) => formatCurrency(value) },
        border: { display: false },
        title: { display: true, text: 'Faturamento (R$)', color: '#8ea8c4', font: { family: 'DM Sans', size: 10, weight: '500' } }
      }
    }
  };
}

function buildMonthlySeries(filteredRows) {
  if (!filteredRows.length) return { labels: [], values: [] };
  const totals = new Map();
  filteredRows.forEach((row) => {
    const key = monthKey(row.data);
    totals.set(key, (totals.get(key) || 0) + row.faturamento);
  });
  const first = monthKey(filteredRows.reduce((min, row) => row.data < min ? row.data : min, filteredRows[0].data));
  const last = monthKey(filteredRows.reduce((max, row) => row.data > max ? row.data : max, filteredRows[0].data));
  const [firstYear, firstMonth] = first.split('-').map(Number);
  const [lastYear, lastMonth] = last.split('-').map(Number);
  const labels = [];
  const values = [];
  for (let month = firstYear * 12 + firstMonth - 1; month <= lastYear * 12 + lastMonth - 1; month += 1) {
    const year = Math.floor(month / 12);
    const monthNumber = month % 12 + 1;
    const key = `${year}-${String(monthNumber).padStart(2, '0')}`;
    labels.push(monthFormat.format(new Date(Date.UTC(year, monthNumber - 1, 1))));
    values.push(totals.get(key) || 0);
  }
  return { labels, values };
}

function groupRevenue(filteredRows, key) {
  const sums = new Map();
  filteredRows.forEach((row) => sums.set(row[key], (sums.get(row[key]) || 0) + row.faturamento));
  return [...sums.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'));
}

function groupUnits(filteredRows, key) {
  const sums = new Map();
  filteredRows.forEach((row) => sums.set(row[key], (sums.get(row[key]) || 0) + row.quantidade));
  return [...sums.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'));
}

function replaceChart(existingChart, canvasId, config) {
  if (existingChart) existingChart.destroy();
  if (typeof Chart === 'undefined') return null;
  return new Chart(document.getElementById(canvasId), config);
}

function updateCharts(filteredRows) {
  const monthly = buildMonthlySeries(filteredRows);
  const monthlyOptions = getChartBaseOptions();
  monthlyChart = replaceChart(monthlyChart, 'monthly-chart', {
    type: 'line',
    data: { labels: monthly.labels, datasets: [{ label: 'Faturamento mensal', data: monthly.values, borderColor: '#55e7ff', backgroundColor: 'rgba(50, 174, 255, .13)', fill: true, tension: .32, borderWidth: 2.5, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: '#061221', pointBorderColor: '#55e7ff', pointBorderWidth: 2 }] },
    options: { ...monthlyOptions, plugins: { ...monthlyOptions.plugins, legend: { display: true, position: 'top', align: 'start', labels: { color: '#a6bdd5', usePointStyle: true, pointStyle: 'circle', boxWidth: 7, padding: 18, font: { family: 'DM Sans', size: 10 } } } } }
  });

  const category = groupRevenue(filteredRows, 'categoria');
  const categoryOptions = getChartBaseOptions();
  categoryChart = replaceChart(categoryChart, 'category-chart', {
    type: 'bar',
    data: { labels: category.map(([label]) => label), datasets: [{ label: 'Faturamento', data: category.map(([, value]) => value), backgroundColor: category.map(([label], index) => categoryPalette[label] || chartColors[index % chartColors.length]), borderRadius: 5, maxBarThickness: 34 }] },
    options: { ...categoryOptions, indexAxis: 'y', plugins: { ...categoryOptions.plugins, tooltip: { callbacks: { label: (context) => ` ${formatCurrency(context.parsed.x)}` } } }, scales: { x: { ...categoryOptions.scales.y }, y: { ...categoryOptions.scales.x } } }
  });

  const region = groupRevenue(filteredRows, 'regiao');
  const regionOptions = getChartBaseOptions();
  regionChart = replaceChart(regionChart, 'region-chart', {
    type: 'bar',
    data: { labels: region.map(([label]) => label), datasets: [{ label: 'Faturamento', data: region.map(([, value]) => value), backgroundColor: region.map(([, value], index) => ['#55e7ff', '#8b7cff', '#3be0ad', '#ff9d68', '#ffc857'][index % 5]), borderRadius: 5, maxBarThickness: 34 }] },
    options: { ...regionOptions, plugins: { ...regionOptions.plugins, tooltip: { callbacks: { label: (context) => ` ${formatCurrency(context.parsed.y)}` } } } }
  });

  const categoryShare = groupRevenue(filteredRows, 'categoria');
  categoryShareChart = replaceChart(categoryShareChart, 'category-share-chart', {
    type: 'doughnut',
    data: {
      labels: categoryShare.map(([label]) => label),
      datasets: [{
        label: 'Participação do faturamento',
        data: categoryShare.map(([, value]) => value),
        backgroundColor: categoryShare.map(([label], index) => categoryPalette[label] || chartColors[index % chartColors.length]),
        borderColor: '#0b1b33',
        borderWidth: 3,
        hoverOffset: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '64%',
      plugins: {
        legend: { position: 'right', labels: { color: '#a6bdd5', usePointStyle: true, pointStyle: 'circle', boxWidth: 8, padding: 13, font: { family: 'DM Sans', size: 10 } } },
        tooltip: { callbacks: { label: (context) => { const total = context.dataset.data.reduce((sum, value) => sum + value, 0); const percent = total ? (context.parsed / total) * 100 : 0; return ` ${formatCurrency(context.parsed)} · ${percent.toFixed(1).replace('.', ',')}%`; } } }
      }
    }
  });

  const productVolume = groupUnits(filteredRows, 'produto');
  productVolumeChart = replaceChart(productVolumeChart, 'product-volume-chart', {
    type: 'polarArea',
    data: {
      labels: productVolume.map(([label]) => label),
      datasets: [{ label: 'Unidades vendidas', data: productVolume.map(([, value]) => value), backgroundColor: ['rgba(85, 231, 255, .72)', 'rgba(139, 124, 255, .72)', 'rgba(59, 224, 173, .72)', 'rgba(255, 157, 104, .72)', 'rgba(255, 200, 87, .72)', 'rgba(239, 112, 157, .72)', 'rgba(117, 191, 255, .72)', 'rgba(193, 151, 255, .72)'], borderColor: '#0b1b33', borderWidth: 2 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { r: { beginAtZero: true, grid: { color: 'rgba(125, 174, 221, .16)' }, angleLines: { color: 'rgba(125, 174, 221, .16)' }, ticks: { display: false } } },
      plugins: { legend: { position: 'right', labels: { color: '#a6bdd5', usePointStyle: true, pointStyle: 'circle', boxWidth: 8, padding: 10, font: { family: 'DM Sans', size: 9 } } }, tooltip: { callbacks: { label: (context) => ` ${formatNumber(context.parsed.r)} unidades` } } }
    }
  });
}

function appendCell(row, value, className = '') {
  const cell = document.createElement('td');
  if (className) cell.className = className;
  cell.textContent = value;
  row.appendChild(cell);
}

function renderTable(tableRows) {
  elements.tableBody.replaceChildren();
  tableRows.forEach((record) => {
    const row = document.createElement('tr');
    appendCell(row, displayText(record.id_venda));
    appendCell(row, dateFormat.format(new Date(`${record.data}T00:00:00Z`)));
    appendCell(row, displayText(record.produto));
    appendCell(row, displayText(record.categoria));
    appendCell(row, displayText(record.regiao));
    appendCell(row, formatNumber(record.quantidade), 'numeric');
    appendCell(row, formatCurrency(record.preco_unitario), 'numeric');
    appendCell(row, formatCurrency(record.faturamento), 'numeric');
    elements.tableBody.appendChild(row);
  });

  elements.tableCount.textContent = `${formatNumber(tableRows.length)} ${tableRows.length === 1 ? 'linha listada' : 'linhas listadas'}`;
  const noResults = tableRows.length === 0;
  elements.empty.hidden = !noResults;
  elements.tableScroll.hidden = noResults;
}

function updateSortLabels() {
  document.querySelectorAll('thead th').forEach((heading) => {
    const button = heading.querySelector('.sort-button');
    const key = heading.dataset.key;
    const active = key === sortState.key;
    heading.setAttribute('aria-sort', active ? (sortState.direction === 'asc' ? 'ascending' : 'descending') : 'none');
    button.querySelector('span').textContent = active ? (sortState.direction === 'asc' ? '↑' : '↓') : '↕';
  });
}

function refreshDashboard() {
  const filteredRows = getFilteredRows();
  updateMetrics(filteredRows);
  updateCharts(filteredRows);
  renderTable(getTableRows(filteredRows));
  updateSortLabels();
}

function fillSelect(select, values, defaultLabel) {
  const currentValue = select.value;
  select.replaceChildren(new Option(defaultLabel, ''));
  [...values].sort((a, b) => a.localeCompare(b, 'pt-BR')).forEach((value) => select.add(new Option(value, value)));
  if ([...select.options].some((option) => option.value === currentValue)) select.value = currentValue;
}

function setFilterChoices() {
  fillSelect(elements.category, new Set(rows.map((row) => row.categoria)), 'Todas as categorias');
  fillSelect(elements.region, new Set(rows.map((row) => row.regiao)), 'Todas as regiões');
}

function resetFilters() {
  elements.dateFrom.value = '';
  elements.dateTo.value = '';
  elements.category.value = '';
  elements.region.value = '';
  elements.search.value = '';
}

function normalizeHeader(value) {
  return String(value).replace(/^\uFEFF/, '').trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s-]+/g, '_');
}

function parseDate(value) {
  const text = String(value ?? '').trim();
  let year; let month; let day;
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) [, year, month, day] = match;
  else {
    match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    [, day, month, year] = match;
  }
  year = Number(year); month = Number(month); day = Number(day);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseNumber(value) {
  if (value == null || String(value).trim() === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  let text = String(value).trim().replace(/\s/g, '').replace(/^R\$/i, '');
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, '');
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function importCsvFile(file) {
  setUploadLoading(true);
  showMessage('Carregando arquivo CSV…');
  if (typeof Papa === 'undefined') {
    showMessage('A biblioteca de leitura de CSV não carregou. Conecte-se à internet e recarregue a página.', true);
    setUploadLoading(false);
    return;
  }
  Papa.parse(file, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
    complete: (result) => {
      const headers = result.meta.fields || [];
      const headerMap = new Map(headers.map((header) => [normalizeHeader(header), header]));
      if (headerMap.has('region') && !headerMap.has('regiao')) headerMap.set('regiao', headerMap.get('region'));
      const required = ['id_venda', 'data', 'quantidade', 'preco_unitario'];
      const missing = required.filter((key) => !headerMap.has(key));
      if (missing.length) {
        showMessage(`CSV não carregado. Faltam colunas obrigatórias para calcular os indicadores: ${missing.join(', ')}.`, true);
        elements.file.value = '';
        setUploadLoading(false);
        return;
      }

      const discarded = { id: 0, data: 0, quantidade: 0, preco: 0 };
      const importedRows = [];
      result.data.forEach((raw) => {
        const value = (key) => headerMap.has(key) ? raw[headerMap.get(key)] : '';
        const id = String(value('id_venda') ?? '').trim();
        const date = parseDate(value('data'));
        const quantity = parseNumber(value('quantidade'));
        const price = parseNumber(value('preco_unitario'));
        if (!id) { discarded.id += 1; return; }
        if (!date) { discarded.data += 1; return; }
        if (quantity == null || !Number.isInteger(quantity) || quantity < 0) { discarded.quantidade += 1; return; }
        if (price == null || price < 0) { discarded.preco += 1; return; }
        const category = displayText(value('categoria'));
        const region = displayText(value('regiao'));
        const product = displayText(value('produto'));
        importedRows.push({
          id_venda: id,
          data: date,
          produto: product,
          categoria: category,
          regiao: region,
          quantidade: quantity,
          preco_unitario: price,
          faturamento: quantity * price,
          original: { ...raw }
        });
      });

      if (!importedRows.length) {
        showMessage('O CSV não contém linhas válidas. A base atual foi mantida; confira os dados e tente novamente.', true);
        elements.file.value = '';
        setUploadLoading(false);
        return;
      }

      rows = importedRows;
      sourceHeaders = headers;
      elements.sourceBadge.innerHTML = '<span aria-hidden="true">●</span> CSV importado';
      resetFilters();
      setFilterChoices();
      const discardedCount = Object.values(discarded).reduce((sum, count) => sum + count, 0);
      const reasons = Object.entries(discarded).filter(([, count]) => count).map(([reason, count]) => {
        const labels = { id: 'ID ausente', data: 'data ausente/inválida', quantidade: 'quantidade ausente/inválida/negativa', preco: 'preço ausente/inválido/negativo' };
        return `${count} ${labels[reason]}`;
      });
      const warnings = result.errors.length ? ` Papa Parse informou ${result.errors.length} problema(s) de estrutura.` : '';
      let message = `Arquivo “${file.name}”: ${importedRows.length} linhas válidas.`;
      if (discardedCount) message += ` ${discardedCount} linhas descartadas — ${reasons.join('; ')}.`;
      else message += ' Nenhuma linha descartada.';
      if (!headerMap.has('regiao')) message += ' A coluna regiao não existe; foi preenchida como “Não informado”.';
      if (warnings) message += warnings;
      showMessage(message, discardedCount > 0 || !headerMap.has('regiao') || result.errors.length > 0);
      refreshDashboard();
      elements.file.value = '';
      setUploadLoading(false);
    },
    error: (error) => {
      showMessage(`Não foi possível ler o CSV: ${error.message}`, true);
      setUploadLoading(false);
    }
  });
}

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportFilteredCsv() {
  const filteredRows = getTableRows(getFilteredRows());
  if (!filteredRows.length) {
    showMessage('Não há linhas para exportar com os filtros e a pesquisa atuais.', true);
    return;
  }
  const headers = sourceHeaders.filter((header) => normalizeHeader(header) !== 'faturamento_calculado');
  headers.push('faturamento_calculado');
  const lines = [headers.map(csvEscape).join(',')];
  filteredRows.forEach((row) => {
    const values = headers.map((header) => header === 'faturamento_calculado' ? row.faturamento : (row.original[header] ?? ''));
    lines.push(values.map(csvEscape).join(','));
  });
  const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'vendas-filtradas.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

elements.file.addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (file) importCsvFile(file);
});
[elements.dateFrom, elements.dateTo, elements.category, elements.region].forEach((control) => control.addEventListener('change', refreshDashboard));
elements.search.addEventListener('input', refreshDashboard);
elements.clear.addEventListener('click', () => { resetFilters(); refreshDashboard(); });
elements.export.addEventListener('click', exportFilteredCsv);
document.querySelectorAll('thead th').forEach((heading) => {
  heading.querySelector('.sort-button').addEventListener('click', () => {
    const key = heading.dataset.key;
    sortState = { key, direction: sortState.key === key && sortState.direction === 'asc' ? 'desc' : 'asc' };
    refreshDashboard();
  });
});

setFilterChoices();
showMessage(`Base original carregada: ${formatNumber(rows.length)} registros e ${formatNumber(rows.reduce((sum, row) => sum + row.quantidade, 0))} unidades vendidas. Importe outro CSV para explorar uma nova base.`);
refreshDashboard();

