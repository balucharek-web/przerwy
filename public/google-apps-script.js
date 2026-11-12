/**
 * =========================================================================
 * PRZERWAPRO - SKRYPT GOOGLE APPS SCRIPT DLA ARKUSZA GOOGLE
 * =========================================================================
 * 
 * Instrukcja wdrożenia w 2 minuty:
 * 1. Otwórz swój prywatny Arkusz Google na Dysku.
 * 2. W menu górnym kliknij: Rozszerzenia -> Apps Script.
 * 3. Skasuj wszystko co tam jest i wklej PONIŻSZY kod w całości.
 * 4. Kliknij ikonę dyskietki (Zapisz projekt).
 * 5. W prawym górnym rogu kliknij niebieski przycisk: Wdróż (Deploy) -> Nowe wdrożenie (New deployment).
 * 6. Wybierz typ: Aplikacja internetowa (Web app).
 * 7. Skonfiguruj uprawnienia:
 *    - Opis: PrzerwaPro Synchronizacja
 *    - Wykonaj jako: Ja (Twój adres e-mail)
 *    - Kto ma dostęp: Każdy (Anyone)  <--- BARDZO WAŻNE! Dzięki temu koledzy z sektora nie muszą się logować!
 * 8. Kliknij "Wdróż", zaakceptuj standardowe uprawnienia Google i SKOPIUJ "Adres URL aplikacji internetowej" (kończący się na /exec).
 * 9. Wklej ten adres w aplikacji PrzerwaPro w Ustawieniach. Gotowe!
 */

const POLISH_MONTHS = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

const RAW_DATA_SHEET_NAME = '_BazaDanych_';

function doGet(e) {
  try {
    const params = e.parameter || {};
    const action = params.action || 'ping';
    const callback = params.callback;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'ping') {
      return jsonResponse({
        success: true,
        message: 'Połączenie z Arkuszem PrzerwaPro działa prawidłowo!',
        spreadsheetTitle: ss.getName(),
        sheets: ss.getSheets().map(s => s.getName())
      }, callback);
    }

    if (action === 'get_breaks') {
      const targetUser = (params.userName || '').trim().toLowerCase();
      const rawSheet = ss.getSheetByName(RAW_DATA_SHEET_NAME);
      if (!rawSheet || rawSheet.getLastRow() < 2) {
        return jsonResponse({ success: true, breaks: [] }, callback);
      }

      const rows = rawSheet.getDataRange().getValues();
      // Nagłówki wiersz 1: ID, Użytkownik, Data, Start, Koniec, CzasSekundy, Notatka, DayKey, Timestamp
      const breaks = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowUser = String(row[1] || '').trim().toLowerCase();
        
        // Filtruj według użytkownika lub zwróć wszystkie dla sektora
        if (!targetUser || targetUser === 'all' || rowUser === targetUser) {
          breaks.push({
            id: String(row[0] || ''),
            userName: String(row[1] || ''),
            startTime: String(row[3] || ''),
            endTime: String(row[4] || ''),
            durationSeconds: Number(row[5]) || 0,
            note: String(row[6] || ''),
            dayKey: String(row[7] || '')
          });
        }
      }

      // Sortuj od najnowszych
      breaks.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

      return jsonResponse({
        success: true,
        breaks: breaks.slice(0, 500)
      }, callback);
    }

    return jsonResponse({ success: false, message: 'Nieznana akcja: ' + action }, callback);
  } catch (err) {
    return jsonResponse({ success: false, message: 'Błąd skryptu: ' + err.toString() }, callback);
  }
}

function doPost(e) {
  try {
    let data = {};
    const contents = e.postData ? e.postData.contents : '';
    if (contents) {
      try {
        data = JSON.parse(contents);
      } catch (err) {
        // Fallback for urlencoded
      }
    }

    // Support standard HTML form submission (allows browser to pass ADEO SSO credentials via hidden iframe!)
    if (!data.action && e.parameter) {
      data = e.parameter;
      if (typeof data.break === 'string') {
        try {
          data.break = JSON.parse(data.break);
        } catch (err) {}
      }
    }

    const action = data.action || 'record_break';

    if (action === 'record_break') {
      const userName = (data.userName || 'Pracownik').trim();
      const b = data.break || {};
      const startTime = b.startTime ? new Date(b.startTime) : new Date();
      const endTime = b.endTime ? new Date(b.endTime) : new Date();
      const durationSeconds = Number(b.durationSeconds) || Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      const note = b.note || '';
      const dayKey = b.dayKey || startTime.toISOString().slice(0, 10);
      const breakId = b.id || ('brk_' + Date.now());

      const ss = SpreadsheetApp.getActiveSpreadsheet();

      // 1. Zapis do technicznej bazy danych (do szybkiego pobierania historii)
      recordIntoRawDatabase(ss, breakId, userName, startTime, endTime, durationSeconds, note, dayKey);

      // 2. Zapis do ładnej wizualnej zakładki z miesiącem i kolumną dla pracownika
      recordIntoVisualMonthlySheet(ss, userName, startTime, endTime, durationSeconds, note);

      const respObj = {
        success: true,
        message: 'Zapisano przerwę dla: ' + userName + ' w Arkuszu Google (ADEO)!'
      };

      // Jeśli wywołanie przyszło z ukrytego formularza w ramce iframe, zwróć HTML z postMessage
      if (data.format === 'html' || (e.parameter && e.parameter.format === 'html')) {
        return HtmlService.createHtmlOutput(
          '<!DOCTYPE html><html><body><script>' +
          'window.parent.postMessage({ type: "PRZERWAPRO_SHEET_SAVED", success: true, message: "' + respObj.message + '" }, "*");' +
          '</script><h3>' + respObj.message + '</h3></body></html>'
        );
      }

      return jsonResponse(respObj);
    }

    return jsonResponse({ success: false, message: 'Nieznana akcja POST: ' + action });
  } catch (err) {
    return jsonResponse({ success: false, message: 'Błąd zapisu w Arkuszu: ' + err.toString() });
  }
}

/**
 * 1. Zapis do bazy danych (ukrytej lub na końcu) dla szybkiego odczytu przez aplikację
 */
function recordIntoRawDatabase(ss, breakId, userName, startTime, endTime, durationSeconds, note, dayKey) {
  let sheet = ss.getSheetByName(RAW_DATA_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(RAW_DATA_SHEET_NAME);
    sheet.hideSheet(); // ukryta przed przypadkowym zepsuciem
    sheet.appendRow([
      'ID', 'Użytkownik', 'Data_ISO', 'Start_ISO', 'Koniec_ISO', 
      'Czas_Sekundy', 'Notatka', 'DayKey', 'Data_Utworzenia'
    ]);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#334155').setFontColor('#ffffff');
  }

  // Zapobiegaj dublom jeśli ten sam ID już istnieje
  const ids = sheet.getRange('A:A').getValues();
  for (let i = 1; i < ids.length; i++) {
    if (ids[i][0] === breakId) {
      return; // już zapisane
    }
  }

  sheet.appendRow([
    breakId,
    userName,
    startTime.toISOString().slice(0, 10),
    startTime.toISOString(),
    endTime.toISOString(),
    durationSeconds,
    note,
    dayKey,
    new Date().toISOString()
  ]);
}

/**
 * 2. Zapis do elegancko sformatowanej zakładki z bieżącym miesiącem
 */
function recordIntoVisualMonthlySheet(ss, userName, startTime, endTime, durationSeconds, note) {
  const monthName = POLISH_MONTHS[startTime.getMonth()] + ' ' + startTime.getFullYear();
  let sheet = ss.getSheetByName(monthName);

  if (!sheet) {
    sheet = ss.insertSheet(monthName, 0); // dodaj na początku jako pierwsza zakładka
    sheet.setTabColor('#f59e0b'); // elegancki bursztynowy kolor zakładki
  }

  // Szukaj kolumny przypisanej do tego pracownika w Wierszu 1
  let userStartCol = -1;
  const lastCol = Math.max(1, sheet.getLastColumn());
  const headerRow = sheet.getRange(1, 1, 1, Math.max(lastCol, 20)).getValues()[0];

  const targetHeader = ('Przerwy: ' + userName).toLowerCase();
  for (let c = 0; c < headerRow.length; c++) {
    if (String(headerRow[c] || '').trim().toLowerCase() === targetHeader) {
      userStartCol = c + 1; // 1-indexed
      break;
    }
  }

  // Jeśli pracownik nie ma jeszcze swoich kolumn w tym miesiącu -> stwórz ładny nagłówek
  if (userStartCol === -1) {
    // Znajdź pierwszą pustą kolumnę (z odstępem 1 kolumny jeśli to nie pierwsza)
    userStartCol = lastCol === 1 && sheet.getRange(1, 1).getValue() === '' ? 1 : lastCol + 2;

    // Nagłówek główny pracownika (scal 4 kolumny: Data, Start, Koniec, Czas)
    sheet.getRange(1, userStartCol, 1, 4).merge();
    const titleCell = sheet.getRange(1, userStartCol);
    titleCell.setValue('Przerwy: ' + userName);
    titleCell.setFontWeight('bold');
    titleCell.setFontSize(11);
    titleCell.setHorizontalAlignment('center');
    titleCell.setBackground('#0f172a'); // ciemny granat / Leroy slate
    titleCell.setFontColor('#f59e0b'); // bursztyn

    // Podnagłówki kolumn
    const subHeaders = [['Data', 'Od (Start)', 'Do (Koniec)', 'Czas trwania']];
    const subHeaderRange = sheet.getRange(2, userStartCol, 1, 4);
    subHeaderRange.setValues(subHeaders);
    subHeaderRange.setFontWeight('bold');
    subHeaderRange.setFontSize(10);
    subHeaderRange.setBackground('#1e293b');
    subHeaderRange.setFontColor('#f8fafc');
    subHeaderRange.setHorizontalAlignment('center');

    // Obramowanie nagłówków
    sheet.getRange(1, userStartCol, 2, 4).setBorder(
      true, true, true, true, true, true, '#475569', SpreadsheetApp.BorderStyle.SOLID
    );
  }

  // Znajdź kolejny wolny wiersz w kolumnie tego użytkownika
  const colValues = sheet.getRange(1, userStartCol, 500, 1).getValues();
  let nextRow = 3;
  for (let r = 2; r < colValues.length; r++) {
    if (!colValues[r][0]) {
      nextRow = r + 1;
      break;
    }
  }

  // Formatuj daty i godziny
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = startTime.getFullYear() + '-' + pad(startTime.getMonth() + 1) + '-' + pad(startTime.getDate());
  const startStr = pad(startTime.getHours()) + ':' + pad(startTime.getMinutes());
  const endStr = pad(endTime.getHours()) + ':' + pad(endTime.getMinutes());
  
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const durationStr = minutes + ' min' + (seconds > 0 ? (' ' + seconds + 's') : '') + (note ? (' (' + note + ')') : '');

  const rowData = [[dateStr, startStr, endStr, durationStr]];
  const dataRange = sheet.getRange(nextRow, userStartCol, 1, 4);
  dataRange.setValues(rowData);
  dataRange.setFontSize(10);
  dataRange.setHorizontalAlignment('center');

  // Naprzemienny kolor tła (zebra) dla czytelności
  if (nextRow % 2 === 0) {
    dataRange.setBackground('#f8fafc');
  } else {
    dataRange.setBackground('#ffffff');
  }

  // Eleganckie obramowanie wiersza
  dataRange.setBorder(
    true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID
  );

  // Wyróżnij kolumnę z czasem (pogrubienie)
  sheet.getRange(nextRow, userStartCol + 3).setFontWeight('bold');

  // Dopasuj szerokość kolumn dla czytelności
  for (let c = 0; c < 4; c++) {
    sheet.autoResizeColumn(userStartCol + c);
  }
}

function jsonResponse(data, callback) {
  if (callback && typeof callback === 'string' && /^[a-zA-Z0-9_]+$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + JSON.stringify(data) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
