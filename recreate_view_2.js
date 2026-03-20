const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.vhnhtypxvpwagghunnjr:ShrisTech123@aws-1-ap-south-1.pooler.supabase.com:5432/postgres'
});

const dropQuery = "DROP VIEW IF EXISTS public.billing_view;";

const createQuery = "CREATE VIEW public.billing_view AS " +
"select u.id as user_id, u.mess_id, u.name, u.email, COALESCE(u.status, 'Active'::text) as status, " +
"u.phone as mobile, p.name as parent_name, p.contact as parent_mobile, u.course, u.hostel_name, u.room_no, " +
"mab.year, mab.month, to_char(make_date(mab.year, mab.month, 1)::timestamp with time zone, 'YYYY-MM-DD'::text) as start_date, " +
"to_char(make_date(mab.year, mab.month, 1) + '1 mon'::interval - '1 day'::interval, 'YYYY-MM-DD'::text) as end_date, " +
"mab.days_billed, COALESCE(mab.attendance_map, '{}'::jsonb) as attendance_map, m.per_day_rate as chosen_per_day_rate, " +
"m.monthly_price, round(mab.days_billed * m.per_day_rate, 2) as total_amount, COALESCE(adv.advance_amount, 0::numeric) as advance_amount, " +
"COALESCE(ph.paid, false) as paid, COALESCE(ph.paid_amount, 0::numeric) as paid_amount, ph.note, " +
"(select json_agg(o.att_date) as json_agg from \"Owner_Marked_attendance\" o where o.user_id = u.id and o.mess_id = u.mess_id and o.att_date >= make_date(mab.year, mab.month, 1) and o.att_date <= (make_date(mab.year, mab.month, 1) + '1 mon'::interval - '1 day'::interval)) as owner_marked_dates " +
"from monthly_attendance_billing mab " +
"join users u on u.id = mab.user_id " +
"join messes m on m.id = u.mess_id " +
"left join parents p on p.user_id = u.id and p.mess_id = u.mess_id " +
"left join (select ap.mess_user_id as user_id, ap.mess_id, sum(ap.advance_amount) as advance_amount from advance_payments ap group by ap.mess_user_id, ap.mess_id) adv on adv.user_id = u.id and adv.mess_id = u.mess_id " +
"left join (select ph_1.user_id, ph_1.mess_id, ph_1.year, case when ph_1.month ~ '^[0-9]+$'::text then ph_1.month::integer::numeric else EXTRACT(month from to_date(ph_1.month, 'Month'::text)) end as month, bool_or(ph_1.status = 'paid'::text) as paid, sum(ph_1.amount) as paid_amount, max(ph_1.note) as note from payment_history ph_1 group by ph_1.user_id, ph_1.mess_id, ph_1.year, ph_1.month) ph on ph.user_id = mab.user_id and ph.mess_id = u.mess_id and ph.year = mab.year and ph.month = mab.month::numeric;";

async function run() {
  try {
    console.log("Dropping view...");
    await pool.query(dropQuery);
    console.log("Creating view with paid_amount...");
    await pool.query(createQuery);
    console.log("View recreated successfully.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
