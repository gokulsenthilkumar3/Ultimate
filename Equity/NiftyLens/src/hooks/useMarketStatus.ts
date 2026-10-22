'use client'
import { useMemo } from 'react'

// NSE market hours: Mon-Fri 09:15 – 15:30 IST
export function useMarketStatus() {
  return useMemo(() => {
    const now = new Date()
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const day = ist.getDay() // 0=Sun,6=Sat
    const h = ist.getHours()
    const m = ist.getMinutes()
    const mins = h * 60 + m

    const isWeekday = day >= 1 && day <= 5
    const isOpen = isWeekday && mins >= 555 && mins < 930 // 09:15–15:30

    let nextEvent = ''
    if (!isOpen) {
      if (isWeekday && mins < 555) nextEvent = `Opens at 09:15 IST`
      else if (isWeekday && mins >= 930) nextEvent = `Opens Mon 09:15 IST`
      else nextEvent = `Opens Mon 09:15 IST`
    }

    return { isOpen, nextEvent }
  }, [])
}
