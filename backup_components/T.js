import useAutoTranslate from "../hooks/useAutoTranslate";

export default function T({ children }) {
  if (typeof children !== "string") return children;
  return useAutoTranslate(children);
}
