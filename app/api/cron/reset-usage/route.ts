import { NextRequest, NextResponse } from 'next/server'
import { subscriptionService } from '@/lib/billing/subscription'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await subscriptionService.resetMonthlyUsage()

    return NextResponse.json({
      success: true,
      message: 'Monthly usage reset completed'
    })
  } catch (error) {
    console.error('Reset usage cron error:', error)
    return NextResponse.json(
      { error: 'Failed to reset usage' },
      { status: 500 }
    )
  }
}