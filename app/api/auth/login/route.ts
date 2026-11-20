import { NextRequest, NextResponse } from 'next/server'
import {
  createSessionToken,
  getAuthConfig,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  verifyCredentials,
} from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const config = getAuthConfig()
    if (!config.configured) {
      return NextResponse.json(
        {
          error:
            'ยังไม่ได้ตั้งค่า STUDIO_USERNAME และ STUDIO_PASSWORD ใน Environment Variables ของเซิร์ฟเวอร์',
        },
        { status: 503 }
      )
    }

    const body = await request.json().catch(() => null)
    const username = typeof body?.username === 'string' ? body.username : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!username.trim() || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' },
        { status: 400 }
      )
    }

    const valid = await verifyCredentials(username, password)
    if (!valid) {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      )
    }

    const token = await createSessionToken(config.username)
    const isHttps =
      request.headers.get('x-forwarded-proto') === 'https' ||
      request.nextUrl.protocol === 'https:'

    const response = NextResponse.json({ ok: true, username: config.username })
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    })

    return response
  } catch (error) {
    console.error('[auth/login] error:', error)
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 }
    )
  }
}
