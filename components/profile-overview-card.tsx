"use client";

import React, { useState } from "react";
import Image from "next/image";

interface ProfileOverviewProps {
  avatarUrl?: string;
  name?: string;
  username?: string;
  bio?: string;
  isVerified?: boolean;
  platform?: string;
}

export default function ProfileOverviewCard({
  avatarUrl,
  name,
  username,
  bio,
  isVerified,
  platform,
}: ProfileOverviewProps) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 h-full">
      <div className="flex items-start gap-5 md:gap-6">
        <div className="relative h-16 w-16 md:h-20 md:w-20 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
          {avatarUrl && !imgError ? (
            <Image
              src={avatarUrl}
              alt={name || username || "Avatar"}
              fill
              sizes="80px"
              className="object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400">?
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 truncate">
              {name || username || "Unknown Profile"}
            </h2>
            {isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            )}
            {platform && (
              <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs">
                {platform}
              </span>
            )}
          </div>
          {username && (
            <p className="text-gray-500 mt-0.5">@{username}</p>
          )}
          {bio && (
            <p className="text-gray-700 mt-3 whitespace-pre-line line-clamp-3">{bio}</p>
          )}
        </div>
      </div>
    </div>
  );
}


