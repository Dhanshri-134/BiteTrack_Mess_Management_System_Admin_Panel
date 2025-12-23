// import { pgPool } from "../../../lib/db";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();

//   const { action } = req.query;

//   if (!action) {
//     return res.status(400).json({ error: "Action parameter is required" });
//   }

//   const client = await pgPool.connect();
  
//   try {
//     let result = { message: "Action completed successfully" };
    
//     switch (action) {
//       case 'mark_attendance':
//         // Placeholder for attendance marking logic
//         result.message = "Attendance marking feature coming soon!";
//         break;
        
//       case 'generate_bills':
//         // Placeholder for bill generation logic
//         result.message = "Bill generation feature coming soon!";
//         break;
        
//       case 'send_notifications':
//         // Placeholder for notification sending logic
//         result.message = "Notification sending feature coming soon!";
//         break;
        
//       case 'backup_data':
//         // Placeholder for data backup logic
//         result.message = "Data backup feature coming soon!";
//         break;
        
//       case 'update_menu':
//         // Placeholder for menu update logic
//         result.message = "Menu update feature coming soon!";
//         break;
        
//       case 'freeze_accounts':
//         // Placeholder for account freezing logic
//         result.message = "Account freezing feature coming soon!";
//         break;
        
//       default:
//         return res.status(400).json({ error: "Unknown action" });
//     }

//     res.status(200).json(result);
//   } catch (err) {
//     console.error("Quick action error:", err);
//     res.status(500).json({ error: "Internal server error" });
//   } finally {
//     client.release();
//   }
// }











import { pgPool } from "../../../lib/db";
import { verify } from "jsonwebtoken";

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") return res.status(405).end();

  const { action } = req.query;

  if (!action) {
    return res.status(400).json({ error: "Action parameter is required" });
  }

  // 🔐 Get token from header if provided
  const token = req.headers.authorization?.split(" ")[1] || null;

  let mess_id = null;

  // ✅ If token exists → extract mess_id
  if (token) {
    try {
      const decoded = verify(token, process.env.JWT_SECRET);
      mess_id = decoded.mess_id || null;
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  }

  const client = await pgPool.connect();
  
  try {
    let result = { message: "Action completed successfully" };
    
    switch (action) {
      case 'mark_attendance':
        if (mess_id) {
          // ✔ Token-based mess_id filtering
          result.message = `Attendance marking for mess_id ${mess_id} coming soon!`;
        } else {
          // ✔ Old behavior
          result.message = "Attendance marking feature coming soon!";
        }
        break;
        
      case 'generate_bills':
        if (mess_id) {
          result.message = `Bill generation for mess_id ${mess_id} coming soon!`;
        } else {
          result.message = "Bill generation feature coming soon!";
        }
        break;
        
      case 'send_notifications':
        if (mess_id) {
          result.message = `Notification sending for mess_id ${mess_id} coming soon!`;
        } else {
          result.message = "Notification sending feature coming soon!";
        }
        break;
        
      case 'backup_data':
        if (mess_id) {
          result.message = `Backup for mess_id ${mess_id} coming soon!`;
        } else {
          result.message = "Data backup feature coming soon!";
        }
        break;
        
      case 'update_menu':
        if (mess_id) {
          result.message = `Menu update for mess_id ${mess_id} coming soon!`;
        } else {
          result.message = "Menu update feature coming soon!";
        }
        break;
        
      case 'freeze_accounts':
        if (mess_id) {
          result.message = `Account freeze for mess_id ${mess_id} coming soon!`;
        } else {
          result.message = "Account freezing feature coming soon!";
        }
        break;
        
      default:
        return res.status(400).json({ error: "Unknown action" });
    }

    res.status(200).json(result);
  } catch (err) {
    console.error("Quick action error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
}
