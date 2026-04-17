import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import PDFDocument from "pdfkit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const DEFAULTS = {
  messId: 5,
  year: 2026,
  month: 3,
  outputDir: path.join(projectRoot, "output", "attendance-pdfs"),
};

const COLORS = {
  teal: "#007170",
  tealLight: "#E6F4F3",
  text: "#111827",
  muted: "#6B7280",
  border: "#D1D5DB",
  present: "#22C55E",
  absent: "#EF4444",
  owner: "#FACC15",
  missing: "#E5E7EB",
  white: "#FFFFFF",
};

const ISO_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function printHelp() {
  console.log(`
Usage:
  node scripts/generate-mess-attendance-pdf.mjs [options]

Options:
  --messId <number>     Mess ID to export. Default: ${DEFAULTS.messId}
  --year <number>       Report year. Default: ${DEFAULTS.year}
  --month <number>      Report month (1-12). Default: ${DEFAULTS.month}
  --output <path>       Full output PDF path
  --outputDir <path>    Output directory if --output is not passed
  --help                Show this help

Examples:
  node scripts/generate-mess-attendance-pdf.mjs
  node scripts/generate-mess-attendance-pdf.mjs --messId 5 --month 3 --year 2026
  `);
}

function parseArgs(argv) {
  const options = { ...DEFAULTS };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextValue = argv[index + 1];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--messId" && nextValue) {
      options.messId = Number(nextValue);
      index += 1;
      continue;
    }

    if (arg === "--year" && nextValue) {
      options.year = Number(nextValue);
      index += 1;
      continue;
    }

    if (arg === "--month" && nextValue) {
      options.month = Number(nextValue);
      index += 1;
      continue;
    }

    if (arg === "--output" && nextValue) {
      options.output = path.resolve(process.cwd(), nextValue);
      index += 1;
      continue;
    }

    if (arg === "--outputDir" && nextValue) {
      options.outputDir = path.resolve(process.cwd(), nextValue);
      index += 1;
    }
  }

  return options;
}

function stripWrappingQuotes(value) {
  if (!value) return value;
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key]) continue;

    process.env[key] = stripWrappingQuotes(rawValue);
  }
}

function loadLocalEnv() {
  loadEnvFile(path.join(projectRoot, ".env.local"));
  loadEnvFile(path.join(projectRoot, ".env"));
}

function getConnectionString() {
  return process.env.SUPABASE_DB_URL || process.env.SUPABASE_DB_IP_URL || "";
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function monthName(year, month) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function monthLabelOnly(year, month) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function normalizeAttendanceStatus(value) {
  if (value === true || value === false || value === null) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "present", "p", "1", "yes"].includes(normalized)) return true;
    if (["false", "absent", "a", "0", "no"].includes(normalized)) return false;
    if (["null", "", "none", "na", "n/a"].includes(normalized)) return null;
  }

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  return null;
}

function normalizeAttendanceMap(attendanceMap) {
  if (!attendanceMap || typeof attendanceMap !== "object" || Array.isArray(attendanceMap)) {
    return {};
  }

  return Object.entries(attendanceMap)
    .filter(([dateKey]) => ISO_DATE_KEY_PATTERN.test(String(dateKey)))
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .reduce((result, [dateKey, value]) => {
      result[dateKey] = normalizeAttendanceStatus(value);
      return result;
    }, {});
}

function getDisplayName(user) {
  if (user.full_name && String(user.full_name).trim()) {
    return String(user.full_name).trim();
  }

  if (user.name && String(user.name).trim()) {
    return String(user.name).trim();
  }

  return `Student ${user.id}`;
}

function formatContactInfo(value) {
  if (!value) return "";

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return formatContactInfo(parsed);
    } catch {
      return value;
    }
  }

  if (typeof value === "object") {
    return Object.values(value)
      .filter(Boolean)
      .join(" | ");
  }

  return String(value);
}

function getLogoPath() {
  const fallback = path.join(projectRoot, "public", "Assets", "logo_Bite_Track.png");
  return fs.existsSync(fallback) ? fallback : null;
}

function getOutputPath({ messId, year, month, output, outputDir }) {
  if (output) return output;

  const fileName = `mess_${messId}_attendance_${year}_${pad2(month)}.pdf`;
  return path.join(outputDir, fileName);
}

function getMonthDateRange(year, month) {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const nextMonthStart = new Date(Date.UTC(year, month, 1));
  return { monthStart, nextMonthStart };
}

async function fetchMess(pool, messId) {
  const query = `
    SELECT id, name, email, location, logo, contact_info
    FROM messes
    WHERE id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [messId]);
  if (rows.length === 0) {
    throw new Error(`No mess found for mess_id=${messId}`);
  }

  return rows[0];
}

async function fetchUsers(pool, messId, year, month) {
  const query = `
    SELECT
      u.id,
      u.name,
      u.full_name,
      u.email,
      u.phone,
      u.room_no,
      u.hostel_name,
      u.course,
      u.date_of_joining,
      u.status,
      u.role,
      ma.days_present,
      ma.attendance_map
    FROM users u
    LEFT JOIN monthly_attendance ma
      ON ma.user_id = u.id
     AND ma.mess_id = $1
     AND ma.year = $2
     AND ma.month = $3
    WHERE u.mess_id = $1
      AND COALESCE(u.role, 'user') = 'user'
      AND COALESCE(u.status, 'Active') = 'Active'
      AND COALESCE(u.is_active, true) = true
    ORDER BY COALESCE(NULLIF(u.full_name, ''), u.name, u.email)
  `;

  const { rows } = await pool.query(query, [messId, year, month]);
  return rows;
}

async function fetchOwnerMarkedDates(pool, messId, year, month) {
  const { monthStart, nextMonthStart } = getMonthDateRange(year, month);
  const query = `
    SELECT user_id, att_date
    FROM "Owner_Marked_attendance"
    WHERE mess_id = $1
      AND att_date >= $2
      AND att_date < $3
  `;

  const { rows } = await pool.query(query, [messId, monthStart, nextMonthStart]);

  return rows.reduce((result, row) => {
    const key = String(row.user_id);
    const isoDate = new Date(row.att_date).toISOString().slice(0, 10);

    if (!result.has(key)) {
      result.set(key, new Set());
    }

    result.get(key).add(isoDate);
    return result;
  }, new Map());
}

function buildReportRows(users, ownerMarkedByUser, year, month) {
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  return users.map((user, index) => {
    const normalizedMap = normalizeAttendanceMap(user.attendance_map);
    const ownerMarkedDates = ownerMarkedByUser.get(String(user.id)) || new Set();

    let presentCount = 0;

    const dayStates = Array.from({ length: totalDaysInMonth }, (_, position) => {
      const day = position + 1;
      const isoDate = `${year}-${pad2(month)}-${pad2(day)}`;

      if (ownerMarkedDates.has(isoDate)) {
        presentCount += 1;
        return { day, isoDate, state: "owner" };
      }

      if (normalizedMap[isoDate] === true) {
        presentCount += 1;
        return { day, isoDate, state: "present" };
      }

      if (normalizedMap[isoDate] === false) {
        return { day, isoDate, state: "absent" };
      }

      return { day, isoDate, state: "missing" };
    });

    return {
      index: index + 1,
      id: user.id,
      name: getDisplayName(user),
      email: user.email || "-",
      phone: user.phone || "-",
      roomCourse: [
        user.room_no ? `Room: ${user.room_no}` : "Room: -",
        user.course || user.hostel_name || "-",
      ].join("\n"),
      joinedOn: formatDate(user.date_of_joining),
      presentCount: Number(user.days_present ?? presentCount ?? 0) || presentCount,
      dayStates,
    };
  });
}

function drawFilledCircle(doc, x, y, radius, fillColor, text, textColor) {
  doc.save();
  doc.lineWidth(0.6);
  doc.fillColor(fillColor).strokeColor("#9CA3AF");
  doc.circle(x, y, radius).fillAndStroke();
  doc.restore();

  doc
    .fillColor(textColor)
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .text(String(text), x - radius, y - 3.2, {
      width: radius * 2,
      align: "center",
    });
}

function drawFirstPageHeader(doc, mess, reportLabel) {
  const pageWidth = doc.page.width;
  const leftMargin = 24;
  const rightMargin = 24;
  const topBarHeight = 52;
  const logoPath = getLogoPath();
  const rightTextWidth = 270;
  const rightX = pageWidth - rightMargin - rightTextWidth;

  doc.save();
  doc.fillColor(COLORS.teal).rect(0, 0, pageWidth, topBarHeight).fill();
  doc.restore();

  if (logoPath) {
    doc.image(logoPath, 16, 5, { fit: [30, 30], align: "left", valign: "center" });
  }

  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(15);
  doc.text(mess.name || `Mess ${mess.id}`, rightX, 8, {
    width: rightTextWidth,
    align: "right",
  });

  doc.font("Helvetica").fontSize(8);
  doc.text(mess.location || "", rightX, 21, {
    width: rightTextWidth,
    align: "right",
  });
  doc.text(mess.email || "", rightX, 30, {
    width: rightTextWidth,
    align: "right",
  });

  const contactLine = formatContactInfo(mess.contact_info);
  if (contactLine) {
    doc.text(contactLine, rightX, 39, {
      width: rightTextWidth,
      align: "right",
    });
  }

 

  doc.fillColor(COLORS.text).font("Helvetica-Bold").fontSize(14);
  doc.text("Monthly Attendance Report", leftMargin, 62, { width: 250 });

  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9);
  doc.text(reportLabel, leftMargin, 76, { width: 300 });

  return 94;
}

function getContinuationTopY() {
  return 24;
}

function getColumns(doc) {
  const left = 24;
  const innerWidth = doc.page.width - left * 2;
  const fixedWidths = [28, 150, 180, 110];
  const calendarWidth = innerWidth - fixedWidths.reduce((sum, value) => sum + value, 0);

  const widths = [...fixedWidths, calendarWidth];
  const labels = ["#", "Student", "Email", "Room / Course","Attendance Calendar"];

  let x = left;
  return labels.map((label, index) => {
    const column = {
      label,
      x,
      width: widths[index],
    };
    x += widths[index];
    return column;
  });
}

function drawTableHeader(doc, columns, y) {
  const height = 22;

  for (const column of columns) {
    doc.save();
    doc.fillColor(COLORS.tealLight).strokeColor(COLORS.border).lineWidth(0.8);
    doc.rect(column.x, y, column.width, height).fillAndStroke();
    doc.restore();

    doc
      .fillColor(COLORS.text)
      .font("Helvetica-Bold")
      .fontSize(8)
      .text(column.label, column.x + 4, y + 7, {
        width: column.width - 8,
        align: column.label === "Days" || column.label === "#" ? "center" : "left",
      });
  }

  return height;
}

function drawTextCell(doc, text, x, y, width, height, options = {}) {
  const {
    font = "Helvetica",
    fontSize = 8.5,
    color = COLORS.text,
    align = "left",
    bold = false,
  } = options;

  doc
    .fillColor(color)
    .font(bold ? "Helvetica-Bold" : font)
    .fontSize(fontSize)
    .text(String(text ?? "-"), x + 5, y + 7, {
      width: width - 10,
      height: height - 12,
      align,
      ellipsis: true,
    });
}

function drawCalendarCell(doc, x, y, width, height, dayStates) {
  const paddingX = 10;
  const topY = y + 23;
  const bottomY = y + 54;
  const topRowDays = dayStates.slice(0, 16);
  const bottomRowDays = dayStates.slice(16);
  const topSpacing = (width - paddingX * 2) / 16;
  const bottomSpacing = (width - paddingX * 2) / 15;
  const radius = Math.max(4.5, Math.min(6.1, (topSpacing - 2) / 2));

  const colorByState = {
    present: COLORS.present,
    absent: COLORS.absent,
    owner: COLORS.owner,
    missing: COLORS.missing,
  };

  for (let index = 0; index < topRowDays.length; index += 1) {
    const day = topRowDays[index];
    const circleX = x + paddingX + topSpacing * index + topSpacing / 2;
    const textColor = day.state === "owner" || day.state === "missing" ? COLORS.text : COLORS.white;

    drawFilledCircle(doc, circleX, topY, radius, colorByState[day.state], day.day, textColor);
  }

  for (let index = 0; index < bottomRowDays.length; index += 1) {
    const day = bottomRowDays[index];
    const circleX = x + paddingX + bottomSpacing * index + bottomSpacing / 2;
    const textColor = day.state === "owner" || day.state === "missing" ? COLORS.text : COLORS.white;

    drawFilledCircle(doc, circleX, bottomY, radius, colorByState[day.state], day.day, textColor);
  }

}

function drawRow(doc, columns, y, row) {
  const rowHeight = 80;

  for (const column of columns) {
    doc.save();
    doc.fillColor(COLORS.white).strokeColor(COLORS.border).lineWidth(0.8);
    doc.rect(column.x, y, column.width, rowHeight).fillAndStroke();
    doc.restore();
  }

  drawTextCell(doc, row.index, columns[0].x, y + 24, columns[0].width, 24, {
    align: "center",
    bold: true,
    fontSize: 9,
  });

  drawTextCell(
    doc,
    `${row.name}\nMobile: ${row.phone}`,
    columns[1].x,
    y,
    columns[1].width,
    rowHeight,
    { bold: true, fontSize: 8.7 }
  );

  drawTextCell(
    doc,
    `${row.email}\nJoined: ${row.joinedOn}`,
    columns[2].x,
    y,
    columns[2].width,
    rowHeight,
    { fontSize: 8.2 }
  );

  drawTextCell(doc, row.roomCourse, columns[3].x, y, columns[3].width, rowHeight, {
    fontSize: 8.2,
  });



  drawCalendarCell(doc, columns[4].x, y, columns[4].width, rowHeight, row.dayStates);

  return rowHeight;
}

async function generatePdf({ mess, rows, year, month, messId, outputPath }) {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 0,
    autoFirstPage: true,
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  const reportLabel = `Month: ${monthLabelOnly(year, month)}`;
  const bottomMargin = 24;
  const columns = getColumns(doc);

  let currentY = drawFirstPageHeader(doc, mess, reportLabel);
  currentY += drawTableHeader(doc, columns, currentY);

  for (const row of rows) {
    const requiredHeight = 80;
    if (currentY + requiredHeight > doc.page.height - bottomMargin) {
      doc.addPage();
      currentY = getContinuationTopY();
      currentY += drawTableHeader(doc, columns, currentY);
    }

    currentY += drawRow(doc, columns, currentY, row);
  }

  if (rows.length === 0) {
    doc
      .fillColor(COLORS.muted)
      .font("Helvetica")
      .fontSize(11)
      .text("No users matched the selected mess and month filters.", 24, currentY + 18);
  }

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (!Number.isInteger(options.messId) || options.messId <= 0) {
    throw new Error("messId must be a positive integer");
  }

  if (!Number.isInteger(options.year) || options.year < 2000) {
    throw new Error("year must be a valid 4-digit year");
  }

  if (!Number.isInteger(options.month) || options.month < 1 || options.month > 12) {
    throw new Error("month must be between 1 and 12");
  }

  loadLocalEnv();

  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error("Missing SUPABASE_DB_URL or SUPABASE_DB_IP_URL in environment");
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });

  try {
    const mess = await fetchMess(pool, options.messId);
    const users = await fetchUsers(pool, options.messId, options.year, options.month);
    const ownerMarkedByUser = await fetchOwnerMarkedDates(
      pool,
      options.messId,
      options.year,
      options.month
    );
    const rows = buildReportRows(users, ownerMarkedByUser, options.year, options.month);
    const outputPath = getOutputPath(options);

    await generatePdf({
      mess,
      rows,
      year: options.year,
      month: options.month,
      messId: options.messId,
      outputPath,
    });

    console.log(`PDF generated successfully: ${outputPath}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Failed to generate attendance PDF:", error.message);
  process.exitCode = 1;
});
