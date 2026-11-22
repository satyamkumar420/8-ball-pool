"use client";

import React from "react";

interface BulldogAvatarProps {
  className?: string;
}

/**
 * BulldogAvatar — Renders the high-end 3D generated human player profile image.
 */
export const BulldogAvatar: React.FC<BulldogAvatarProps> = ({
  className = "w-full h-full object-cover object-center",
}) => {
  return (
    <img
      src="./human_avatar.jpg"
      alt="Human Player Avatar"
      className={className}
    />
  );
};
