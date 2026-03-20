import { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import styles from "../../../styles/staff.module.css";
import { API_BASE } from "../../../lib/api";
import toast from "react-hot-toast";

export default function SalaryPage() {

    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    const [salary, setSalary] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSalary();
    }, [month, year]);


    async function fetchSalary(){

const token=localStorage.getItem("token");

try{

setLoading(true);

const res=await fetch(`https://bite-track-mess-management-system-a.vercel.app/api/staff/salary/list/`,{
method:"POST",
headers:{
"Content-Type":"application/json",
Authorization:`Bearer ${token}`
},
body:JSON.stringify({month,year})
});

const data=await res.json();

setSalary(Array.isArray(data) ? data : data?.rows || []);

}catch{
toast.error("Failed to load salary");
}
finally{
setLoading(false);
}

}

    async function generateSalary() {

        const token = localStorage.getItem("token");

        try {

            const res = await fetch(`https://bite-track-mess-management-system-a.vercel.app/api/staff/salary/generate//`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ month, year })
            });

            if (!res.ok) throw new Error();

            toast.success("Salary generated");

            fetchSalary();

        } catch {
            toast.error("Generation failed");
        }

    }


    async function markPaid(id) {

        const token = localStorage.getItem("token");

        try {

            await fetch(`https://bite-track-mess-management-system-a.vercel.app/api/staff/salary/pay/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ salary_id: id })
            });

            toast.success("Marked Paid");

            fetchSalary();

        } catch {
            toast.error("Failed");
        }

    }

    return (

        <Layout title="Staff Salary">

            <div className={styles.container}>

                <h2 className={styles.pageTitle}>Salary Management</h2>

                <div className={styles.filterRow}>

                    <select value={month} onChange={e => setMonth(e.target.value)}>
                        {[...Array(12)].map((_, i) => (

                            <option key={i + 1} value={i + 1}>{i + 1}</option>

                        ))}
                    </select>

                    <select value={year} onChange={e => setYear(e.target.value)}>
                        <option>2025</option>
                        <option>2026</option>
                        <option>2027</option>
                    </select>

                    <button className={styles.generateBtn} onClick={generateSalary}>
                        Generate Salary
                    </button>

                </div>


                <div className={styles.tableWrapper}>

                    <table className={styles.attendanceTable}>

                        <thead>

                            <tr>

                                <th>Staff</th>
                                <th>Base</th>
                                <th>Overtime</th>
                                <th>Penalty</th>
                                <th>Final</th>
                                <th>Status</th>
                                <th>Action</th>

                            </tr>

                        </thead>

                        <tbody>

                            {Array.isArray(salary) && salary.map(s => (

                                <tr key={s.id}>

                                    <td>{s.name}</td>
                                    <td>₹{s.base_salary}</td>
                                    <td>₹{s.overtime_amount}</td>
                                    <td>₹{s.penalty_amount}</td>
                                    <td>₹{s.final_salary}</td>

                                    <td>
                                        {s.payment_status === "paid" ? "Paid" : "Pending"}
                                    </td>

                                    <td>

                                        {s.payment_status !== "paid" && (

                                            <button
                                                className={styles.saveBtn}
                                                onClick={() => markPaid(s.id)}
                                            >

                                                Mark Paid

                                            </button>

                                        )}

                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                </div>

            </div>

        </Layout>

    )

}