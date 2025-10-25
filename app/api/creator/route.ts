import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Use service role key for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

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

    // Check if URL already exists
    const { data: existing } = await supabaseAdmin
      .from('creator')
      .select('id')
      .eq('url', url)
      .single()

    if (existing) {
      return NextResponse.json({
        id: existing.id,
        url: url,
        message: 'Profile already exists'
      })
    }

    // Insert new creator
    const { data, error } = await supabaseAdmin
      .from('creator')
      .insert([{ url: url.trim() }])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save creator data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id: data.id,
      url: data.url,
      message: 'Creator saved successfully'
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

    return NextResponse.json(data)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
