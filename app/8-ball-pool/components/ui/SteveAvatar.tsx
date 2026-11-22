"use client";

import React from "react";

interface SteveAvatarProps {
  className?: string;
}

/**
 * SteveAvatar — Renders the high-end 3D generated AI Bot player profile image.
 */
export const SteveAvatar: React.FC<SteveAvatarProps> = ({
  className = "w-full h-full object-cover object-center",
}) => {
  return (
    <img
      src="./bot_avatar.jpg"
      alt="AI Steve Avatar"
      className={className}
    />
  );
};
