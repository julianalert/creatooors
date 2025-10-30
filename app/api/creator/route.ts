import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Use service role key for server-side operations only
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  throw new Error('Supabase configuration is incomplete')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// ScrapeCreators API configuration
const SCRAPE_CREATORS_API_KEY = process.env.SCRAPE_CREATORS_API_KEY!
const SCRAPE_CREATORS_BASE_URL = 'https://api.scrapecreators.com'

// Do not crash build if env is missing; fail requests at runtime instead
if (!SCRAPE_CREATORS_API_KEY) {
  console.warn('SCRAPE_CREATORS_API_KEY is not set. Scraping will be disabled until it is configured.')
}

// Utility functions for URL parsing and platform detection
function getPlatformFromUrl(url: string): 'instagram' | 'tiktok' | 'youtube' | null {
  if (url.includes('instagram.com')) return 'instagram'
  if (url.includes('tiktok.com')) return 'tiktok'
  if (url.includes('youtube.com')) return 'youtube'
  return null
}

function extractUsernameFromUrl(url: string, platform: string): string | null {
  try {
    const urlObj = new URL(url)
    
    switch (platform) {
      case 'instagram':
        // Instagram URLs: https://www.instagram.com/username/
        const instagramMatch = urlObj.pathname.match(/^\/([^\/]+)\/?$/)
        return instagramMatch ? instagramMatch[1] : null
        
      case 'tiktok':
        // TikTok URLs: https://www.tiktok.com/@username
        const tiktokMatch = urlObj.pathname.match(/^\/@([^\/]+)\/?$/)
        return tiktokMatch ? tiktokMatch[1] : null
        
      case 'youtube':
        // YouTube URLs: https://www.youtube.com/@username or https://www.youtube.com/c/channelname
        const youtubeMatch = urlObj.pathname.match(/^\/(?:@|c\/)([^\/]+)\/?$/)
        return youtubeMatch ? youtubeMatch[1] : null
        
      default:
        return null
    }
  } catch {
    return null
  }
}

// Helpers for score computation on server
function getFollowersCountFromProfile(profileData: any): number | undefined {
  if (!profileData) return undefined;
  const pd = profileData?.user || profileData?.data?.user || profileData?.data || profileData;
  const candidates = [
    Number(pd?.edge_followed_by?.count),
    Number(pd?.follower_count),
    Number(pd?.followers_count),
    Number(pd?.followers),
    Number(pd?.counts?.followed_by),
    Number(pd?.graphql?.user?.edge_followed_by?.count),
  ].filter((v) => Number.isFinite(v) && v > 0);
  return candidates.length > 0 ? (candidates[0] as number) : undefined;
}

function getPostsArrayFromPostsData(postsData: any): any[] {
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

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function computeProfileQualityScore({ profileData, postsData }: { profileData: any; postsData: any }): number | null {
  try {
    const followers = getFollowersCountFromProfile(profileData);
    const posts = getPostsArrayFromPostsData(postsData);
    if (!posts || posts.length === 0) return null;

    const likesArr: number[] = [];
    const commentsArr: number[] = [];
    const timestamps: number[] = [];

    for (const p of posts) {
      const likes = Number(p?.like_count) || Number(p?.edge_liked_by?.count) || Number(p?.likes) || 0;
      const comments = Number(p?.comment_count) || Number(p?.edge_media_to_comment?.count) || Number(p?.comments) || 0;
      const ts =
        Number(p?.taken_at_timestamp) ||
        Number(p?.timestamp) ||
        Number(p?.create_time) ||
        Number(p?.created_time) ||
        Number(new Date((p as any)?.taken_at || (p as any)?.created_at || (p as any)?.date || 0).getTime());

      likesArr.push(likes);
      commentsArr.push(comments);
      if (Number.isFinite(ts) && ts > 0) timestamps.push(ts);
    }

    const N = Math.min(30, likesArr.length);
    const likesSum = likesArr.slice(0, N).reduce((a, b) => a + b, 0);
    const commentsSum = commentsArr.slice(0, N).reduce((a, b) => a + b, 0);

    const commentWeight = 3;
    let E_raw = 0;
    if (followers && followers > 0) {
      const perPost = (likesSum + commentWeight * commentsSum) / Math.max(1, N);
      E_raw = perPost / followers;
    } else {
      const perPost = (likesSum + commentWeight * commentsSum) / Math.max(1, N);
      E_raw = perPost > 0 ? perPost / Math.max(1, perPost) : 0;
    }
    const E_low = 0.002;
    const E_high = 0.06;
    const E_norm = clamp01((E_raw - E_low) / (E_high - E_low)) * 100;

    const C_raw = likesSum > 0 ? commentsSum / likesSum : 0;
    const C_low = 0.02;
    const C_high = 0.25;
    const C_norm = clamp01((C_raw - C_low) / (C_high - C_low)) * 100;

    let F_norm = 0;
    if (timestamps.length >= 2) {
      const sorted = timestamps.sort((a, b) => b - a);
      const newest = sorted[0];
      const oldestWindow = newest - 12 * 7 * 24 * 60 * 60 * 1000;
      const inWindow = sorted.filter((t) => t >= oldestWindow);
      const weeks = Math.max(1, (newest - oldestWindow) / (7 * 24 * 60 * 60 * 1000));
      const postsPerWeek = inWindow.length / weeks;
      const p = postsPerWeek;
      let f01 = 0;
      if (p <= 3) f01 = p / 3;
      else if (p > 3 && p <= 7) f01 = (7 - p) / 4;
      else f01 = 0;
      F_norm = clamp01(f01) * 100;
    }

    const PQS = 0.5 * E_norm + 0.3 * F_norm + 0.2 * C_norm;
    return Math.round(clamp01(PQS / 100) * 100);
  } catch {
    return null;
  }
}

// ScrapeCreators API functions
function fetchWithTimeout(resource: string, options: { method?: string; headers?: Record<string, string>; body?: any; timeoutMs?: number } = {}) {
  const { timeoutMs = 15000, ...rest } = options
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(resource, { ...rest, signal: controller.signal }).finally(() => clearTimeout(id))
}

async function scrapeTikTokProfile(username: string) {
  const response = await fetch(`${SCRAPE_CREATORS_BASE_URL}/v1/tiktok/profile?handle=${encodeURIComponent(username)}`, {
    method: 'GET',
    headers: {
      'x-api-key': SCRAPE_CREATORS_API_KEY,
    }
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`TikTok API error: ${response.status} - ${errorText}`)
  }
  
  return await response.json()
}

async function scrapeInstagramProfile(username: string) {
  const response = await fetch(`${SCRAPE_CREATORS_BASE_URL}/v1/instagram/profile`, {
    method: 'POST',
    headers: {
      'x-api-key': SCRAPE_CREATORS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      handle: username
    })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Instagram API error: ${response.status} - ${errorText}`)
  }
  
  return await response.json()
}

async function scrapeInstagramPosts(username: string, params: { nextMaxId?: string; trim?: boolean } = {}) {
  const url = new URL(`${SCRAPE_CREATORS_BASE_URL}/v2/instagram/user/posts`)
  url.searchParams.set('handle', username)
  if (params.nextMaxId) url.searchParams.set('next_max_id', params.nextMaxId)
  if (params.trim === true) url.searchParams.set('trim', 'true')

  const response = await fetchWithTimeout(url.toString(), {
    method: 'GET',
    headers: {
      'x-api-key': SCRAPE_CREATORS_API_KEY,
    },
    timeoutMs: 20000,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Instagram posts API error: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

async function scrapeYouTubeChannel(username: string) {
  const response = await fetch(`${SCRAPE_CREATORS_BASE_URL}/v1/youtube/channel?handle=${encodeURIComponent(username)}`, {
    method: 'GET',
    headers: {
      'x-api-key': SCRAPE_CREATORS_API_KEY,
    }
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`YouTube API error: ${response.status} - ${errorText}`)
  }
  
  return await response.json()
}

async function scrapeProfileData(url: string) {
  const platform = getPlatformFromUrl(url)
  if (!platform) {
    throw new Error('Unsupported platform')
  }
  
  const username = extractUsernameFromUrl(url, platform)
  if (!username) {
    throw new Error('Could not extract username from URL')
  }
  
  switch (platform) {
    case 'tiktok':
      return await scrapeTikTokProfile(username)
    case 'instagram':
      return await scrapeInstagramProfile(username)
    case 'youtube':
      return await scrapeYouTubeChannel(username)
    default:
      throw new Error('Unsupported platform')
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required and must be a string' },
        { status: 400 }
      )
    }

    // Validate URL format - Only Instagram is supported
    const urlPattern = /^https?:\/\/(www\.)?instagram\.com/
    if (!urlPattern.test(url)) {
      return NextResponse.json(
        { error: 'Only Instagram URLs are supported at this time. Please provide a valid Instagram profile URL.' },
        { status: 400 }
      )
    }

    const trimmedUrl = url.trim()
    const platform = getPlatformFromUrl(trimmedUrl)
    
    if (platform !== 'instagram') {
      return NextResponse.json(
        { error: 'Only Instagram URLs are supported at this time. Please provide a valid Instagram profile URL.' },
        { status: 400 }
      )
    }

    // Insert new creator (allow duplicates)
    const { data, error } = await supabaseAdmin
      .from('creator')
      .insert([{ url: trimmedUrl }])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save creator data' },
        { status: 500 }
      )
    }

    // Scrape profile data using ScrapeCreators API
    let profileData = null
    let scrapeError = null
    
    try {
      profileData = await scrapeProfileData(trimmedUrl)
      console.log(`Successfully scraped ${platform} profile data for creator ${data.id}`)
    } catch (scrapeErr) {
      scrapeError = scrapeErr instanceof Error ? scrapeErr.message : 'Unknown scraping error'
      console.error(`Failed to scrape ${platform} profile:`, scrapeErr)
      
    }

    // Update creator record with scraped data if available
    if (profileData) {
      const { error: updateError } = await supabaseAdmin
        .from('creator')
        .update({ 
          profile_data: profileData,
          platform: platform,
          scraped_at: new Date().toISOString()
        })
        .eq('id', data.id)

      if (updateError) {
        console.error('Failed to update creator with profile data:', updateError)
      }
    }

    // If Instagram, fetch recent posts and persist in posts_data
    let postsData: any = null
    let postsError: string | null = null
    let profileScore: number | null = null
    if (platform === 'instagram') {
      const username = extractUsernameFromUrl(trimmedUrl, 'instagram')
      if (username) {
        try {
          postsData = await scrapeInstagramPosts(username, { trim: true })
        } catch (err) {
          postsError = err instanceof Error ? err.message : 'Unknown posts scraping error'
          console.error('Failed to fetch Instagram posts:', err)
        }

        if (postsData) {
          const { error: postsUpdateError } = await supabaseAdmin
            .from('creator')
            .update({ posts_data: postsData })
            .eq('id', data.id)
          if (postsUpdateError) {
            console.error('Failed to update creator with posts_data:', postsUpdateError)
          }

          // Compute Profile Quality Score (0-100) after both datasets are available
          try {
            profileScore = computeProfileQualityScore({ profileData, postsData })
          } catch (calcErr) {
            console.error('Failed to compute profile score:', calcErr)
            profileScore = null
          }

          // Save score to creator.profileScore (int8)
          try {
            const { error: scoreUpdateError } = await supabaseAdmin
              .from('creator')
              .update({ profileScore: profileScore })
              .eq('id', data.id)
            if (scoreUpdateError) {
              console.error('Failed to update creator with profileScore:', scoreUpdateError)
            }
          } catch (scoreErr) {
            console.error('Error updating profileScore:', scoreErr)
          }
        }
      }
    }

    return NextResponse.json({
      id: data.id,
      url: data.url,
      platform: platform,
      profileData: profileData,
      postsData: postsData,
      profileScore: profileScore,
      scrapeError: scrapeError,
      postsError: postsError,
      message: profileData ? 'Creator saved and profile scraped successfully' : 'Creator saved but profile scraping failed'
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID parameter is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('creator')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    // Return creator data with profile information
    return NextResponse.json({
      id: data.id,
      url: data.url,
      platform: data.platform,
      profileData: data.profile_data,
      postsData: data.posts_data,
      profileScore: (data as any).profileScore ?? (data as any).profile_score ?? null,
      scrapedAt: data.scraped_at,
      createdAt: data.created_at
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
