const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Trimite un email de reminder pentru o mentenanta care se apropie de scadenta
 * (sau este deja depasita).
 */
async function sendMaintenanceReminder({ to, cc, assetName, assetCode, maintenanceType, dueDate, daysLeft, portalUrl }) {
  const isOverdue = daysLeft < 0;
  const subject = isOverdue
    ? `[URGENT] Mentenanta depasita: ${assetName} - ${maintenanceType}`
    : `Reminder mentenanta: ${assetName} - ${maintenanceType} (in ${daysLeft} zile)`;

  const dueDateStr = new Date(dueDate).toLocaleDateString('ro-RO');

  const html = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1f2937;">
      <h2 style="color:${isOverdue ? '#b91c1c' : '#1d4ed8'};">
        ${isOverdue ? 'Mentenanta depasita' : 'Reminder mentenanta programata'}
      </h2>
      <p>Buna,</p>
      <p>
        Mentenanta de tip <b>${maintenanceType}</b> pentru asset-ul
        <b>${assetName}</b> (cod: <b>${assetCode}</b>)
        ${isOverdue
          ? `era scadenta pe <b>${dueDateStr}</b> si este in prezent <b>depasita</b>.`
          : `este scadenta pe <b>${dueDateStr}</b> (peste ${daysLeft} zile).`}
      </p>
      <p>Va rugam sa programati/efectuati mentenanta si sa marcati finalizarea in portal.</p>
      ${portalUrl ? `<p><a href="${portalUrl}" style="background:#1d4ed8;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none;">Deschide portalul</a></p>` : ''}
      <p style="color:#6b7280;font-size:12px;">Acest email a fost generat automat de Portalul de Mentenanta Asset-uri.</p>
    </div>
  `;

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM,
    to,
    cc: cc || undefined,
    subject,
    html,
  });
}

module.exports = { sendMaintenanceReminder };
