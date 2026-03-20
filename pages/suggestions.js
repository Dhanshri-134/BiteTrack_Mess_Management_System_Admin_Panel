import { useAppRefresh } from "@/lib/useAppRefresh";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import styles from "../styles/suggestions.module.css";
import { offlineFetch } from "../lib/offlineFetch";
import { useLanguage } from "../context/LanguageContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";
import { Capacitor } from "@capacitor/core";
import  GlobalLoader from "../components/GlobalLoader"


export default function Suggestions() {
  const { t } = useLanguage();

  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState();

  const [exporting, setExporting] = useState(false);
  const [animatedRating, setAnimatedRating] = useState(0);

  useEffect(() => {
  if (!avgRating) return;

  let start = 0;
  const end = Number(avgRating);
  const duration = 800; // animation time in ms
  const increment = end / (duration / 16);

  const counter = setInterval(() => {
    start += increment;
    if (start >= end) {
      setAnimatedRating(end);
      clearInterval(counter);
    } else {
      setAnimatedRating(start);
    }
  }, 16);

  return () => clearInterval(counter);
}, [avgRating]);

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [sortType, setSortType] = useState("newest");

  const filteredFeedbacks = feedbacks
  .filter((fb) => {
    const date = new Date(fb.created_at);
    const monthMatch = selectedMonth
      ? date.getMonth() + 1 === Number(selectedMonth)
      : true;
    const yearMatch = selectedYear
      ? date.getFullYear() === Number(selectedYear)
      : true;
    return monthMatch && yearMatch;
  })
  .sort((a, b) => {
    if (sortType === "newest")
      return new Date(b.created_at) - new Date(a.created_at);
    if (sortType === "oldest")
      return new Date(a.created_at) - new Date(b.created_at);
    return 0;
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const data = await offlineFetch("feedback-list", async () => {
        const res = await fetch(
          "https://bite-track-mess-management-system-a.vercel.app/api/feedback/fetch/",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        
        if (!res.ok) throw new Error("Fetch failed");
        return await res.json();
      });
      const messData = await offlineFetch("mess-info", async () => {
  const messRes = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/mess/details", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (messRes.ok) {
    const mess = await messRes.json();
    setAvgRating(mess.rating ?? 0);
  }
      });

      console.log(data)
      setFeedbacks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setFeedbacks([]);
      setAvgRating(0);
    } finally {
      setLoading(false);
    }
  };

  const loadImageAsBase64 = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = url;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = reject;
  });
};



const handleExportPDF = async () => {
  try {
    setExporting(true);
    const token = localStorage.getItem("token");

    const messRes = await fetch("https://bite-track-mess-management-system-a.vercel.app/api/mess/details/", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const mess = await messRes.json();
    setAvgRating(mess.rating);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // 🖼 Decide Logo
let logoUrl = mess.logo || "/Assets/logo_Bite_Track.png";

// Load logo safely
let logoBase64 = null;
try {
  logoBase64 = await loadImageAsBase64(logoUrl);
} catch {
  logoBase64 = await loadImageAsBase64("/Assets/logo_Bite_Track.png");
}


// 🎨 Brand Header Background FIRST
doc.setFillColor(0, 113, 112);
doc.rect(0, 0, pageWidth, 40, "F");

// 🖼 Then draw logo on top
if (logoBase64) {
  doc.addImage(logoBase64, "PNG", 14, 6.5, 30, 30);
}

    const now = new Date();
    const month = now.toLocaleString("en-IN", { month: "long" });
    const year = now.getFullYear();

    const fileName = `${mess.name.replace(/\s+/g, "_")}_${month}_${year}.pdf`;




// 🏷 Mess Name (Right Aligned)
doc.setTextColor(255, 255, 255);
doc.setFontSize(18);
doc.setFont("helvetica", "bold");

doc.text(
  mess.name,
  pageWidth - 14,
  15,
  { align: "right" }
);

// 📍 Location
doc.setFontSize(10);
doc.setFont("helvetica", "normal");
doc.text(
  mess.location || "",
  pageWidth - 14,
  22,
  { align: "right" }
);

// 📧 Email
doc.text(
  mess.email || "",
  pageWidth - 14,
  28,
  { align: "right" }
);

// 📧 contact
doc.text(
  mess.contact_info || "",
  pageWidth - 14,
  33,
  { align: "right" }
);

// 📅 Generated Month
doc.setFontSize(9);
doc.text(
  `Generated: ${month} ${year}`,
  pageWidth - 14,
  38,
  { align: "right" }
);

// Reset text color
doc.setTextColor(0, 0, 0);
doc.setDrawColor(200, 200, 200);
doc.line(14, 55, pageWidth - 14, 55);

// Section Title
doc.setFontSize(14);
doc.setFont("helvetica", "bold");
doc.text("Feedback Report", 14, 50);

    autoTable(doc, {
      startY: 60,
      head: [["Name","Mobile", "Message", "Date"]],
      body: filteredFeedbacks.map((fb) => [
        fb.name,
        fb.phone,
        fb.message,
        new Date(fb.created_at).toLocaleDateString("en-IN"),
      ]),
      headStyles: {
    fillColor: [0, 113, 112],   // #007170
    textColor: [255, 255, 255], // White text
    fontStyle: "bold",
    halign: "center",
  },

  styles: {
    fontSize: 9,
    cellPadding: 4,
  },

  alternateRowStyles: {
    fillColor: [240, 250, 250], // light teal alternate rows
  },

  tableLineColor: [200, 200, 200],
  tableLineWidth: 0.1,
    });

    const pdfBase64 = doc.output("datauristring").split(",")[1];
if (Capacitor.isNativePlatform()) {
  const savedFile = await Filesystem.writeFile({
    path: fileName,
    data: pdfBase64,
    directory: Directory.Documents,
  });

  await FileOpener.open({
    filePath: savedFile.uri,
    contentType: "application/pdf",
  });
} else {
  doc.save(fileName);
}

  } catch (err) {
    console.error(err);
  } finally{
    setExporting(false);
  }
};


  useEffect(() => {
    fetchData();
  }, []);


useAppRefresh(fetchData);

const StarRating = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating - fullStars >= 0.5;

  return (
    <div className={styles.starWrapper}>
      {[...Array(5)].map((_, i) => {
        if (i < fullStars) {
          return <span key={i} className={styles.starFull}>★</span>;
        } else if (i === fullStars && hasHalfStar) {
          return <span key={i} className={styles.starHalf}>★</span>;
        } else {
          return <span key={i} className={styles.starEmpty}>★</span>;
        }
      })}
    </div>
  );
};

if (exporting) return <GlobalLoader/>;
  return (
    <Layout>
      <div className={styles.container}>
        <main className={styles.main}>

        <h2 className={styles.title}>{t("suggestionsAndFeedback")}</h2>
        <div className={styles.statsRow}>
         <div className={styles.countCard}>
  <div>
    <div className={styles.ratingNumber}>
       {animatedRating.toFixed(1)}
    </div>
    <StarRating rating={animatedRating} />
  </div>
</div>
         
          <div className={styles.countCard}>
            {t("totalFeedback")}: <strong>{feedbacks.length}</strong>
          </div>
        </div>
        <div className={styles.filterRow}>
  <select
    value={selectedMonth}
    onChange={(e) => setSelectedMonth(e.target.value)}
  >
    <option value="">{t("allMonths")}</option>
    {[...Array(12)].map((_, i) => (
      <option key={i} value={i + 1}>
        {new Date(0, i).toLocaleString("en-IN", { month: "long" })}
      </option>
    ))}
  </select>

  <select
    value={selectedYear}
    onChange={(e) => setSelectedYear(e.target.value)}
  >
    <option value="">{t("allYears")}</option>
    {[...new Set(feedbacks.map(f => new Date(f.created_at).getFullYear()))]
      .sort((a, b) => b - a)
      .map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
  </select>

  <select
    value={sortType}
    onChange={(e) => setSortType(e.target.value)}
  >
    <option value="newest">{t("LatestFirst")}</option>
    <option value="oldest">{t("OldestFirst")}</option>
  </select>

  <button
    className={styles.exportBtn}
    onClick={handleExportPDF}
  >
    {t("exportPDF")}
  </button>
</div>
        {feedbacks.length === 0 ? (
          <p className={styles.empty}>{t("noFeedbackYet")}</p>
        ) : (
          <div className={styles.feedbackList}>
            {filteredFeedbacks.map((fb) => (
              <div key={fb.id} className={styles.feedbackCard}>
                <div className={styles.header}>
                  <span className={styles.name}>{fb.name}</span>
                  <span className={styles.type}>
  {t(
    `feedbackType_${String(fb.feedback_type)
      .toLowerCase()
      .replace(/\s+/g, "_")}`
    ) || fb.feedback_type}
</span>


                </div>

                <p className={styles.message}>{fb.message}</p>

                <div className={styles.footer}>
                  <span className={styles.email}>{fb.email}</span>
                  <span className={styles.date}>
                    {new Date(fb.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
    </main>
      </div>
    </Layout>
  );
}
