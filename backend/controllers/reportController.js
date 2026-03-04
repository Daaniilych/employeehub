const { getDatabase } = require("../config/database");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { formatDateTime, formatDate, formatTime } = require("../utils/helpers");

// Ensure reports directory exists
const reportsDir = path.join(__dirname, "../reports");
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

const REPORT_I18N = {
  en: {
    reportTitle: "Work Time Report",
    summaryTitle: "Summary",
    dateLabel: "Date",
    generatedLabel: "Generated",
    employee: "Employee",
    email: "Email",
    firstIn: "First In",
    lastOut: "Last Out",
    firstInShort: "First In",
    lastOutShort: "Last Out",
    workedTime: "Worked Time",
    sessions: "Sessions",
    sessionsShort: "Sess",
    breakTime: "Break Time",
    workDays: "Work Days",
    averageHours: "Average Hours",
    total: "Total",
    page: "Page",
    of: "of",
    to: "to",
    upTo: "Up to",
    tableOfContents: "Table of Contents",
    monthlyDetails: "Work Time Report - Monthly Details",
  },
  pl: {
    reportTitle: "Raport czasu pracy",
    summaryTitle: "Podsumowanie",
    dateLabel: "Data",
    generatedLabel: "Wygenerowano",
    employee: "Pracownik",
    email: "Email",
    firstIn: "Pierwsze wejście",
    lastOut: "Ostatnie wyjście",
    firstInShort: "Wejście",
    lastOutShort: "Wyjście",
    workedTime: "Przepracowany czas",
    sessions: "Sesje",
    sessionsShort: "Sesje",
    breakTime: "Przerwa",
    workDays: "Dni pracy",
    averageHours: "Średnie godziny",
    total: "Razem",
    page: "Strona",
    of: "z",
    to: "do",
    upTo: "Do",
    tableOfContents: "Spis treści",
    monthlyDetails: "Work Time Report - Szczegóły miesięczne",
  },
};

const normalizeReportLanguage = (language) => {
  return String(language || "en").toLowerCase().startsWith("pl") ? "pl" : "en";
};

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Generate a descriptive report filename: Report_All_Feb_2026.pdf or Report_Glowacki_25-02-2026.pdf
 */
const generateReportFileName = (groupedData, dateFrom, dateTo, userIds, format, language) => {
  const ext = format === "excel" ? "xlsx" : "pdf";
  const safe = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 25) || "Report";

  let scopePart;
  if (!userIds || userIds.length === 0) {
    scopePart = "All";
  } else if (userIds.length === 1 && groupedData.length > 0) {
    let firstUser = null;
    for (const day of groupedData) {
      if (day.users?.[0]) {
        firstUser = day.users[0];
        break;
      }
    }
    const lastName = firstUser?.last_name || "Employee";
    scopePart = safe(lastName);
  } else {
    scopePart = `${userIds?.length || 0}Employees`;
  }

  let datePart;
  const toDDMMYYYY = (str) => {
    if (!str) return null;
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return str;
  };

  if (dateFrom && dateTo) {
    const fromMatch = dateFrom.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const toMatch = dateTo.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (dateFrom === dateTo) {
      datePart = toDDMMYYYY(dateFrom);
    } else if (fromMatch && toMatch && fromMatch[1] === toMatch[1] && fromMatch[2] === toMatch[2]) {
      const y = parseInt(fromMatch[1], 10);
      const m = parseInt(fromMatch[2], 10);
      const lastDay = new Date(y, m, 0).getDate();
      const isFullMonth = fromMatch[3] === "01" && toMatch[3] === String(lastDay).padStart(2, "0");
      if (isFullMonth) {
        datePart = `${MONTH_ABBR[m - 1]}_${y}`;
      } else {
        datePart = `${toDDMMYYYY(dateFrom)}_to_${toDDMMYYYY(dateTo)}`;
      }
    } else {
      datePart = `${toDDMMYYYY(dateFrom)}_to_${toDDMMYYYY(dateTo)}`;
    }
  } else {
    const now = new Date();
    datePart = `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
  }

  const suffix = Date.now().toString().slice(-6);
  return `Report_${scopePart}_${datePart}_${suffix}.${ext}`;
};

const getReportTexts = (language) => {
  const normalized = normalizeReportLanguage(language);
  return REPORT_I18N[normalized] || REPORT_I18N.en;
};

const toNumericHours = (value) => {
  const numeric = typeof value === "string" ? parseFloat(value) : value;
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatHoursMinutes = (hours) => {
  const totalMinutes = Math.max(0, Math.round(toNumericHours(hours) * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
};

const formatPayrollDuration = (hours) => {
  const numericHours = toNumericHours(hours);
  return `${formatHoursMinutes(numericHours)} (${numericHours.toFixed(2)} h)`;
};

const getReportDateLabel = (dateFrom, dateTo, fallbackDate, texts) => {
  if (dateFrom && dateTo) {
    if (dateFrom === dateTo) return dateFrom;
    return `${dateFrom} ${texts.to} ${dateTo}`;
  }
  if (dateFrom && !dateTo) {
    return `${dateFrom} ${texts.to} ${fallbackDate || dateFrom}`;
  }
  if (!dateFrom && dateTo) {
    return `${texts.upTo} ${dateTo}`;
  }
  return fallbackDate;
};

// Render report title in two lines for clean display (avoids awkward wrapping)
const renderPdfTitle = (doc, titleLine1, dateLabel, regularFontName, boldFontName) => {
  doc.font(boldFontName).fontSize(18).fillColor("#1F2937");
  doc.text(titleLine1, { align: "center" });
  doc.moveDown(0.15);
  doc.font(regularFontName).fontSize(11).fillColor("#6B7280");
  doc.text(dateLabel, { align: "center" });
};

// Scale table to fit A4 page width; returns { colWidths, tableWidth, headerFontSize, rowFontSize, rowHeight, cellPadding }
const scalePdfTableToFit = (baseColWidths, doc, tableX = 40) => {
  const pageWidth = doc.page.width;
  const availableWidth = pageWidth - tableX * 2;
  const totalWidth = Object.values(baseColWidths).reduce((s, w) => s + w, 0);
  const colCount = Object.keys(baseColWidths).length;
  let scaleFactor = Math.min(1, availableWidth / totalWidth);

  let scaledWidths = {};
  for (const [k, v] of Object.entries(baseColWidths)) {
    scaledWidths[k] = Math.max(28, Math.round(v * scaleFactor));
  }
  let scaledTotal = Object.values(scaledWidths).reduce((s, w) => s + w, 0);
  if (scaledTotal > availableWidth) {
    scaleFactor *= availableWidth / scaledTotal;
    for (const k of Object.keys(scaledWidths)) {
      scaledWidths[k] = Math.max(28, Math.round(scaledWidths[k] * (availableWidth / scaledTotal)));
    }
    scaledTotal = Object.values(scaledWidths).reduce((s, w) => s + w, 0);
  }

  const needsCompact = scaleFactor < 0.95 || colCount >= 5;
  return {
    colWidths: scaledWidths,
    tableWidth: Math.min(scaledTotal, availableWidth),
    headerFontSize: needsCompact ? 7 : 9,
    rowFontSize: needsCompact ? 6 : 8,
    rowHeight: needsCompact ? 14 : 16,
    cellPadding: needsCompact ? 3 : 5,
  };
};

const resolvePdfFontPaths = () => {
  const regularCandidates = [
    path.join(__dirname, "../fonts/NotoSans-Regular.ttf"),
    "C:/Windows/Fonts/arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/Library/Fonts/Arial Unicode.ttf",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
  ];

  const boldCandidates = [
    path.join(__dirname, "../fonts/NotoSans-Bold.ttf"),
    "C:/Windows/Fonts/arialbd.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
  ];

  const regular = regularCandidates.find((fontPath) => fs.existsSync(fontPath));
  const bold = boldCandidates.find((fontPath) => fs.existsSync(fontPath));

  return { regular, bold };
};

// Generate Excel report
const generateExcel = async (
  data,
  fields,
  fileName,
  dateFrom,
  dateTo,
  reportLanguage = "en",
  userIds = null,
  includeDetails = false
) => {
  const workbook = new ExcelJS.Workbook();
  const texts = getReportTexts(reportLanguage);
  const dateLabel = getReportDateLabel(dateFrom, dateTo, data[0]?.date, texts);
  const isSingleEmployee = userIds && userIds.length === 1;
  const isPeriod = dateFrom && dateTo && dateFrom !== dateTo;
  const isAllEmployeesAndPeriod = !isSingleEmployee && isPeriod;

  if (isSingleEmployee) {
    // Single employee: per-day format (Date | First In | Last Out | Worked Time) + Total
    const dayRows = [];
    let totalHours = 0;
    data.forEach((dayData) => {
      const user = dayData.users[0];
      if (!user) return;
      const hours = toNumericHours(user.total_hours);
      totalHours += hours;
      dayRows.push({
        date: dayData.date,
        first_in: user.clock_in ? formatTime(user.clock_in) : "-",
        last_out: user.clock_out ? formatTime(user.clock_out) : "-",
        worked_time: formatPayrollDuration(hours),
        hours,
      });
    });
    const employeeName = dayRows[0]
      ? `${data[0].users[0].first_name} ${data[0].users[0].last_name}`
      : "";

    const sheetName = (employeeName || texts.summaryTitle).slice(0, 31);
    const sheet = workbook.addWorksheet(sheetName, { position: 0 });
    const headers = [texts.dateLabel, texts.firstIn, texts.lastOut, texts.workedTime];
    const lastCol = "D";

    sheet.mergeCells(`A1:${lastCol}1`);
    sheet.getCell("A1").value = `${texts.reportTitle} - ${employeeName}\n${texts.dateLabel}: ${dateLabel}`;
    sheet.getCell("A1").font = { size: 16, bold: true };
    sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    sheet.getRow(1).height = 40;

    sheet.mergeCells(`A2:${lastCol}2`);
    sheet.getCell("A2").value = `${texts.generatedLabel}: ${formatDateTime(new Date())}`;
    sheet.getCell("A2").font = { size: 10, color: { argb: "FF666666" } };
    sheet.getCell("A2").alignment = { horizontal: "center" };
    sheet.getRow(2).height = 20;

    let row = 4;
    const headerRow = sheet.getRow(row);
    headerRow.values = headers;
    headerRow.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.height = 25;
    row++;

    dayRows.forEach((r, idx) => {
      const dataRow = sheet.getRow(row);
      dataRow.values = [r.date, r.first_in, r.last_out, r.worked_time];
      dataRow.font = { size: 10 };
      dataRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: idx % 2 === 0 ? "FFFFFFFF" : "FFF9FAFB" },
      };
      dataRow.alignment = { horizontal: "center", vertical: "middle" };
      dataRow.height = 20;
      row++;
    });

    // Total row
    const totalRow = sheet.getRow(row);
    totalRow.values = [texts.total, "", "", formatPayrollDuration(totalHours)];
    totalRow.font = { size: 10, bold: true };
    totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
    totalRow.alignment = { horizontal: "center", vertical: "middle" };
    totalRow.height = 20;

    sheet.columns = [{ width: 14 }, { width: 15 }, { width: 15 }, { width: 24 }];
    sheet.eachRow((r, rn) => {
      if (rn > 3) {
        r.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFE5E7EB" } },
            left: { style: "thin", color: { argb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            right: { style: "thin", color: { argb: "FFE5E7EB" } },
          };
        });
      }
    });
  } else {
    // All/multiple employees: summary format
    const summary = buildSummaryFromGroupedData(data);
    const summarySheet = workbook.addWorksheet(texts.summaryTitle, { position: 0 });
    const summaryHeaders = [texts.employee];
    if (fields.includes("email")) summaryHeaders.push(texts.email);
    if (fields.includes("clockIn")) summaryHeaders.push(texts.firstIn);
    if (fields.includes("clockOut")) summaryHeaders.push(texts.lastOut);
    summaryHeaders.push(texts.workedTime);
    if (fields.includes("averageHours")) summaryHeaders.push(texts.averageHours);
    if (fields.includes("sessions")) summaryHeaders.push(texts.sessions);
    if (fields.includes("breakTime")) summaryHeaders.push(texts.breakTime);
    if (fields.includes("workDays")) summaryHeaders.push(texts.workDays);
    const summaryColCount = summaryHeaders.length;
    const summaryLastCol = String.fromCharCode(64 + summaryColCount);

    summarySheet.mergeCells(`A1:${summaryLastCol}1`);
    summarySheet.getCell("A1").value = `${texts.reportTitle} - ${texts.summaryTitle}\n${texts.dateLabel}: ${dateLabel}`;
    summarySheet.getCell("A1").font = { size: 16, bold: true };
    summarySheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    summarySheet.getRow(1).height = 40;

    summarySheet.mergeCells(`A2:${summaryLastCol}2`);
    summarySheet.getCell("A2").value = `${texts.generatedLabel}: ${formatDateTime(new Date())}`;
    summarySheet.getCell("A2").font = { size: 10, color: { argb: "FF666666" } };
    summarySheet.getCell("A2").alignment = { horizontal: "center" };
    summarySheet.getRow(2).height = 20;

    let summaryRow = 4;
    const summaryHeaderRow = summarySheet.getRow(summaryRow);
    summaryHeaderRow.values = summaryHeaders;
    summaryHeaderRow.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    summaryHeaderRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" },
    };
    summaryHeaderRow.alignment = { horizontal: "center", vertical: "middle" };
    summaryHeaderRow.height = 25;
    summaryRow++;

    summary.forEach((user, idx) => {
      const rowData = [`${user.first_name} ${user.last_name}`];
      if (fields.includes("email")) rowData.push(user.email || "-");
      if (fields.includes("clockIn")) rowData.push(user.first_in ? formatTime(user.first_in) : "-");
      if (fields.includes("clockOut")) rowData.push(user.last_out ? formatTime(user.last_out) : "-");
      rowData.push(formatPayrollDuration(user.total_hours));
      if (fields.includes("averageHours")) rowData.push(formatPayrollDuration(user.average_hours ?? 0));
      if (fields.includes("sessions")) rowData.push(user.sessions_count ?? 0);
      if (fields.includes("breakTime")) rowData.push(formatPayrollDuration(user.break_time ?? 0));
      if (fields.includes("workDays")) rowData.push(user.work_days);
      const dataRow = summarySheet.getRow(summaryRow);
      dataRow.values = rowData;
      dataRow.font = { size: 10 };
      dataRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: idx % 2 === 0 ? "FFFFFFFF" : "FFF9FAFB" },
      };
      dataRow.alignment = { horizontal: "center", vertical: "middle" };
      dataRow.height = 20;
      summaryRow++;
    });

    const summaryColWidths = [{ width: 30 }];
    if (fields.includes("email")) summaryColWidths.push({ width: 25 });
    if (fields.includes("clockIn")) summaryColWidths.push({ width: 15 });
    if (fields.includes("clockOut")) summaryColWidths.push({ width: 15 });
    summaryColWidths.push({ width: 24 });
    if (fields.includes("averageHours")) summaryColWidths.push({ width: 24 });
    if (fields.includes("sessions")) summaryColWidths.push({ width: 12 });
    if (fields.includes("breakTime")) summaryColWidths.push({ width: 24 });
    if (fields.includes("workDays")) summaryColWidths.push({ width: 12 });
    summarySheet.columns = summaryColWidths;

    summarySheet.eachRow((row, rowNumber) => {
      if (rowNumber > 3) {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFE5E7EB" } },
            left: { style: "thin", color: { argb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            right: { style: "thin", color: { argb: "FFE5E7EB" } },
          };
        });
      }
    });

    if (isAllEmployeesAndPeriod && includeDetails) {
      const headers = [texts.dateLabel, texts.firstIn, texts.lastOut, texts.workedTime];
      summary.forEach((user) => {
        const dayRows = [];
        let totalHours = 0;
        data.forEach((dayData) => {
          const dayUser = dayData.users.find((u) => u.user_id === user.user_id);
          if (!dayUser) return;
          const hours = toNumericHours(dayUser.total_hours);
          totalHours += hours;
          dayRows.push({
            date: dayData.date,
            first_in: dayUser.clock_in ? formatTime(dayUser.clock_in) : "-",
            last_out: dayUser.clock_out ? formatTime(dayUser.clock_out) : "-",
            worked_time: formatPayrollDuration(hours),
          });
        });
        const sheetName = `${user.first_name} ${user.last_name}`.slice(0, 31);
        const empSheet = workbook.addWorksheet(sheetName);
        empSheet.mergeCells("A1:D1");
        empSheet.getCell("A1").value = `${texts.reportTitle} - ${user.first_name} ${user.last_name}\n${texts.dateLabel}: ${dateLabel}`;
        empSheet.getCell("A1").font = { size: 16, bold: true };
        empSheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        empSheet.getRow(1).height = 40;
        empSheet.mergeCells("A2:D2");
        empSheet.getCell("A2").value = `${texts.generatedLabel}: ${formatDateTime(new Date())}`;
        empSheet.getCell("A2").font = { size: 10, color: { argb: "FF666666" } };
        empSheet.getRow(2).height = 20;

        let row = 4;
        const headerRow = empSheet.getRow(row);
        headerRow.values = headers;
        headerRow.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
        headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
        headerRow.alignment = { horizontal: "center", vertical: "middle" };
        headerRow.height = 25;
        row++;

        dayRows.forEach((r, idx) => {
          const dataRow = empSheet.getRow(row);
          dataRow.values = [r.date, r.first_in, r.last_out, r.worked_time];
          dataRow.font = { size: 10 };
          dataRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: idx % 2 === 0 ? "FFFFFFFF" : "FFF9FAFB" },
          };
          dataRow.alignment = { horizontal: "center", vertical: "middle" };
          dataRow.height = 20;
          row++;
        });

        const totalRow = empSheet.getRow(row);
        totalRow.values = [texts.total, "", "", formatPayrollDuration(totalHours)];
        totalRow.font = { size: 10, bold: true };
        totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
        totalRow.alignment = { horizontal: "center", vertical: "middle" };
        totalRow.height = 20;

        empSheet.columns = [{ width: 14 }, { width: 15 }, { width: 15 }, { width: 24 }];
        empSheet.eachRow((r, rn) => {
          if (rn > 3) {
            r.eachCell((cell) => {
              cell.border = {
                top: { style: "thin", color: { argb: "FFE5E7EB" } },
                left: { style: "thin", color: { argb: "FFE5E7EB" } },
                bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
                right: { style: "thin", color: { argb: "FFE5E7EB" } },
              };
            });
          }
        });
      });
    }
  }

  const filePath = path.join(reportsDir, fileName);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
};

// Generate PDF report
const generatePDF = (
  data,
  fields,
  fileName,
  dateFrom,
  dateTo,
  reportLanguage = "en",
  userIds = null,
  includeDetails = false
) => {
  return new Promise((resolve, reject) => {
    try {
      console.log("[PDF] Starting PDF generation...");
      console.log("[PDF] Days count:", data.length);
      const texts = getReportTexts(reportLanguage);
      const isSingleEmployee = userIds && userIds.length === 1;
      const isPeriod = dateFrom && dateTo && dateFrom !== dateTo;
      const isAllEmployeesAndPeriod = !isSingleEmployee && isPeriod;

      const summaryColCount =
        2 +
        (fields.includes("email") ? 1 : 0) +
        (fields.includes("clockIn") ? 1 : 0) +
        (fields.includes("clockOut") ? 1 : 0) +
        (fields.includes("averageHours") ? 1 : 0) +
        (fields.includes("sessions") ? 1 : 0) +
        (fields.includes("breakTime") ? 1 : 0) +
        (fields.includes("workDays") ? 1 : 0);
      const useLandscape = !isSingleEmployee && summaryColCount >= 6;

      const filePath = path.join(reportsDir, fileName);
      const doc = new PDFDocument({
        margin: 40,
        size: "A4",
        layout: useLandscape ? "landscape" : "portrait",
      });
      const stream = fs.createWriteStream(filePath);

      const { regular: regularFontPath, bold: boldFontPath } =
        resolvePdfFontPaths();
      const regularFontName = regularFontPath ? "ReportRegular" : "Helvetica";
      const boldFontName =
        boldFontPath || regularFontPath ? "ReportBold" : "Helvetica-Bold";

      if (regularFontPath) {
        doc.registerFont("ReportRegular", regularFontPath);
      }
      if (boldFontPath) {
        doc.registerFont("ReportBold", boldFontPath);
      } else if (regularFontPath) {
        doc.registerFont("ReportBold", regularFontPath);
      }

      doc.pipe(stream);

      doc.on("error", (err) => {
        console.error("[PDF] Document error:", err);
        reject(err);
      });

      stream.on("error", (err) => {
        console.error("[PDF] Stream error:", err);
        reject(err);
      });

      const tableX = 40;
      const headerFontSize = 9;
      const rowFontSize = 8;

      if (isSingleEmployee) {
        // Single employee: per-day format
        const dayRows = [];
        let totalHours = 0;
        data.forEach((dayData) => {
          const user = dayData.users[0];
          if (!user) return;
          const hours = toNumericHours(user.total_hours);
          totalHours += hours;
          dayRows.push({
            date: dayData.date,
            first_in: user.clock_in ? formatTime(user.clock_in) : "-",
            last_out: user.clock_out ? formatTime(user.clock_out) : "-",
            worked_time: formatPayrollDuration(hours),
          });
        });
        const employeeName = data[0]?.users[0]
          ? `${data[0].users[0].first_name} ${data[0].users[0].last_name}`
          : "";
        const summaryDateLabel = getReportDateLabel(dateFrom, dateTo, data[0]?.date, texts);

        const singleColWidths = { date: 90, firstIn: 70, lastOut: 70, hours: 100 };
        const singleTableWidth = Object.values(singleColWidths).reduce((s, w) => s + w, 0);

        renderPdfTitle(
          doc,
          `${texts.reportTitle} - ${employeeName}`,
          `${texts.dateLabel}: ${summaryDateLabel}`,
          regularFontName,
          boldFontName
        );
        doc.moveDown(0.2);
        doc
          .font(regularFontName)
          .fontSize(9)
          .fillColor("#6B7280")
          .text(`${texts.generatedLabel}: ${formatDateTime(new Date())}`, {
            align: "center",
          });
        doc.moveDown(1);

        const tableStartY = doc.y;
        doc.rect(tableX, tableStartY, singleTableWidth, 20).fill("#4F46E5");
        doc.font(boldFontName).fontSize(headerFontSize).fillColor("#FFFFFF");
        let xPos = tableX + 5;
        doc.text(texts.dateLabel, xPos, tableStartY + 6, { width: singleColWidths.date - 10 });
        xPos += singleColWidths.date;
        doc.text(texts.firstIn, xPos, tableStartY + 6, { width: singleColWidths.firstIn - 10 });
        xPos += singleColWidths.firstIn;
        doc.text(texts.lastOut, xPos, tableStartY + 6, { width: singleColWidths.lastOut - 10 });
        xPos += singleColWidths.lastOut;
        doc.text(texts.workedTime, xPos, tableStartY + 6, { width: singleColWidths.hours - 10 });

        let rowY = tableStartY + 20;
        let isEven = true;
        dayRows.forEach((r) => {
          const bgColor = isEven ? "#FFFFFF" : "#F9FAFB";
          doc.rect(tableX, rowY, singleTableWidth, 16).fill(bgColor);
          doc.font(regularFontName).fontSize(rowFontSize).fillColor("#111827");
          xPos = tableX + 5;
          doc.text(r.date, xPos, rowY + 5, { width: singleColWidths.date - 10 });
          xPos += singleColWidths.date;
          doc.text(r.first_in, xPos, rowY + 5, { width: singleColWidths.firstIn - 10 });
          xPos += singleColWidths.firstIn;
          doc.text(r.last_out, xPos, rowY + 5, { width: singleColWidths.lastOut - 10 });
          xPos += singleColWidths.lastOut;
          doc.fillColor("#059669");
          doc.text(r.worked_time, xPos, rowY + 5, { width: singleColWidths.hours - 10 });
          doc.fillColor("#111827");
          rowY += 16;
          isEven = !isEven;
        });

        // Total row
        const bgColor = "#E5E7EB";
        doc.rect(tableX, rowY, singleTableWidth, 16).fill(bgColor);
        doc.font(boldFontName).fontSize(rowFontSize).fillColor("#111827");
        xPos = tableX + 5;
        doc.text(texts.total, xPos, rowY + 5, { width: singleColWidths.date - 10 });
        xPos += singleColWidths.date + singleColWidths.firstIn + singleColWidths.lastOut;
        doc.fillColor("#059669");
        doc.text(formatPayrollDuration(totalHours), xPos, rowY + 5, {
          width: singleColWidths.hours - 10,
        });
        doc.fillColor("#111827");
      } else {
        // All/multiple employees: summary format
        const summary = buildSummaryFromGroupedData(data);
        const summaryDateLabel = getReportDateLabel(dateFrom, dateTo, data[0]?.date, texts);
        const baseSummaryColWidths = { name: 140, hours: 92 };
        if (fields.includes("email")) baseSummaryColWidths.email = 100;
        if (fields.includes("workDays")) baseSummaryColWidths.workDays = 60;
        if (fields.includes("clockIn")) baseSummaryColWidths.clockIn = 60;
        if (fields.includes("clockOut")) baseSummaryColWidths.clockOut = 60;
        if (fields.includes("averageHours")) baseSummaryColWidths.averageHours = 80;
        if (fields.includes("sessions")) baseSummaryColWidths.sessions = 45;
        if (fields.includes("breakTime")) baseSummaryColWidths.breakTime = 80;

        const scaled = scalePdfTableToFit(baseSummaryColWidths, doc, tableX);
        const summaryColWidths = scaled.colWidths;
        const summaryTableWidth = scaled.tableWidth;
        const summaryHeaderFontSize = scaled.headerFontSize;
        const summaryRowFontSize = scaled.rowFontSize;
        const summaryRowHeight = scaled.rowHeight;
        const summaryCellPadding = scaled.cellPadding;

        renderPdfTitle(
          doc,
          `${texts.reportTitle} - ${texts.summaryTitle}`,
          `${texts.dateLabel}: ${summaryDateLabel}`,
          regularFontName,
          boldFontName
        );
      doc.moveDown(0.2);
      doc
        .font(regularFontName)
        .fontSize(9)
        .fillColor("#6B7280")
        .text(`${texts.generatedLabel}: ${formatDateTime(new Date())}`, {
          align: "center",
        });
      doc.moveDown(1);

      const summaryTableStartY = doc.y;
      const summaryHeaderHeight = 20;
      doc.rect(tableX, summaryTableStartY, summaryTableWidth, summaryHeaderHeight).fill("#4F46E5");
      doc.font(boldFontName).fontSize(summaryHeaderFontSize).fillColor("#FFFFFF");
      let summaryXPos = tableX + summaryCellPadding;
      const headerY = summaryTableStartY + 6;
      doc.text(texts.employee, summaryXPos, headerY, {
        width: summaryColWidths.name - summaryCellPadding * 2,
        ellipsis: true,
      });
      summaryXPos += summaryColWidths.name;
      const pad = summaryCellPadding * 2;
      if (fields.includes("email")) {
        doc.text(texts.email, summaryXPos, headerY, {
          width: summaryColWidths.email - pad,
          ellipsis: true,
        });
        summaryXPos += summaryColWidths.email;
      }
      if (fields.includes("clockIn")) {
        doc.text(texts.firstIn, summaryXPos, headerY, {
          width: summaryColWidths.clockIn - pad,
        });
        summaryXPos += summaryColWidths.clockIn;
      }
      if (fields.includes("clockOut")) {
        doc.text(texts.lastOut, summaryXPos, headerY, {
          width: summaryColWidths.clockOut - pad,
        });
        summaryXPos += summaryColWidths.clockOut;
      }
      doc.text(texts.workedTime, summaryXPos, headerY, {
        width: summaryColWidths.hours - pad,
      });
      summaryXPos += summaryColWidths.hours;
      if (fields.includes("averageHours")) {
        doc.text(texts.averageHours, summaryXPos, headerY, {
          width: summaryColWidths.averageHours - pad,
        });
        summaryXPos += summaryColWidths.averageHours;
      }
      if (fields.includes("sessions")) {
        doc.text(texts.sessionsShort || texts.sessions, summaryXPos, headerY, {
          width: summaryColWidths.sessions - pad,
        });
        summaryXPos += summaryColWidths.sessions;
      }
      if (fields.includes("breakTime")) {
        doc.text(texts.breakTime, summaryXPos, headerY, {
          width: summaryColWidths.breakTime - pad,
        });
        summaryXPos += summaryColWidths.breakTime;
      }
      if (fields.includes("workDays")) {
        doc.text(texts.workDays, summaryXPos, headerY, {
          width: summaryColWidths.workDays - pad,
        });
        summaryXPos += summaryColWidths.workDays;
      }

      let summaryRowY = summaryTableStartY + summaryHeaderHeight;
      let summaryIsEven = true;
      const rowContentY = summaryRowHeight / 2 - 3;
      summary.forEach((user) => {
        const bgColor = summaryIsEven ? "#FFFFFF" : "#F9FAFB";
        doc.rect(tableX, summaryRowY, summaryTableWidth, summaryRowHeight).fill(bgColor);
        doc.font(regularFontName).fontSize(summaryRowFontSize).fillColor("#111827");
        summaryXPos = tableX + summaryCellPadding;
        doc.text(`${user.first_name} ${user.last_name}`, summaryXPos, summaryRowY + rowContentY, {
          width: summaryColWidths.name - pad,
          ellipsis: true,
        });
        summaryXPos += summaryColWidths.name;
        if (fields.includes("email")) {
          doc.text(user.email || "-", summaryXPos, summaryRowY + rowContentY, {
            width: summaryColWidths.email - pad,
            ellipsis: true,
          });
          summaryXPos += summaryColWidths.email;
        }
        if (fields.includes("clockIn")) {
          doc.text(user.first_in ? formatTime(user.first_in) : "-", summaryXPos, summaryRowY + rowContentY, {
            width: summaryColWidths.clockIn - pad,
          });
          summaryXPos += summaryColWidths.clockIn;
        }
        if (fields.includes("clockOut")) {
          doc.text(user.last_out ? formatTime(user.last_out) : "-", summaryXPos, summaryRowY + rowContentY, {
            width: summaryColWidths.clockOut - pad,
          });
          summaryXPos += summaryColWidths.clockOut;
        }
        doc.fillColor("#059669");
        doc.text(formatPayrollDuration(user.total_hours), summaryXPos, summaryRowY + rowContentY, {
          width: summaryColWidths.hours - pad,
          ellipsis: true,
        });
        summaryXPos += summaryColWidths.hours;
        doc.fillColor("#111827");
        if (fields.includes("averageHours")) {
          doc.text(formatPayrollDuration(user.average_hours ?? 0), summaryXPos, summaryRowY + rowContentY, {
            width: summaryColWidths.averageHours - pad,
            ellipsis: true,
          });
          summaryXPos += summaryColWidths.averageHours;
        }
        if (fields.includes("sessions")) {
          doc.text((user.sessions_count ?? 0).toString(), summaryXPos, summaryRowY + rowContentY, {
            width: summaryColWidths.sessions - pad,
          });
          summaryXPos += summaryColWidths.sessions;
        }
        if (fields.includes("breakTime")) {
          doc.text(formatPayrollDuration(user.break_time ?? 0), summaryXPos, summaryRowY + rowContentY, {
            width: summaryColWidths.breakTime - pad,
            ellipsis: true,
          });
          summaryXPos += summaryColWidths.breakTime;
        }
        if (fields.includes("workDays")) {
          doc.text(user.work_days.toString(), summaryXPos, summaryRowY + rowContentY, {
            width: summaryColWidths.workDays - pad,
          });
          summaryXPos += summaryColWidths.workDays;
        }
        summaryRowY += summaryRowHeight;
        summaryIsEven = !summaryIsEven;
      });

        if (isAllEmployeesAndPeriod && includeDetails) {
          const detailHeaderFontSize = 7;
          const detailRowFontSize = 6;
          const detailHeaderHeight = 12;
          const detailRowHeight = 10;
          const detailCellPadding = 3;
          const detailSingleColWidths = { date: 80, firstIn: 60, lastOut: 60, hours: 90 };
          const detailTableWidth = Object.values(detailSingleColWidths).reduce((s, w) => s + w, 0);
          const detailBlockTopMargin = 8;
          const detailBlockBottomMargin = 12;

          const renderEmployeeDetailBlock = (user, dayRows, empTotalHours) => {
            const empName = `${user.first_name} ${user.last_name}`;
            const blockTitleHeight = 28;
            const tableHeight = detailHeaderHeight + (dayRows.length + 1) * detailRowHeight;
            const blockHeight = blockTitleHeight + tableHeight + detailBlockTopMargin + detailBlockBottomMargin;
            const minYForBlock = doc.page.height - 70;
            if (doc.y + blockHeight > minYForBlock) {
              doc.addPage({ layout: useLandscape ? "landscape" : "portrait" });
              doc.y = 65;
            }

            doc.addNamedDestination(`emp_${user.user_id}`);
            doc.font(boldFontName).fontSize(10).fillColor("#1F2937");
            doc.text(empName, tableX, doc.y);
            doc.moveDown(0.15);
            doc.font(regularFontName).fontSize(8).fillColor("#6B7280");
            doc.text(`${texts.dateLabel}: ${summaryDateLabel}`, tableX, doc.y);
            doc.moveDown(0.3);

            const tableStartY = doc.y;
            doc.rect(tableX, tableStartY, detailTableWidth, detailHeaderHeight).fill("#4F46E5");
            doc.font(boldFontName).fontSize(detailHeaderFontSize).fillColor("#FFFFFF");
            let xPos = tableX + detailCellPadding;
            doc.text(texts.dateLabel, xPos, tableStartY + 3, { width: detailSingleColWidths.date - detailCellPadding * 2 });
            xPos += detailSingleColWidths.date;
            doc.text(texts.firstIn, xPos, tableStartY + 3, { width: detailSingleColWidths.firstIn - detailCellPadding * 2 });
            xPos += detailSingleColWidths.firstIn;
            doc.text(texts.lastOut, xPos, tableStartY + 3, { width: detailSingleColWidths.lastOut - detailCellPadding * 2 });
            xPos += detailSingleColWidths.lastOut;
            doc.text(texts.workedTime, xPos, tableStartY + 3, { width: detailSingleColWidths.hours - detailCellPadding * 2 });

            let rowY = tableStartY + detailHeaderHeight;
            let isEven = true;
            dayRows.forEach((r) => {
              const bgColor = isEven ? "#FFFFFF" : "#F9FAFB";
              doc.rect(tableX, rowY, detailTableWidth, detailRowHeight).fill(bgColor);
              doc.font(regularFontName).fontSize(detailRowFontSize).fillColor("#111827");
              xPos = tableX + detailCellPadding;
              doc.text(r.date, xPos, rowY + 2, { width: detailSingleColWidths.date - detailCellPadding * 2 });
              xPos += detailSingleColWidths.date;
              doc.text(r.first_in, xPos, rowY + 2, { width: detailSingleColWidths.firstIn - detailCellPadding * 2 });
              xPos += detailSingleColWidths.firstIn;
              doc.text(r.last_out, xPos, rowY + 2, { width: detailSingleColWidths.lastOut - detailCellPadding * 2 });
              xPos += detailSingleColWidths.lastOut;
              doc.fillColor("#059669");
              doc.text(r.worked_time, xPos, rowY + 2, { width: detailSingleColWidths.hours - detailCellPadding * 2 });
              doc.fillColor("#111827");
              rowY += detailRowHeight;
              isEven = !isEven;
            });

            doc.rect(tableX, rowY, detailTableWidth, detailRowHeight).fill("#E5E7EB");
            doc.font(boldFontName).fontSize(detailRowFontSize).fillColor("#111827");
            xPos = tableX + detailCellPadding;
            doc.text(texts.total, xPos, rowY + 2, { width: detailSingleColWidths.date - detailCellPadding * 2 });
            xPos += detailSingleColWidths.date + detailSingleColWidths.firstIn + detailSingleColWidths.lastOut;
            doc.fillColor("#059669");
            doc.text(formatPayrollDuration(empTotalHours), xPos, rowY + 2, {
              width: detailSingleColWidths.hours - detailCellPadding * 2,
            });
            doc.fillColor("#111827");
            doc.y = rowY + detailRowHeight + detailBlockBottomMargin;
          };

          doc.moveDown(0.5);
          const tocTitle = texts.tableOfContents || "Table of Contents";
          doc.font(boldFontName).fontSize(11).fillColor("#1F2937");
          doc.text(tocTitle, tableX, doc.y);
          doc.moveDown(0.3);
          summary.forEach((user) => {
            const empName = `${user.first_name} ${user.last_name}`;
            const destName = `emp_${user.user_id}`;
            if (doc.y > doc.page.height - 120) {
              doc.addPage({ layout: useLandscape ? "landscape" : "portrait" });
              doc.y = 65;
            }
            doc.font(regularFontName).fontSize(9).fillColor("#2563EB");
            doc.text(empName, tableX, doc.y, { goTo: destName, underline: true });
            doc.moveDown(0.2);
          });
          doc.moveDown(0.5);
          if (doc.y > doc.page.height - 150) {
            doc.addPage({ layout: useLandscape ? "landscape" : "portrait" });
            doc.y = 65;
          }

          summary.forEach((user) => {
            const dayRows = [];
            let empTotalHours = 0;
            data.forEach((dayData) => {
              const dayUser = dayData.users.find((u) => u.user_id === user.user_id);
              if (!dayUser) return;
              const hours = toNumericHours(dayUser.total_hours);
              empTotalHours += hours;
              dayRows.push({
                date: dayData.date,
                first_in: dayUser.clock_in ? formatTime(dayUser.clock_in) : "-",
                last_out: dayUser.clock_out ? formatTime(dayUser.clock_out) : "-",
                worked_time: formatPayrollDuration(hours),
              });
            });
            renderEmployeeDetailBlock(user, dayRows, empTotalHours);
          });
        }
      }

      // Footer and page headers on all pages
      console.log("[PDF] Adding page numbers and headers...");
      const pageRange = doc.bufferedPageRange();
      const headerText = texts.monthlyDetails || "Work Time Report - Monthly Details";
      for (let i = 0; i < pageRange.count; i++) {
        const pageNumber = pageRange.start + i;
        doc.switchToPage(pageNumber);
        if (pageNumber > 0) {
          doc.font(regularFontName).fontSize(8).fillColor("#6B7280");
          doc.text(headerText, tableX, 45);
        }
        doc
          .font(regularFontName)
          .fontSize(8)
          .fillColor("#9CA3AF")
          .text(
            `${texts.page} ${i + 1} ${texts.of} ${pageRange.count}`,
            40,
            doc.page.height - 50,
            {
              align: "center",
              width: doc.page.width - 80,
            }
          );
      }

      console.log("[PDF] Finalizing document...");
      doc.end();

      stream.on("finish", () => {
        console.log("[PDF] Document generated successfully!");
        resolve(filePath);
      });
      stream.on("error", reject);
    } catch (error) {
      console.error("[PDF] Generation error:", error);
      reject(error);
    }
  });
};

// Build per-employee summary for the whole period (matches profile totals)
const buildSummaryFromGroupedData = (groupedData) => {
  const byUser = {};
  groupedData.forEach((dayData) => {
    dayData.users.forEach((user) => {
      const uid = user.user_id;
      if (!byUser[uid]) {
        byUser[uid] = {
          user_id: uid,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          total_hours: 0,
          work_days: 0,
          sessions_count: 0,
          break_time: 0,
          first_in: null,
          last_out: null,
        };
      }
      const hours = toNumericHours(user.total_hours);
      byUser[uid].total_hours += hours;
      byUser[uid].work_days += 1;
      byUser[uid].sessions_count += user.sessions_count || 0;
      if (user.clock_in && user.clock_out) {
        const span = (new Date(user.clock_out) - new Date(user.clock_in)) / (1000 * 60 * 60);
        byUser[uid].break_time += Math.max(0, span - hours);
      }
      if (user.clock_in) {
        if (!byUser[uid].first_in || new Date(user.clock_in) < new Date(byUser[uid].first_in)) {
          byUser[uid].first_in = user.clock_in;
        }
      }
      if (user.clock_out) {
        if (!byUser[uid].last_out || new Date(user.clock_out) > new Date(byUser[uid].last_out)) {
          byUser[uid].last_out = user.clock_out;
        }
      }
    });
  });
  return Object.values(byUser)
    .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`))
    .map((u) => ({
      ...u,
      total_hours: u.total_hours.toFixed(2),
      average_hours: u.work_days > 0 ? (u.total_hours / u.work_days).toFixed(2) : "0",
    }));
};

// Helper function to group time logs by date, then by user
const groupByDateAndUser = (data) => {
  const groupedByDate = {};

  data.forEach((log) => {
    // Extract date from clock_in
    const date = log.clock_in ? log.clock_in.split("T")[0].split(" ")[0] : null;
    if (!date) return;

    if (!groupedByDate[date]) {
      groupedByDate[date] = {};
    }

    const userId = log.user_id;
    if (!groupedByDate[date][userId]) {
      groupedByDate[date][userId] = {
        user_id: log.user_id,
        first_name: log.first_name,
        last_name: log.last_name,
        email: log.email,
        clock_in: log.clock_in, // Earliest clock in
        clock_out: null, // Latest clock out
        date: date,
        total_hours: 0,
        sessions: [],
      };
    }

    // Add this session to the group
    if (log.clock_out) {
      // Calculate hours for this session
      const clockInTime = new Date(log.clock_in);
      const clockOutTime = new Date(log.clock_out);
      const hours = (clockOutTime - clockInTime) / (1000 * 60 * 60);

      groupedByDate[date][userId].total_hours += hours;
      groupedByDate[date][userId].sessions.push({
        clock_in: log.clock_in,
        clock_out: log.clock_out,
        hours: hours,
      });

      // Update latest clock out
      if (
        !groupedByDate[date][userId].clock_out ||
        new Date(log.clock_out) >
          new Date(groupedByDate[date][userId].clock_out)
      ) {
        groupedByDate[date][userId].clock_out = log.clock_out;
      }

      // Update earliest clock in
      if (
        new Date(log.clock_in) < new Date(groupedByDate[date][userId].clock_in)
      ) {
        groupedByDate[date][userId].clock_in = log.clock_in;
      }
    }
  });

  // Convert to format: { date: "2025-10-24", users: [...] }
  const result = Object.keys(groupedByDate)
    .sort()
    .map((date) => ({
      date: date,
      users: Object.values(groupedByDate[date]).map((user) => ({
        ...user,
        total_hours: user.total_hours.toFixed(2),
        sessions_count: user.sessions.length,
      })),
    }));

  return result;
};

// Generate report
const generateReport = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId } = req.params;
    const {
      format = "excel",
      fields = [],
      dateFrom,
      dateTo,
      userIds,
      includeDetails = false,
      language = "en",
    } = req.body;
    const reportLanguage = normalizeReportLanguage(language);

    console.log("Generate report request:", {
      companyId,
      format,
      fields,
      dateFrom,
      dateTo,
      userIds,
      language: reportLanguage,
    });

    if (!["excel", "pdf"].includes(format)) {
      return res
        .status(400)
        .json({ error: 'Invalid format. Use "excel" or "pdf"' });
    }

    if (!fields || fields.length === 0) {
      return res.status(400).json({ error: "At least one field is required" });
    }

    // Build query
    let query = `
      SELECT 
        tl.*,
        u.first_name, u.last_name, u.email
      FROM time_logs tl
      JOIN users u ON tl.user_id = u.id
      WHERE tl.company_id = ?
    `;

    const params = [companyId];

    if (userIds && userIds.length > 0) {
      query += ` AND tl.user_id IN (${userIds.map(() => "?").join(",")})`;
      params.push(...userIds);
    }

    if (dateFrom) {
      // Convert date to start of day
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      query += " AND datetime(tl.clock_in) >= datetime(?)";
      params.push(fromDate.toISOString());
    }

    if (dateTo) {
      // Convert date to end of day
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      query += " AND datetime(tl.clock_in) <= datetime(?)";
      params.push(toDate.toISOString());
    }

    query += " ORDER BY tl.clock_in DESC";

    console.log("SQL Query:", query);
    console.log("SQL Params:", params);

    const data = db.prepare(query).all(...params);

    console.log("Query result count:", data.length);

    if (data.length === 0) {
      // Check if there are ANY time logs for this company
      const totalLogs = db
        .prepare("SELECT COUNT(*) as count FROM time_logs WHERE company_id = ?")
        .get(companyId);

      console.log("Total time logs for company:", totalLogs.count);

      if (totalLogs.count === 0) {
        return res.status(404).json({
          error:
            "No time tracking data available. Please clock in/out first to generate reports.",
        });
      } else {
        return res.status(404).json({
          error: `No data found for the specified filters. Try removing date filters or selecting different employees. (Total logs: ${totalLogs.count})`,
        });
      }
    }

    // Group data by date, then by user
    console.log("Grouping data by date and user...");
    const groupedData = groupByDateAndUser(data);
    console.log("Grouped by dates count:", groupedData.length);
    if (groupedData.length > 0) {
      console.log(
        "Grouped data sample:",
        JSON.stringify(groupedData[0], null, 2)
      );
    }

    // Generate descriptive filename
    const fileName = generateReportFileName(
      groupedData,
      dateFrom,
      dateTo,
      userIds,
      format,
      reportLanguage
    );
    console.log("Generating file:", fileName, "format:", format);

    let filePath;
    try {
      if (format === "excel") {
        console.log("Calling generateExcel...");
        filePath = await generateExcel(
          groupedData,
          fields,
          fileName,
          dateFrom,
          dateTo,
          reportLanguage,
          userIds,
          includeDetails
        );
        console.log("Excel generated successfully at:", filePath);
      } else {
        console.log("Calling generatePDF...");
        filePath = await generatePDF(
          groupedData,
          fields,
          fileName,
          dateFrom,
          dateTo,
          reportLanguage,
          userIds,
          includeDetails
        );
        console.log("PDF generated successfully at:", filePath);
      }
    } catch (genError) {
      console.error("Error in generate function:", genError);
      throw genError;
    }

    // Save report record
    const stmt = db.prepare(`
      INSERT INTO reports (company_id, file_path, file_name, format, generated_by, date_from, date_to)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      companyId,
      filePath,
      fileName,
      format,
      req.user.id,
      dateFrom || null,
      dateTo || null
    );

    res.json({
      message: "Report generated successfully",
      fileName,
      downloadUrl: `/api/reports/${companyId}/download/${fileName}`,
    });
  } catch (error) {
    console.error("Generate report error:", error);
    res.status(500).json({ error: "Server error while generating report" });
  }
};

// Download report
const downloadReport = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId, fileName } = req.params;

    // Verify report belongs to company
    const report = db
      .prepare(
        `
      SELECT * FROM reports 
      WHERE company_id = ? AND file_name = ?
    `
      )
      .get(companyId, fileName);

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    const filePath = report.file_path;

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Report file not found" });
    }

    res.download(filePath, fileName);
  } catch (error) {
    console.error("Download report error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get company reports
const getReports = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId } = req.params;

    const reports = db
      .prepare(
        `
      SELECT 
        r.*,
        u.first_name, u.last_name
      FROM reports r
      LEFT JOIN users u ON r.generated_by = u.id
      WHERE r.company_id = ?
      ORDER BY r.created_at DESC
      LIMIT 100
    `
      )
      .all(companyId);

    res.json({ reports });
  } catch (error) {
    console.error("Get reports error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Create report configuration
const createReportConfig = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId } = req.params;
    const { name, format, fields, scheduleTime, isAutomatic, template } =
      req.body;

    if (!name || !format || !fields || fields.length === 0) {
      return res
        .status(400)
        .json({ error: "Name, format, and fields are required" });
    }

    const stmt = db.prepare(`
      INSERT INTO report_configs 
      (company_id, name, format, fields, schedule_time, is_automatic, template)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      companyId,
      name,
      format,
      JSON.stringify(fields),
      scheduleTime || null,
      isAutomatic ? 1 : 0,
      template || null
    );

    const config = db
      .prepare("SELECT * FROM report_configs WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json({
      message: "Report configuration created successfully",
      config: {
        ...config,
        fields: JSON.parse(config.fields),
      },
    });
  } catch (error) {
    console.error("Create report config error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get report configurations
const getReportConfigs = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId } = req.params;

    const configs = db
      .prepare(
        `
      SELECT * FROM report_configs
      WHERE company_id = ?
      ORDER BY created_at DESC
    `
      )
      .all(companyId);

    const configsWithParsedFields = configs.map((config) => ({
      ...config,
      fields: JSON.parse(config.fields),
      is_automatic: Boolean(config.is_automatic),
    }));

    res.json({ configs: configsWithParsedFields });
  } catch (error) {
    console.error("Get report configs error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Delete report configuration
const deleteReportConfig = async (req, res) => {
  try {
    const db = await getDatabase();
    const { companyId, configId } = req.params;

    const config = db
      .prepare(
        `
      SELECT * FROM report_configs 
      WHERE id = ? AND company_id = ?
    `
      )
      .get(configId, companyId);

    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    db.prepare("DELETE FROM report_configs WHERE id = ?").run(configId);

    res.json({ message: "Configuration deleted successfully" });
  } catch (error) {
    console.error("Delete report config error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  generateReport,
  downloadReport,
  getReports,
  createReportConfig,
  getReportConfigs,
  deleteReportConfig,
};
