"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  url?: string;
  name?: string;
  size?: number;
  className?: string;
};

const ProfileImage = ({ url, name, size = 48, className }: Props) => {
  const initials = (() => {
    if (!name) return "??";
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  })();

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full flex items-center justify-center bg-muted shrink-0",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {url ? (
        <Image
          src={url}
          alt={name || "Profile Image"}
          fill
          sizes={`${size}px`}
          className="object-cover"
          priority={size > 100}
          unoptimized
        />
      ) : (
        <span
          className="font-medium text-muted-foreground select-none"
          style={{ fontSize: size / 2.5 }}
        >
          {initials}
        </span>
      )}
    </div>
  );
};

export default ProfileImage;
