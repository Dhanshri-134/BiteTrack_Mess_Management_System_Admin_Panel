// pages/api/bills/generate-receipt.js
import PDFDocument from "pdfkit";
import axios from "axios";

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      payment,
      userName,
      prefixedUserId,
      userEmail,
      messName,
      stampImageUrl,
      signatureImageUrl,
    } = req.body;

    const doc = new PDFDocument({ size: "A4", margin: 40 });

    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      const base64PDF = pdfData.toString("base64");
      res.status(200).json({ pdf: base64PDF });
    });

    const isCashPayment = payment.paymentMethod.toLowerCase() === "cash";
    const isDailyPayment = payment.paymentType.toLowerCase() === "daily";

    // -------------------------------------------------------------------
    // 🔵 Load Stamp + Signature Images
    // -------------------------------------------------------------------
   let stampImage, signatureImage;
    try {
      if (stampImageUrl) {
        const response = await axios.get(stampImageUrl, { responseType: "arraybuffer" });
        stampImage = response.data;
      }
    } catch (err) {
      console.error("Error loading stamp:", err.message);
    }

    try {
      if (signatureImageUrl) {
        const response = await axios.get(signatureImageUrl, { responseType: "arraybuffer" });
        signatureImage = response.data;
      }
    } catch (err) {
      console.error("Error loading signature:", err.message);
    }


    const amount = payment.amount || 0;
    const receiptNumber = payment.receiptNumber || "N/A";
    const dateFormatted = payment.dateFormatted || new Date().toISOString().split("T")[0];
    const paymentMethod = payment.paymentMethod || "Unknown";
    const paymentType = payment.paymentType || "monthly";

   
    // -------------------------------------------------------------------
    // 🔵 HEADER TITLE
    // -------------------------------------------------------------------
    doc
      .fontSize(22)
      .fillColor("white")
      .rect(40, 40, 515, 40)
      .fill("#FF8C00")
      .stroke()
      .fillColor("white")
      .text(
        isDailyPayment
          ? "DAILY PAYMENT RECEIPT"
          : "MONTHLY PAYMENT RECEIPT",
        0,
        50,
        { align: "center" }
      );

    doc.moveDown(2);

    // -------------------------------------------------------------------
    // 🔵 PAYMENT TYPE BADGE
    // -------------------------------------------------------------------
    const badgeColor = isCashPayment ? "#E8F5E9" : "#E3F2FD";
    const borderColor = isCashPayment ? "#4CAF50" : "#2196F3";
    const textColor = isCashPayment ? "#2E7D32" : "#1565C0";

    doc
      .fillColor(badgeColor)
      .roundRect(180, 100, 220, 25, 12)
      .fill()
      .stroke(borderColor);

    doc
      .fillColor(textColor)
      .fontSize(12)
      .text(
        isCashPayment ? "CASH PAYMENT" : "ONLINE PAYMENT",
        0,
        107,
        { align: "center" }
      );

    doc.moveDown(3);

    // -------------------------------------------------------------------
    // 🔵 RECEIPT DETAILS
    // -------------------------------------------------------------------
    doc
      .fontSize(11)
      .fillColor("#555")
      .text("Receipt No:", 40, 150);
    doc
      .fontSize(14)
      .fillColor("#000")
      .text(payment.receiptNumber, 40, 165);

    doc
      .fontSize(11)
      .fillColor("#555")
      .text("Date:", 400, 150);
    doc
      .fontSize(14)
      .fillColor("#000")
      .text(payment.dateFormatted, 400, 165);

    doc.moveDown();
    doc
      .strokeColor("#999")
      .lineWidth(1)
      .moveTo(40, 200)
      .lineTo(550, 200)
      .stroke();

    doc.moveDown(2);

    // -------------------------------------------------------------------
    // 🔵 PERSONAL DETAILS
    // -------------------------------------------------------------------
    doc
      .fontSize(16)
      .fillColor("#FF8C00")
      .text("PERSONAL DETAILS", 40);

    doc.moveDown();

    addRow(doc, "Name:", userName);
    addRow(doc, "User ID:", prefixedUserId);
    addRow(doc, "Email:", userEmail);
    addRow(doc, "Payment ID:", payment.id);

    doc.moveDown(2);

    // -------------------------------------------------------------------
    // 🔵 PAYMENT DETAILS
    // -------------------------------------------------------------------
    doc
      .fontSize(16)
      .fillColor("#FF8C00")
      .text("PAYMENT DETAILS");

    doc.moveDown();

    addRow(doc, "Payment For:", `${payment.month} ${payment.year}`);
    addRow(
      doc,
      "Billing Period:",
      `${payment.billingStartDate} to ${payment.billingEndDate}`
    );
    addRow(
      doc,
      "Leave Days Count:",
      `${payment.leaveDays} ${payment.leaveDays === 1 ? "day" : "days"}`
    );

    addRow(doc, "Payment Method:", payment.paymentMethod);

    doc.moveDown();
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke("#999");
    doc.moveDown(2);

    // -------------------------------------------------------------------
    // 🔵 TOTAL AMOUNT BOX
    // -------------------------------------------------------------------
    doc
      .roundedRect(40, doc.y, 515, 40, 6)
      .fill("#FFF3E0")
      .stroke("#FF8C00");

    doc
      .fillColor("black")
      .fontSize(14)
      .text("TOTAL PAID AMOUNT", 60, doc.y - 30);

    doc
      .fillColor("#FF8C00")
      .fontSize(18)
      .text(`Rs ${payment.amount.toFixed(2)}`, 400, doc.y - 30);

    doc.moveDown(6);

    // -------------------------------------------------------------------
    // 🔵 STAMP + SIGNATURE
    // -------------------------------------------------------------------
    // Stamp
    if (stampImage) {
      doc.image(stampImage, 40, doc.y, { width: 100 });
    } else {
      doc
        .strokeColor("#aaa")
        .rect(40, doc.y, 100, 100)
        .stroke()
        .fontSize(11)
        .fillColor("#777")
        .text("OFFICIAL\nSTAMP", 55, doc.y + 30, { align: "center" });
    }

    // Signature
    if (signatureImage) {
      doc.image(signatureImage, 400, doc.y, { width: 160 });
    }

    doc.fontSize(10).fillColor("#777")
      .text("Authorized Signature", 400, doc.y + 70);

    doc.fontSize(9)
      .text(messName, 400, doc.y + 85);

    // -------------------------------------------------------------------
    doc.end();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// -------------------------------------------------------------------
// 🔧 Helper Row Builder
// -------------------------------------------------------------------
function addRow(doc, label, value) {
  doc
    .fontSize(12)
    .fillColor("#444")
    .text(label, { continued: true })
    .fillColor("#000")
    .text(` ${value}`);
}
