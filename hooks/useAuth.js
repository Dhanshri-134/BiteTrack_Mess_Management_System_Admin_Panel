// import { useEffect } from "react";
// import { useRouter } from "next/router";

// export default function useAuth() {
//   const router = useRouter();

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       router.replace("/login");
//     }
//   }, [router]);
// }




import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function useAuth() {
  const router = useRouter();
  const [tokenChecked, setTokenChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
    }

    setTokenChecked(true);
  }, [router]);

  // ⭐ Always return something safe
  return { tokenChecked };
}
