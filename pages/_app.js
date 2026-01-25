
import "../styles/globals.css";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { App as CapApp } from "@capacitor/app";
import { syncQueue } from "@/lib/syncQueue";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import GlobalLoader from "../components/GlobalLoader";
import { LanguageProvider } from "../context/LanguageContext";
import Head from "next/head";
import { triggerRefresh } from "@/lib/refreshBus";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const lastBack = useRef(0);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
    const start = () => setLoading(true);
    const end = () => setLoading(false);

    router.events.on("routeChangeStart", start);
    router.events.on("routeChangeComplete", end);
    router.events.on("routeChangeError", end);

    return () => {
      router.events.off("routeChangeStart", start);
      router.events.off("routeChangeComplete", end);
      router.events.off("routeChangeError", end);
    };
  }, [router]);



  useEffect(() => {
  let startY = 0;

  const onTouchStart = (e) => {
    startY = e.touches[0].clientY;
  };

  const onTouchEnd = (e) => {
    const endY = e.changedTouches[0].clientY;

    if (startY < 80 && endY - startY > 120) {
      
      // router.replace(router.asPath);
      toast.success("Refreshing...");
  triggerRefresh();
    }
  };

  window.addEventListener("touchstart", onTouchStart);
  window.addEventListener("touchend", onTouchEnd);

  return () => {
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchend", onTouchEnd);
  };
}, [router]);



  useEffect(() => {
    const onOnline = () => syncQueue();
    window.addEventListener("online", onOnline);
     if (navigator.onLine) {
      syncQueue();
    }
    return () => window.removeEventListener("online", onOnline);
  }, []);


  useEffect(() => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js");
  }
}, []);


  useEffect(() => {
  let handle;
  let cancelled = false;

  (async () => {
    const h = await CapApp.addListener("resume", () => {
      if (navigator.onLine) {
        syncQueue();
      }
    });

    if (!cancelled) {
      handle = h;
    } else if (h && typeof h.remove === "function") {
      h.remove();
    }
  })();

  return () => {
    cancelled = true;
    if (handle && typeof handle.remove === "function") {
      handle.remove();
    }
  };
}, []);


useEffect(() => {
  let removeListener;

  (async () => {
    const listener = await CapApp.addListener("backButton", () => {
      if (window.__SIDEBAR_OPEN__) {
        window.__CLOSE_SIDEBAR__?.();
        return;
      }

      if (window.history.length > 1 && router.pathname !== "/dashboard") {
        router.back();
        return;
      }

      const now = Date.now();
      if (now - lastBack.current < 2000) {
        CapApp.exitApp();
      } else {
        lastBack.current = now;
        toast.error("Press back again to exit");
      }
    });

    if (listener?.remove) {
      removeListener = listener.remove;
    }
  })();

  return () => {
    if (typeof removeListener === "function") {
      removeListener();
    }
  };
}, [router]);



  return (
    <>
    <LanguageProvider>
    <Head>
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />

        {/* iOS support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BiteTrack" />

        {/* App icon for iOS */}
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />

<meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=1"
/>
        {/* Theme color */}
        <meta name="theme-color" content="#007171" />
      </Head>

    {loading && <GlobalLoader />}
      <Component {...pageProps} />
      <Toaster
        position="top-center"
        containerStyle={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
        toastOptions={{
          duration: 2000,
          style: {
            background: "#fff",
            color: "#16a34a",
            borderRadius: "12px",
            fontSize: "14px",
            padding: "14px 18px",
            textAlign: "center",
            maxWidth: "90vw",
          },
        }}
        />
        </LanguageProvider>
    </>
  );
}
