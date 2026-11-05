
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('ro-RO', {
    timeZone: 'Europe/Bucharest',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getRomaniaDay(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bucharest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type) =>
    Number(parts.find((part) => part.type === type)?.value);

  return Date.UTC(
    get('year'),
    get('month') - 1,
    get('day')
  );
}

function getMaintenanceStatus(schedule) {
  if (!schedule.nextDueDate) return 'Necunoscut';

  const today = getRomaniaDay(new Date());
  const dueDate = getRomaniaDay(schedule.nextDueDate);

  if (today === null || dueDate === null) {
    return 'Necunoscut';
  }

  const daysLeft = Math.round(
    (dueDate - today) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft < 0) return 'Depasita';

  const reminderDays = schedule.reminderDaysBefore ?? 7;

  if (daysLeft <= reminderDays) {
    return 'Scadenta apropiata';
  }

  return 'Programata';
}

function safeText(value) {
  if (value === null || value === undefined) return '-';

  const text = String(value).trim();

  if (!text) return '-';

  // Fonturile standard PDF nu suporta toate diacriticele.
  return text
    .replace(/ă/g, 'a')
    .replace(/Ă/g, 'A')
    .replace(/â/g, 'a')
    .replace(/Â/g, 'A')
    .replace(/î/g, 'i')
    .replace(/Î/g, 'I')
    .replace(/ș/g, 's')
    .replace(/Ș/g, 'S')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ț/g, 't')
    .replace(/Ț/g, 'T')
    .replace(/ţ/g, 't')
    .replace(/Ţ/g, 'T');
}

export async function exportAssetsPdf(assets, filters = {}) {
  if (!Array.isArray(assets) || assets.length === 0) {
    throw new Error('Nu exista asset-uri de exportat.');
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const margin = 14;
  const generatedAt = new Date();

  const maintenanceRows = [];

  assets.forEach((asset) => {
    (asset.maintenanceSchedules || [])
      .filter((schedule) => schedule.active !== false)
      .forEach((schedule) => {
        maintenanceRows.push({
          assetCode: asset.internalCode,
          assetName: asset.name,
          type: schedule.maintenanceType,
          lastPerformed: schedule.lastPerformedAt,
          nextDue: schedule.nextDueDate,
          status: getMaintenanceStatus(schedule),
        });
      });
  });

  // Antetul raportului
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('RAPORT INVENTAR SI MENTENANTE', margin, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    'Asset Maintenance Portal',
    margin,
    24
  );

  doc.text(
    `Generat: ${formatDate(generatedAt)}`,
    pageWidth - margin,
    24,
    { align: 'right' }
  );

  doc.setTextColor(40, 40, 40);

  // Rezumat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('REZUMAT', margin, 43);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  doc.text(
    `Asset-uri incluse: ${assets.length}`,
    margin,
    51
  );

  doc.text(
    `Mentenante active: ${maintenanceRows.length}`,
    margin + 75,
    51
  );

  const overdueCount = maintenanceRows.filter(
    (item) => item.status === 'Depasita'
  ).length;

  doc.text(
    `Mentenante depasite: ${overdueCount}`,
    margin + 155,
    51
  );

  const filterParts = [];

  if (filters.search) {
    filterParts.push(`Cautare: ${safeText(filters.search)}`);
  }

  if (filters.category) {
    filterParts.push(`Categorie: ${safeText(filters.category)}`);
  }

  if (filters.department) {
    filterParts.push(`Departament: ${safeText(filters.department)}`);
  }

  let currentY = 59;

  if (filterParts.length > 0) {
    doc.setFontSize(9);
    const filterLines = doc.splitTextToSize(
      `Filtre aplicate: ${filterParts.join(' | ')}`,
      pageWidth - margin * 2
    );

    doc.text(filterLines, margin, currentY);
    currentY += filterLines.length * 5 + 4;
  }

  // Sectiunea inventar
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. INVENTAR ASSET-URI', margin, currentY);

  const inventoryRows = assets.map((asset) => [
    safeText(asset.internalCode),
    safeText(asset.name),
    safeText(asset.categoryRef?.name || asset.category),
    safeText(asset.department?.name),
    safeText(asset.location),
    safeText(asset.status),
  ]);

  autoTable(doc, {
    startY: currentY + 5,
    margin: {
      left: margin,
      right: margin,
      top: 18,
      bottom: 18,
    },
    head: [[
      'Cod intern',
      'Asset',
      'Categorie',
      'Departament',
      'Locatie',
      'Status',
    ]],
    body: inventoryRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 248, 252],
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 65 },
      2: { cellWidth: 40 },
      3: { cellWidth: 45 },
      4: { cellWidth: 52 },
    },
  });

  // Mentenantele incep pe o pagina separata.
  doc.addPage();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 95);
  doc.text('2. SITUATIA MENTENANTELOR', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(
    `Total mentenante active: ${maintenanceRows.length}`,
    margin,
    26
  );

  const maintenanceTableRows = maintenanceRows.map((item) => [
    safeText(item.assetCode),
    safeText(item.assetName),
    safeText(item.type),
    formatDate(item.lastPerformed),
    formatDate(item.nextDue),
    safeText(item.status),
  ]);

  autoTable(doc, {
    startY: 32,
    margin: {
      left: margin,
      right: margin,
      top: 18,
      bottom: 18,
    },
    head: [[
      'Cod asset',
      'Asset',
      'Tip mentenanta',
      'Ultima interventie',
      'Urmatoarea scadenta',
      'Status',
    ]],
    body: maintenanceTableRows,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 248, 252],
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 65 },
      2: { cellWidth: 60 },
      3: { cellWidth: 34 },
      4: { cellWidth: 40 },
    },
    didParseCell(data) {
      if (data.section !== 'body' || data.column.index !== 5) {
        return;
      }

      const status = data.cell.raw;

      if (status === 'Depasita') {
        data.cell.styles.textColor = [185, 28, 28];
        data.cell.styles.fontStyle = 'bold';
      } else if (status === 'Scadenta apropiata') {
        data.cell.styles.textColor = [180, 100, 0];
        data.cell.styles.fontStyle = 'bold';
      } else if (status === 'Programata') {
        data.cell.styles.textColor = [21, 128, 61];
      }
    },
  });

  // Subsol pe toate paginile
  const totalPages = doc.internal.getNumberOfPages();

  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);

    doc.setDrawColor(220, 225, 230);
    doc.line(
      margin,
      pageHeight - 13,
      pageWidth - margin,
      pageHeight - 13
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);

    doc.text(
      'Asset Maintenance Portal - Raport generat automat',
      margin,
      pageHeight - 8
    );

    doc.text(
      `Pagina ${page} / ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  const fileDate = [
    generatedAt.getFullYear(),
    String(generatedAt.getMonth() + 1).padStart(2, '0'),
    String(generatedAt.getDate()).padStart(2, '0'),
  ].join('-');

  doc.save(`Asset_Report_${fileDate}.pdf`);
}
