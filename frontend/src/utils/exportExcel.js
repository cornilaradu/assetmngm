
import ExcelJS from 'exceljs';

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('ro-RO');
}

function configureSheet(sheet, columns) {
  sheet.columns = columns.map(([header, key, width]) => ({
    header,
    key,
    width,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = {
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A5F' },
  };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = 25;

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };
}

export async function exportAssetsExcel(assets) {
  if (!assets?.length) {
    throw new Error('Nu exista asset-uri de exportat.');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Asset Maintenance Portal';
  workbook.created = new Date();

  const inventory = workbook.addWorksheet('Inventar');

  configureSheet(inventory, [
    ['Cod intern', 'code', 20],
    ['Nume asset', 'name', 38],
    ['Categorie', 'category', 28],
    ['Departament', 'department', 28],
    ['Locatie', 'location', 30],
    ['Status', 'status', 18],
    ['Responsabil', 'owner', 28],
    ['Data achizitiei', 'purchaseDate', 20],
    ['Descriere', 'description', 45],
  ]);

  assets.forEach((asset) => {
    inventory.addRow({
      code: asset.internalCode || '',
      name: asset.name || '',
      category: asset.categoryRef?.name || asset.category || '',
      department: asset.department?.name || '',
      location: asset.location || '',
      status: asset.status || '',
      owner: asset.owner?.fullName || '',
      purchaseDate: formatDate(asset.purchaseDate),
      description: asset.description || '',
    });
  });

  const maintenance = workbook.addWorksheet('Mentenante');

  configureSheet(maintenance, [
    ['Cod asset', 'code', 20],
    ['Nume asset', 'name', 38],
    ['Tip mentenanta', 'type', 35],
    ['Ultima interventie', 'lastPerformed', 22],
    ['Urmatoarea scadenta', 'nextDue', 24],
    ['Recurenta (zile)', 'recurrence', 20],
    ['Status', 'status', 20],
    ['Reminder (zile)', 'reminder', 20],
  ]);

  assets.forEach((asset) => {
    (asset.maintenanceSchedules || []).forEach((schedule) => {
      maintenance.addRow({
        code: asset.internalCode || '',
        name: asset.name || '',
        type: schedule.maintenanceType || '',
        lastPerformed: formatDate(schedule.lastPerformedAt),
        nextDue: formatDate(schedule.nextDueDate),
        recurrence: schedule.recurrenceDays ?? '',
        status: schedule.status || '',
        reminder: schedule.reminderDaysBefore ?? '',
      });
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `Asset_Inventory_${new Date()
    .toISOString()
    .slice(0, 10)}.xlsx`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
