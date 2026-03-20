const fs = require('fs');

const idxPath = 'pages/billing/index.js';
let content = fs.readFileSync(idxPath, 'utf8');

// 1. Fix React import
content = content.replace(
  'import { useEffect, useState } from "react";',
  'import React, { useEffect, useState } from "react";'
);

// 2. Fix Desktop mapping
const desktopMatchOriginal = \`<tbody>
                          {filtered.map((b, idx) => (
                            <tr key={b.user_id}>\`;
const desktopMatchReplace = \`<tbody>
                          {filtered.map((b, idx) => (
                            <React.Fragment key={b.user_id}>
                            <tr style={{ background: expandedCard === b.user_id ? "#f3f4f6" : "transparent" }}>\`;
content = content.replace(desktopMatchOriginal, desktopMatchReplace);

// 3. Desktop toggle button for actions
const desktopButtonOriginal = \`<button onClick={() => { setExpandedCard(b.user_id); setOpenActions(null); }}>{t("paymentHistory")}</button>\`;
const desktopButtonReplace = \`<button onClick={() => { setExpandedCard(expandedCard === b.user_id ? null : b.user_id); setOpenActions(null); }}>{expandedCard === b.user_id ? t("closeHistory") : t("paymentHistory")}</button>\`;
content = content.replace(desktopButtonOriginal, desktopButtonReplace);

// 4. Desktop History append after </tr>
const endTrOriginal = \`                            </tr>
                          ))}
                        </tbody>\`;
const endTrReplace = \`                            </tr>
                            {expandedCard === b.user_id && (
                              <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                                <td colSpan="13" style={{ padding: "0" }}>
                                  <div style={{ padding: "16px 24px" }}>
                                    <strong style={{ display: "block", marginBottom: "12px", fontSize: "15px", color: "#111827" }}>{t("paymentHistory")}</strong>
                                    <table style={{ width: "100%", background: "white", borderRadius: "8px", borderCollapse: "collapse", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                                      <thead>
                                        <tr style={{ background: "#f3f4f6", borderBottom: "1px solid #e5e7eb" }}>
                                          <th style={{ padding: "10px", textAlign: "left", fontSize: "13px", color: "#6b7280", fontWeight: "600" }}>{t("month")}</th>
                                          <th style={{ padding: "10px", textAlign: "left", fontSize: "13px", color: "#6b7280", fontWeight: "600" }}>{t("duration")}</th>
                                          <th style={{ padding: "10px", textAlign: "right", fontSize: "13px", color: "#6b7280", fontWeight: "600" }}>{t("amount")}</th>
                                          <th style={{ padding: "10px", textAlign: "center", fontSize: "13px", color: "#6b7280", fontWeight: "600" }}>{t("status")}</th>
                                          <th style={{ padding: "10px", textAlign: "center", fontSize: "13px", color: "#6b7280", fontWeight: "600" }}>{t("actions")}</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {b.history.sort((a, y) => { if (a.year === y.year) return y.month - a.month; return y.year - a.year }).map(h => (
                                          <tr key={\`\${h.user_id}-\${h.year}-\${h.month}\`} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                            <td style={{ padding: "10px", fontWeight: "500", color: "#111827", fontSize: "14px" }}>{h.month}/{h.year}</td>
                                            <td style={{ padding: "10px", color: "#6b7280", fontSize: "13px" }}>{h.start_date || "-"} {t("to")} {h.end_date || "-"}</td>
                                            <td style={{ padding: "10px", textAlign: "right", fontWeight: "600", color: h.paid ? "#10b981" : "#ef4444" }}>₹{getBillAmount(h).toFixed(2)}</td>
                                            <td style={{ padding: "10px", textAlign: "center" }}>
                                              <span style={{ background: h.paid ? "#d1fae5" : "#fee2e2", color: h.paid ? "#065f46" : "#991b1b", padding: "4px 10px", borderRadius: "9999px", fontSize: "12px", fontWeight: "500" }}>
                                                {h.paid ? t("paid") : t("pending")}
                                              </span>
                                            </td>
                                            <td style={{ padding: "10px", textAlign: "center" }}>
                                              <button onClick={() => openPaymentModal(h, true)} style={{ padding: "6px 14px", background: h.paid ? "#f3f4f6" : "#2563EB", color: h.paid ? "black" : "white", border: "1px solid", borderColor: h.paid ? "#d1d5db" : "transparent", borderRadius: "6px", fontSize: "13px", fontWeight: "500", cursor: "pointer", transition: "0.2s" }} onMouseOver={(e) => {if(!h.paid) e.currentTarget.style.background = "#1d4ed8"}} onMouseOut={(e) => {if(!h.paid) e.currentTarget.style.background = "#2563EB"}}>
                                                {h.paid ? "Edit Paid Amount" : t("markPaid")}
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                            </React.Fragment>
                          ))}
                        </tbody>\`;
content = content.replace(endTrOriginal, endTrReplace);

// 5. Mobile header
const mobileOriginal = \`                            <div className={styles.headerLeft}>
                              <strong>{idx + 1}. {b.name}</strong><br/>
                              <span style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>{b.email}</span>
                              <div style={{ marginTop: "10px" }}>
                                <button className={styles.btnAdvance} onClick={(e) => { e.stopPropagation(); openAdvanceModal(b); }}><FaMoneyBillWave size={20} /></button>
                                <button className={styles.inlineWhatsapp} onClick={(e) => { e.stopPropagation(); openWhatsAppDrawer(b); }}><FaWhatsapp size={20} color="#25D366" /></button>
                                <a href={\`tel:\${b.mobile}\`} className={styles.inlineWhatsapp} style={{ color: "#2563EB", background: "#EFF6FF", textDecoration: "none", display: "inline-flex", padding: "8px", borderRadius: "100%" }} onClick={(e) => e.stopPropagation()}>
                                  <FaPhoneAlt size={16} />
                                </a>
                              </div>
                            </div>\`;
const mobileReplace = \`                            <div className={styles.headerLeft}>
                              <strong>{idx + 1} - {b.name}</strong><br/>
                              <span style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px", display: "inline-block" }}>{b.email}</span><br/>
                              <span style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px", display: "inline-block" }}><a href={\`tel:\${b.mobile}\`} style={{ color: "black", textDecoration: "none" }}>{b.mobile || t("noPhone")}</a></span>
                              <div style={{ marginTop: "10px" }}>
                                <button className={styles.btnAdvance} onClick={(e) => { e.stopPropagation(); openAdvanceModal(b); }}><FaMoneyBillWave size={20} /></button>
                                <button className={styles.inlineWhatsapp} onClick={(e) => { e.stopPropagation(); openWhatsAppDrawer(b); }}><FaWhatsapp size={20} color="#25D366" /></button>
                              </div>
                            </div>\`;
content = content.replace(mobileOriginal, mobileReplace);

fs.writeFileSync(idxPath, content);
