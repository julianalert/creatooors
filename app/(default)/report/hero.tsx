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
        <div className="mx-auto max-w-3xl pb-10 pt-8 md:pt-8">
          {/* Section header */}
          
          
        </div>
      </div>
    </section>
  );
}
