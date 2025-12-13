import { useEffect, useState, useCallback } from 'react'
import { getObsStatus, getPlaylist } from '@/server/functions/obs'

interface RealtimeState {
  obsConnected: boolean
  playlist: string[]
}

export function useRealtimeState() {
  const [state, setState] = useState<RealtimeState>({
    obsConnected: false,
    playlist: [],
  })

  const fetchStatus = useCallback(async () => {
    try {
      const [obsStatus, playlist] = await Promise.all([
        getObsStatus(),
        getPlaylist(),
      ])
      setState({
        obsConnected: obsStatus.connected,
        playlist: playlist,
      })
    } catch (error) {
      console.error('Error fetching status:', error)
    }
  }, [])

  useEffect(() => {
    // Initial fetch
    fetchStatus()

    // Poll every 2 seconds
    const interval = setInterval(fetchStatus, 2000)

    return () => {
      clearInterval(interval)
    }
  }, [fetchStatus])

  return state
}
