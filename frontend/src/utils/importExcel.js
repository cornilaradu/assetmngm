
import ExcelJS from 'exceljs';
import readXlsxFile from 'read-excel-file/browser';

export async function downloadImportTemplate(
  categories = [],
  departments = []
) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'Asset Maintenance Portal';

  const sheet = workbook.addWorksheet('Import Asset-uri');

  sheet.columns = [
    { header: 'Nume asset', key: 'name', width: 35 },
    { header: 'Cod intern', key: 'code', width: 22 },
    { header: 'Categorie', key: 'category', width: 30 },
    { header: 'Departament', key: 'department', width: 30 },
    { header: 'Locatie', key: 'location', width: 30 },
    { header: 'Descriere', key: 'description', width: 45 },
    { header: 'Data achizitiei', key: 'purchaseDate', width: 22 },
  ];

  const header = sheet.getRow(1);

  header.font = {
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  header.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A5F' },
  };

  header.height = 28;

  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Coloanele obligatorii sunt marcate.
  ['A1', 'B1', 'C1', 'D1'].forEach((cell) => {
    sheet.getCell(cell).note =
      'Camp obligatoriu pentru import.';
  });

  // Foaie ajutatoare cu valorile existente in portal.
  const reference = workbook.addWorksheet('Valori disponibile');

  reference.columns = [
    { header: 'Categorii existente', key: 'category', width: 35 },
    { header: 'Departamente existente', key: 'department', width: 35 },
  ];

  const maxRows = Math.max(
    categories.length,
    departments.length
  );

  for (let i = 0; i < maxRows; i++) {
    reference.addRow({
      category: categories[i]?.name || '',
      department: departments[i]?.name || '',
    });
  }

  reference.getRow(1).font = { bold: true };

  // Instructiuni pentru completare.
  const instructions = workbook.addWorksheet('Instructiuni');

  instructions.getColumn(1).width = 95;

  [
    'INSTRUCTIUNI IMPORT ASSET-URI',
    '',
    '1. Completeaza datele in foaia "Import Asset-uri".',
    '2. Nu modifica denumirile coloanelor.',
    '3. Nume asset, Cod intern, Categorie si Departament sunt obligatorii.',
    '4. Categoria si departamentul trebuie sa existe deja in portal.',
    '5. Foloseste denumirile din foaia "Valori disponibile".',
    '6. Codul intern trebuie sa fie unic.',
    '7. Data achizitiei se completeaza in format AAAA-LL-ZZ.',
    '8. Nu modifica foile "Valori disponibile" si "Instructiuni".',
    '9. Importul va fi verificat inainte de confirmarea finala.',
  ].forEach((text) => {
    instructions.addRow([text]);
  });

  instructions.getCell('A1').font = {
    bold: true,
    size: 14,
  };

  const buffer = await workbook.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'Asset_Import_Template.xlsx';

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

  export async function readImportExcel(file) {
  const sheets = await readXlsxFile(file, {
    sheet: 'Import Asset-uri',
  });

  const selectedSheet = sheets.find(
    (item) => item.sheet === 'Import Asset-uri'
  );

  if (!selectedSheet) {
    throw new Error(
      'Fisierul nu contine foaia "Import Asset-uri".'
    );
  }

 const data = selectedSheet.data; 

 const expectedHeaders = [
    'Nume asset',
    'Cod intern',
    'Categorie',
    'Departament',
    'Locatie',
    'Descriere',
    'Data achizitiei',
  ];

  if (!data.length) {
    throw new Error('Fisierul Excel este gol.');
  }

  const cellText = (value) => {
    if (value === null || value === undefined) return '';

    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    }

    return String(value).trim();
  };

  const headers = data[0];

  for (let col = 0; col < expectedHeaders.length; col++) {
    const actual = cellText(headers[col]);

    if (actual !== expectedHeaders[col]) {
      throw new Error(
        `Coloana ${col + 1} trebuie sa fie "${expectedHeaders[col]}".`
      );
    }
  }

  const rows = [];

  for (let index = 1; index < data.length; index++) {
    const excelRow = data[index];

    const values = [];

    for (let col = 0; col < 7; col++) {
      values.push(cellText(excelRow[col]));
    }

    if (values.every((value) => !value)) continue;

    rows.push({
      rowNumber: index + 1,
      name: values[0],
      internalCode: values[1],
      categoryName: values[2],
      departmentName: values[3],
      location: values[4],
      description: values[5],
      purchaseDate: values[6],
    });
  }

  return rows;
}


export function validateImportRows(
  rows,
  categories,
  departments,
  existingAssets
) {
  const normalize = (value) =>
    String(value ?? '').trim().toLocaleLowerCase('ro-RO');

  const existingCodes = new Set(
    existingAssets.map((asset) => normalize(asset.internalCode))
  );

  const codeCounts = new Map();

  rows.forEach((row) => {
    const code = normalize(row.internalCode);
    if (code) {
      codeCounts.set(code, (codeCounts.get(code) || 0) + 1);
    }
  });

  return rows.map((row) => {
    const errors = [];
    let duplicate = false;

    const code = normalize(row.internalCode);

    if (!row.name.trim()) {
      errors.push('Numele asset-ului este obligatoriu.');
    }

    if (!code) {
      errors.push('Codul intern este obligatoriu.');
    }

    const category = categories.find(
      (item) => normalize(item.name) === normalize(row.categoryName)
    );

    if (!category) {
      errors.push('Categoria nu exista in portal.');
    }

    const department = departments.find(
      (item) => normalize(item.name) === normalize(row.departmentName)
    );

    if (!department) {
      errors.push('Departamentul nu exista in portal.');
    }

    if (code && existingCodes.has(code)) {
      duplicate = true;
      errors.push('Codul intern exista deja in inventar.');
    }

    if (code && codeCounts.get(code) > 1) {
      duplicate = true;
      errors.push('Codul intern apare de mai multe ori in Excel.');
    }

    let purchaseDate = null;

    if (row.purchaseDate) {
      const value = String(row.purchaseDate).trim();

      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        errors.push('Data trebuie sa fie in format AAAA-LL-ZZ.');
      } else {
        const date = new Date(`${value}T00:00:00Z`);

        if (
          Number.isNaN(date.getTime()) ||
          date.toISOString().slice(0, 10) !== value
        ) {
          errors.push('Data achizitiei este invalida.');
        } else {
          purchaseDate = value;
        }
      }
    }

    return {
      ...row,
      status: errors.length
        ? duplicate
          ? 'DUPLICATE'
          : 'ERROR'
        : 'VALID',
      errors,
      payload: {
        name: row.name.trim(),
        internalCode: row.internalCode.trim(),
        categoryId: category?.id || null,
        departmentId: department?.id || null,
        location: row.location || null,
        description: row.description || null,
        purchaseDate,
      },
    };
  });
}
