// import formidable from "formidable";
import fs from "fs";
import { supabase } from "../../../lib/supabase";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const form = ""//formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ ok: false, error: err.message });

    const { bucket } = fields; // bucket name must be sent from frontend
    const file = files.file;

    if (!bucket) return res.status(400).json({ ok: false, error: "Bucket not specified" });
    if (!file) return res.status(400).json({ ok: false, error: "No file uploaded" });

    const fileData = fs.readFileSync(file.filepath);
    const fileExt = file.originalFilename.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileData, { cacheControl: "3600", upsert: true });

    if (error) return res.status(500).json({ ok: false, error: error.message });

    const { publicURL, error: urlError } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    if (urlError) return res.status(500).json({ ok: false, error: urlError.message });

    res.status(200).json({ ok: true, url: publicURL });
  });
}
