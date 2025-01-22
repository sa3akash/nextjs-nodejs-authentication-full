import { Metadata } from 'next';
import type { Viewport } from 'next'

interface Post {
  id: string
  title: string
  content: string
}

export const revalidate = 3600 // invalidate every hour

export const metadata: Metadata = {
  title: '...',
  description: '...',
}


export const viewport: Viewport = {
  colorScheme: 'dark',
}

export default async function Page() {
  const data = await fetch('https://api.vercel.app/blog',{
    next: { tags: ['blogs'] },
  })
  const posts: Post[] = await data.json()
  return (
    <main>
      <h1>Blog Posts</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </main>
  )
}

//
// 'use server'
//
// import { revalidatePath } from 'next/cache'
//
// export async function createPost() {
//   // Invalidate the /posts route in the cache
//   revalidatePath('/posts')
// }