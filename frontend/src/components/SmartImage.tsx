import type { ImgHTMLAttributes } from "react";

type FetchPriority = "high" | "low" | "auto";

type SmartImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fetchPriority?: FetchPriority;
};

export default function SmartImage({
  decoding = "async",
  fetchPriority = "low",
  loading,
  ...props
}: SmartImageProps) {
  const resolvedLoading = loading ?? (fetchPriority === "high" ? "eager" : "lazy");

  return (
    <img
      {...props}
      decoding={decoding}
      fetchPriority={fetchPriority}
      loading={resolvedLoading}
    />
  );
}
