import { useRouter } from "next/router";

export function useSafeRouter() {
  const router = useRouter();

  const navigate = (path) => {
    // behaves like <Link>, but safe after async
    requestAnimationFrame(() => {
      router.replace(path);
    });
  };

  return { navigate };
}
