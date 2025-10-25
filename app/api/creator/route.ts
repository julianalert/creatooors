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
const SCRAPE_CREATORS_API_KEY = 'vTJo7JqIruWhfdZ73IwPbmRG49z1'
const SCRAPE_CREATORS_BASE_URL = 'https://api.scrapecreators.com'

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

// ScrapeCreators API functions
async function scrapeTikTokProfile(username: string) {
  const response = await fetch(`${SCRAPE_CREATORS_BASE_URL}/v1/tiktok/profile`, {
    method: 'POST',
    headers: {
      'X-API-Key': SCRAPE_CREATORS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      handle: username
    })
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
      'X-API-Key': SCRAPE_CREATORS_API_KEY,
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

async function scrapeYouTubeChannel(username: string) {
  const response = await fetch(`${SCRAPE_CREATORS_BASE_URL}/v1/youtube/channel`, {
    method: 'POST',
    headers: {
      'X-API-Key': SCRAPE_CREATORS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      handle: username
    })
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

    // Validate URL format
    const urlPattern = /^https?:\/\/(www\.)?(instagram\.com|tiktok\.com|youtube\.com)/
    if (!urlPattern.test(url)) {
      return NextResponse.json(
        { error: 'Invalid URL. Must be Instagram, TikTok, or YouTube profile URL' },
        { status: 400 }
      )
    }

    const trimmedUrl = url.trim()
    const platform = getPlatformFromUrl(trimmedUrl)
    
    if (!platform) {
      return NextResponse.json(
        { error: 'Unsupported platform. Only Instagram, TikTok, and YouTube are supported' },
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

    return NextResponse.json({
      id: data.id,
      url: data.url,
      platform: platform,
      profileData: profileData,
      scrapeError: scrapeError,
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
