"use client";

import PageIllustration from "@/components/page-illustration";

interface ReportData {
  id: number;
  profileUrl: string;
  platform: string;
  status: "analyzing" | "completed" | "error";
  analysis?: {
    followers: number;
    engagement: number;
    topContent: any[];
    recommendations: string[];
  };
}

interface HeroProps {
  reportData: ReportData;
  isLoading: boolean;
}

export default function Hero({ reportData, isLoading }: HeroProps) {
  return (
    <section className="relative">
      <PageIllustration />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Main content */}
        <div className="mx-auto max-w-3xl pb-10 pt-32 md:pt-40">
          {/* Section header */}
          <div className="text-center">
            <h1 className="mb-6 border-y text-5xl font-bold [border-image:linear-gradient(to_right,transparent,--theme(--color-slate-300/.8),transparent)1] md:text-6xl">
              {isLoading ? "Analyzing..." : "Your Report"}
            </h1>
            <div className="mx-auto max-w-3xl">
              <p className="text-lg text-gray-700 mb-4">
                {isLoading 
                  ? "We're analyzing your profile data to generate personalized insights..."
                  : `Analysis complete for ${reportData.platform} profile`
                }
              </p>
              {reportData.profileUrl && (
                <div className="bg-gray-100 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-600 mb-1">Profile URL:</p>
                  <p className="text-sm font-mono text-blue-600 break-all">
                    {reportData.profileUrl}
                  </p>
                </div>
              )}
              {isLoading && (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
