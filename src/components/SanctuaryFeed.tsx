'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

interface Post {
  id: string
  title: string
  content: string
  created_at: string
  user_id: string
}

export default function SanctuaryFeed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // 1. Fetch persistent posts chronologically on load
  useEffect(() => {
    async function fetchPosts() {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching posts:', error.message)
      } else if (data) {
        setPosts(data)
      }
    }

    fetchPosts()
  }, [supabase])

  // 2. Save a new post to Supabase
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    setLoading(true)

    // Get current authenticated user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert('You must be logged in to post.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('posts')
      .insert([
        { 
          title: title, 
          content: content, 
          user_id: user.id 
        }
      ])
      .select()

    if (error) {
      console.error('Error saving post:', error.message)
      alert('Failed to publish post: ' + error.message)
    } else if (data) {
      // Prepend new post to local state so it appears immediately
      setPosts([data[0], ...posts])
      setTitle('')
      setContent('')
    }

    setLoading(false)
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-8">
      {/* Post Creation Form */}
      <form onSubmit={handleCreatePost} className="space-y-4 border p-4 rounded-lg bg-card">
        <h2 className="text-lg font-medium">Share to the Sanctuary</h2>
        <input
          type="text"
          placeholder="Title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <textarea
          placeholder="Write your thoughts..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-2 border rounded h-24"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Publishing...' : 'Publish Post'}
        </button>
      </form>

      {/* Chronological Feed */}
      <div className="space-y-4">
        <h3 className="text-md font-semibold text-muted-foreground">Chronological Feed</h3>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet. Be the first to share.</p>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="border p-4 rounded-lg space-y-2">
              <h4 className="font-bold text-lg">{post.title}</h4>
              <p className="text-sm whitespace-pre-wrap">{post.content}</p>
              <time className="text-xs text-muted-foreground block">
                {new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString()}
              </time>
            </article>
          ))
        )}
      </div>
    </div>
  )
}