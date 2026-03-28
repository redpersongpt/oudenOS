import { motion } from "framer-motion";
import type { CSSProperties } from "react";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: "sm" | "md" | "lg" | "full";
  style?: CSSProperties;
}

const shimmerKeyframes = {
  backgroundPosition: ["200% center", "-200% center"],
};

const shimmerStyle: CSSProperties = {
  backgroundImage:
    "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.11) 60%, rgba(255,255,255,0.04) 100%)",
  backgroundSize: "400% 100%",
  backgroundColor: "rgba(255,255,255,0.05)",
};

const roundedMap = {
  sm: "rounded",
  md: "rounded-md",
  lg: "rounded-xl",
  full: "rounded-full",
} as const;

export function Skeleton({
  className = "",
  width,
  height,
  rounded = "md",
  style,
}: SkeletonProps) {
  return (
    <motion.div
      className={`${roundedMap[rounded]} ${className}`}
      style={{ ...shimmerStyle, width, height, ...style }}
      animate={shimmerKeyframes}
      transition={{ duration: 1.6, ease: "linear", repeat: Infinity }}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{ width: i === lines - 1 ? "65%" : "100%" }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface p-5 shadow-card ${className}`}
    >
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 shrink-0" rounded="lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5">
            <Skeleton className="h-3 w-16 mb-3" />
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <SkeletonCard className="col-span-2 h-64" />
        <SkeletonCard className="h-64" />
      </div>
      <SkeletonCard className="h-32" />
    </div>
  );
}
