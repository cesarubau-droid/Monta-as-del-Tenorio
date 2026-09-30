/**
 * Montañas del Tenorio — webhook de reservas → Google Sheets
 *
 * Instalación (ver README → "Google Sheets"):
 *  1. Crea una hoja de cálculo nueva en Google Sheets.
 *  2. Extensiones → Apps Script → pega este archivo completo → Guardar.
 *  3. Configuración del proyecto (⚙) → Propiedades de la secuencia de comandos:
 *       WEBHOOK_SECRET = (el mismo valor que GOOGLE_SHEETS_WEBHOOK_SECRET en Vercel)
 *       NOTIFY_EMAIL   = (opcional) correo que recibe un aviso por cada solicitud
 *  4. Implementar → Nueva implementación → Tipo: Aplicación web
 *       Ejecutar como: Yo · Quién tiene acceso: Cualquier persona
 *  5. Copia la URL de la aplicación web (termina en /exec) → GOOGLE_SHEETS_WEBHOOK_URL en Vercel.
 *
 * Las pestañas "Reservations" y "Contacts" se crean solas con sus encabezados.
 */
const RESERVATION_COLS = ['reference', 'createdAt', 'lang', 'name', 'email', 'phone', 'country', 'checkIn', 'checkOut', 'adults', 'children', 'cabin', 'tours', 'breakfast', 'message', 'status', 'depositSent', 'notes'];
const CONTACT_COLS = ['reference', 'createdAt', 'lang', 'name', 'email', 'message', 'status', 'notes'];

function doPost(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    const secret = props.getProperty('WEBHOOK_SECRET');
    const body = JSON.parse(e.postData.contents);
    if (!secret || body.secret !== secret) return json_({ ok: false, error: 'unauthorized' });

    const isContact = body.sheet === 'Contacts';
    const name = isContact ? 'Contacts' : 'Reservations';
    const cols = isContact ? CONTACT_COLS : RESERVATION_COLS;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(cols);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, cols.length).setFontWeight('bold');
    }
    const r = body.row || {};
    const row = cols.map(function (c) {
      if (c === 'status') return 'Nuevo';
      if (c === 'depositSent' || c === 'notes') return '';
      const v = r[c];
      return v === undefined || v === null ? '' : v;
    });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try { sheet.appendRow(row); } finally { lock.releaseLock(); }

    const notify = props.getProperty('NOTIFY_EMAIL');
    if (notify) {
      MailApp.sendEmail(notify, '[Montañas del Tenorio] ' + (isContact ? 'Nuevo mensaje' : 'Nueva solicitud de reserva') + ' ' + (r.reference || ''),
        cols.filter(function (c) { return r[c] !== undefined && r[c] !== ''; }).map(function (c) { return c + ': ' + r[c]; }).join('\n'));
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
