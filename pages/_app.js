// import "../styles/globals.css";

// export default function MyApp({ Component, pageProps }) {
//   return <Component {...pageProps} />;
// }

import { useEffect } from "react";
import { useRouter } from "next/router";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // 🔒 Prevent hard reload navigation
    const handleRouteChangeError = () => {
      throw "Abort route change.";
    };

    router.events.on("routeChangeError", handleRouteChangeError);
    return () => {
      router.events.off("routeChangeError", handleRouteChangeError);
    };
  }, []);

  return <Component {...pageProps} />;
}
