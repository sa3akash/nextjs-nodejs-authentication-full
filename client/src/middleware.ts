import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/session';

// 1. Specify protected and public routes
const protectedRoutes = ['/feed','/admin']
const publicRoutes = ['/signin', '/signup', '/']

export default async function middleware(req: NextRequest) {
  // 2. Check if the current route is protected or public
  const path = req.nextUrl.pathname
  const isProtectedRoute = protectedRoutes.includes(path)
  const isPublicRoute = publicRoutes.includes(path)

  console.log(path);


  // 3. Decrypt the session from the cookie
  const session = await getSession()

  // 4. Redirect to /login if the user is not authenticated
  if (isProtectedRoute && !session?.user._id) {
    return NextResponse.redirect(new URL('/signin', req.nextUrl))
  }

  // 5. Redirect to /dashboard if the user is authenticated
  // if (
  //   isPublicRoute &&
  //   session?.user._id &&
  //   !req.nextUrl.pathname.startsWith('/feed')
  // ) {
  //   return NextResponse.redirect(new URL('/feed', req.nextUrl))
  // }

  // if(path === '/admin' && session?.user.role !== 'admin'){
  //   return NextResponse.redirect(new URL('/feed', req.nextUrl))
  // }

  return NextResponse.next()
}

// Routes Middleware should not run on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}