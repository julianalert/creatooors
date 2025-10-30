"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Hero from "../hero";
import AppList from "@/components/app-list";
import ProfileOverviewCard from "@/components/profile-overview-card";

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

export default function DynamicReport() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileOverview, setProfileOverview] = useState<{
    avatarUrl?: string;
    name?: string;
    username?: string;
    bio?: string;
    isVerified?: boolean;
  } | null>(null);

  const [metrics, setMetrics] = useState<{
    totalPublications: number;
    engagementRatePct: number | null;
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
  } | null>(null);

  const reportId = parseInt(params.id as string);
  const profileUrlParam = searchParams.get("url");

  useEffect(() => {
    if (reportId) {
      // Fetch creator data from Supabase and generate report
      const generateReport = async () => {
        setIsLoading(true);
        
        try {
          // Fetch creator data from your server API
          const response = await fetch(`/api/creator?id=${reportId}`);
          
          if (!response.ok) {
            throw new Error('Creator not found');
          }

          const creatorData = await response.json();
          // Extract profile basics defensively from returned profileData
          const pd = creatorData?.profileData || {};
          // Support shapes: { user: {...} } or { data: { user: {...} } }
          const user = (pd && (pd.user || pd.data?.user || pd.data)) || pd;
          const avatarUrl =
            user?.profile_pic_url ||
            user?.hd_profile_pic_url_info?.url ||
            user?.profile_pic_url_hd ||
            user?.profile_pic_url_info?.url ||
            undefined;
          const name = user?.full_name || user?.name || user?.username;
          const username = user?.username;
          const bio = user?.biography || user?.bio;
          const isVerified = Boolean(user?.is_verified);
          setProfileOverview({ avatarUrl, name, username, bio, isVerified });

          // Compute metrics from posts_data
          const postsData = creatorData?.postsData || {};
          const posts = getPostsArray(postsData);
          const computed = computeMetrics(posts);
          setMetrics(computed);

          // Determine platform from stored creator URL or param fallback
          const storedUrl: string | undefined = creatorData?.url;
          const platform = (creatorData?.platform as string) || (storedUrl ? getPlatformFromUrl(storedUrl) : (profileUrlParam ? getPlatformFromUrl(profileUrlParam) : "Unknown"));
          const effectiveProfileUrl = storedUrl || profileUrlParam || "";
          
          // Initial report data
          const initialData: ReportData = {
            id: reportId,
            profileUrl: effectiveProfileUrl,
            platform,
            status: "analyzing"
          };
          
          setReportData(initialData);
          // Stop loading immediately; update analysis in the background
          setIsLoading(false);

          // Simulate analysis process (in real app, this would call your API)
          setTimeout(() => {
            const completedData: ReportData = {
              ...initialData,
              status: "completed",
              analysis: {
                followers: Math.floor(Math.random() * 1000000) + 10000,
                engagement: Math.floor(Math.random() * 10) + 1,
                topContent: [
                  { type: "video", views: "2.3M", engagement: "8.5%" },
                  { type: "image", views: "1.8M", engagement: "6.2%" },
                  { type: "video", views: "1.5M", engagement: "7.1%" }
                ],
                recommendations: [
                  "Post more content during peak hours (6-9 PM)",
                  "Use trending hashtags in your niche",
                  "Engage more with your audience through comments",
                  "Create more video content - it performs 40% better"
                ]
              }
            };
            
            setReportData(completedData);
          }, 3000); // 3 second delay to simulate analysis
        } catch (error) {
          console.error("Error generating report:", error);
          setReportData({
            id: reportId,
            profileUrl: "",
            platform: "Unknown",
            status: "error"
          });
          setIsLoading(false);
        }
      };
      
      generateReport();
    }
  }, [reportId]);

  // Try to normalize various possible post shapes
  function getPostsArray(postsData: any): any[] {
    if (!postsData) return [];
    if (Array.isArray(postsData)) return postsData;
    if (Array.isArray(postsData?.items)) return postsData.items;
    if (Array.isArray(postsData?.data?.items)) return postsData.data.items;
    if (Array.isArray(postsData?.edges)) return postsData.edges.map((e: any) => e?.node || e).filter(Boolean);
    if (Array.isArray(postsData?.data?.edges)) return postsData.data.edges.map((e: any) => e?.node || e).filter(Boolean);
    if (Array.isArray(postsData?.data?.posts)) return postsData.data.posts;
    if (Array.isArray(postsData?.posts)) return postsData.posts;
    return [];
  }

  function computeMetrics(posts: any[]) {
    let totalPublications = 0;
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalBookmarks = 0;
    let totalShares = 0;
    let viewBearingPosts = 0;

    for (const p of posts) {
      // Count all publications (posts), not just videos
      totalPublications += 1;

      const views =
        Number(p?.view_count) ||
        Number(p?.play_count) ||
        Number(p?.video_view_count) ||
        Number(p?.views) || 0;
      if (views > 0) viewBearingPosts += 1;
      totalViews += views;

      const likes =
        Number(p?.like_count) ||
        Number(p?.edge_liked_by?.count) ||
        Number(p?.likes) || 0;
      totalLikes += likes;

      const comments =
        Number(p?.comment_count) ||
        Number(p?.edge_media_to_comment?.count) ||
        Number(p?.comments) || 0;
      totalComments += comments;

      const bookmarks =
        Number(p?.saved_count) ||
        Number(p?.save_count) ||
        Number(p?.bookmark_count) ||
        Number(p?.bookmarks) || 0;
      totalBookmarks += bookmarks;

      const shares =
        Number(p?.share_count) ||
        Number(p?.shares) ||
        Number(p?.reshare_count) ||
        Number(p?.repost_count) ||
        Number(p?.stats?.shareCount) ||
        Number(p?.shareCount) || 0;
      totalShares += shares;
    }

    let engagementRatePct: number | null = null;
    const totalEngagement = totalLikes + totalComments + totalBookmarks;
    if (totalViews > 0) {
      engagementRatePct = (totalEngagement / totalViews) * 100;
    } else if (posts.length > 0) {
      // Fallback: average per post (no views available)
      engagementRatePct = (totalEngagement / posts.length) || 0;
    }

    return {
      totalPublications,
      engagementRatePct,
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
    };
  }

  const getPlatformFromUrl = (url: string): string => {
    if (url.includes("instagram.com")) return "Instagram";
    if (url.includes("tiktok.com")) return "TikTok";
    if (url.includes("youtube.com")) return "YouTube";
    return "Unknown";
  };

  if (!reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Hero reportData={reportData} isLoading={isLoading} />
      {/* Profile Overview Card */}
      {profileOverview && (
        <div className="mx-auto max-w-6xl px-4 sm:px-6 mt-10">
          <ProfileOverviewCard
            avatarUrl={profileOverview.avatarUrl}
            name={profileOverview.name}
            username={profileOverview.username}
            bio={profileOverview.bio}
            isVerified={profileOverview.isVerified}
            platform={reportData?.platform}
          />
          {/* Metrics Dashboard */}
          {metrics && (
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard title="Total publications" value={metrics.totalPublications.toLocaleString()} />
              <StatCard title="Engagement rate" value={
                metrics.engagementRatePct !== null ? `${metrics.engagementRatePct.toFixed(2)}%` : 'N/A'
              } />
              <StatCard title="Total views" value={metrics.totalViews.toLocaleString()} />
              <StatCard title="Total likes" value={metrics.totalLikes.toLocaleString()} />
              <StatCard title="Total comments" value={metrics.totalComments.toLocaleString()} />
              <StatCard title="Total shares" value={metrics.totalShares.toLocaleString()} />
            </div>
          )}
        </div>
      )}
      {reportData.status === "completed" && reportData.analysis && (
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Top Performing Content</h3>
              <div className="space-y-3">
                {reportData.analysis.topContent.map((content, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{content.type}</span>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{content.views} views</p>
                      <p className="text-sm text-green-600">{content.engagement} engagement</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Growth Recommendations</h3>
              <div className="space-y-3">
                {reportData.analysis.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start p-3 bg-blue-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p className="text-gray-700">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* <AppList /> */}
    </>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-900 text-white p-5 shadow-md border border-gray-800">
      <div className="text-sm text-gray-300">{title}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
