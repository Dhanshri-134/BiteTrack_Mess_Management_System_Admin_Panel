// import { pgPool } from "../../lib/db";

// export default async function handler(req, res) {
//   if (req.method !== "PUT") return res.status(405).end();

//   const {
//     id,
//     first_name,
//     last_name,
//     phone,
//     mobile,
//     room_no,
//     hostel_name,
//     course,
//     parent_name,
//     parent_contact,
//     parent_address,
//   } = req.body;

//   if (!id) return res.status(400).json({ error: "Missing user ID" });

//   try {
//     // --- Update user ---
//     const userResult = await pgPool.query(
//       `UPDATE users
//        SET first_name = COALESCE($2, first_name),
//            last_name  = COALESCE($3, last_name),
//            phone      = COALESCE($4, phone),
//            mobile     = COALESCE($5, mobile),
//            room_no    = COALESCE($6, room_no),
//            hostel_name= COALESCE($7, hostel_name),
//            course     = COALESCE($8, course)
//        WHERE id = $1
//        RETURNING *`,
//       [id, first_name, last_name, phone, mobile, room_no, hostel_name, course]
//     );

//     if (userResult.rows.length === 0)
//       return res.status(404).json({ error: "User not found" });

//     // --- Update or insert parent ---
//     if (parent_name || parent_contact || parent_address) {
//       // Check if parent already exists
//       const parentCheck = await pgPool.query(
//         "SELECT * FROM parents WHERE user_id = $1",
//         [id]
//       );

//       if (parentCheck.rows.length > 0) {
//         // Update existing parent
//         await pgPool.query(
//           `UPDATE parents
//            SET name = COALESCE($2, name),
//                contact = COALESCE($3, contact),
//                address = COALESCE($4, address)
//            WHERE user_id = $1`,
//           [id, parent_name, parent_contact, parent_address]
//         );
//       } else {
//         // Insert new parent
//         await pgPool.query(
//           `INSERT INTO parents(user_id, name, contact, address)
//            VALUES($1, $2, $3, $4)`,
//           [id, parent_name, parent_contact, parent_address]
//         );
//       }
//     }

//     res.status(200).json({ ok: true, user: userResult.rows[0] });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// }





import { pgPool } from "../../lib/db";
import { verifyToken } from "../../lib/auth";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "PUT") return res.status(405).end();

  const {
    id,
    first_name,
    last_name,
    phone,
    mobile,
    room_no,
    hostel_name,
    course,
    parent_name,
    parent_contact,
    parent_address,
  } = req.body;

  if (!id) return res.status(400).json({ error: "Missing user ID" });

  // --- 🔐 Extract mess_id from token ---
  let tokenMessId = null;
  const token = req.headers.authorization?.split(" ")[1];

  if (token) {
    try {
      const decoded = await verifyToken(token);
      tokenMessId = decoded?.mess_id || null;
    } catch (e) {
      console.log("Invalid token: ignoring token mess_id");
    }
  }

  try {
    // --- If token has mess_id → verify user belongs to same mess ---
    if (tokenMessId) {
      const check = await pgPool.query(
        "SELECT mess_id FROM users WHERE id = $1",
        [id]
      );

      if (!check.rows.length)
        return res.status(404).json({ error: "User not found" });

      if (check.rows[0].mess_id !== tokenMessId) {
        return res
          .status(403)
          .json({ error: "Unauthorized: User does not belong to your mess" });
      }
    }

    // --- Update user ---
    const userResult = await pgPool.query(
      `UPDATE users
       SET first_name  = COALESCE($2, first_name),
           last_name   = COALESCE($3, last_name),
           phone       = COALESCE($4, phone),
           mobile      = COALESCE($5, mobile),
           room_no     = COALESCE($6, room_no),
           hostel_name = COALESCE($7, hostel_name),
           course      = COALESCE($8, course)
       WHERE id = $1
       RETURNING *`,
      [id, first_name, last_name, phone, mobile, room_no, hostel_name, course]
    );

    if (!userResult.rows.length)
      return res.status(404).json({ error: "User not found" });

    // --- Update / Insert parent ---
    if (parent_name || parent_contact || parent_address) {
      const parentCheck = await pgPool.query(
        "SELECT * FROM parents WHERE user_id = $1",
        [id]
      );

      if (parentCheck.rows.length > 0) {
        // Update parent
        await pgPool.query(
          `UPDATE parents
           SET name    = COALESCE($2, name),
               contact = COALESCE($3, contact),
               address = COALESCE($4, address)
           WHERE user_id = $1`,
          [id, parent_name, parent_contact, parent_address]
        );
      } else {
        // Insert parent
        await pgPool.query(
          `INSERT INTO parents (user_id, name, contact, address)
           VALUES ($1, $2, $3, $4)`,
          [id, parent_name, parent_contact, parent_address]
        );
      }
    }

    return res.status(200).json({ ok: true, user: userResult.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
