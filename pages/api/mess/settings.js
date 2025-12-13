import { pgPool } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      // Try to fetch mess settings
      const result = await pgPool.query(`
        SELECT * FROM mess_settings 
        ORDER BY updated_at DESC 
        LIMIT 1
      `);
      
      if (result.rows.length === 0) {
        // Return default settings
        const defaultSettings = {
          mess_name: "Your Mess Name",
          per_day_rate: '00',
          currency: "INR",
          address: "Your Mess Address",
          phone: "+91-9999999999",
          email: "xyz@abc.com",
          working_hours: "7:30 AM - 9:30 PM",
          attendance_cutoff_time: "10:00 PM"
        };
        return res.status(200).json(defaultSettings);
      }
      
      res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error("❌ Error fetching settings:", err);
      
      // Return default settings if error
      const defaultSettings = {
        mess_name: "Your Mess Name",
        per_day_rate: '00',
        currency: "INR",
        address: "Your Mess Address",
        phone: "+91-9999999999",
        email: "xyz@abc.com",
        working_hours: "7:30 AM - 9:30 PM",
        attendance_cutoff_time: "10:00 PM"
      };
      res.status(200).json(defaultSettings);
    }
  } else if (req.method === "POST") {
    try {
      const settings = req.body;
      
      // Update or insert settings
      const result = await pgPool.query(`
        INSERT INTO mess_settings (
          mess_name, per_day_rate, currency, address, 
          phone, email, working_hours, attendance_cutoff_time,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          mess_name = $1,
          per_day_rate = $2,
          currency = $3,
          address = $4,
          phone = $5,
          email = $6,
          working_hours = $7,
          attendance_cutoff_time = $8,
          updated_at = NOW()
        RETURNING *
      `, [
        settings.mess_name,
        settings.per_day_rate,
        settings.currency,
        settings.address,
        settings.phone,
        settings.email,
        settings.working_hours,
        settings.attendance_cutoff_time
      ]);
      
      res.status(200).json(result.rows[0]);
    } catch (err) {
      console.error("❌ Error updating settings:", err);
      res.status(500).json({ error: "Failed to update settings" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}