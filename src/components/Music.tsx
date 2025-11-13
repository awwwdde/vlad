import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'

export interface MusicTrack {
  id: string
  title: string
  audioSrc: string
  loop?: boolean
}

interface MusicProps {
  tracks: MusicTrack[]
  className?: string
  autoPlay?: boolean
  loop?: boolean
}

const Music: React.FC<MusicProps> = ({
  tracks,
  className = '',
  autoPlay = false,
  loop = false
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isMuted, setIsMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolume] = useState(0.6)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const shouldResumeRef = useRef(false)

  const currentTrack = useMemo(() => tracks[currentTrackIndex], [tracks, currentTrackIndex])
  const hasMultipleTracks = tracks.length > 1
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const formatTime = useCallback((seconds: number) => {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])
  useEffect(() => {
    setIsReady(false)
    setError(null)
    setCurrentTime(0)
    setDuration(0)
  }, [currentTrackIndex, currentTrack?.audioSrc])

  const handleNextTrack = useCallback(() => {
    if (!tracks.length) return
    shouldResumeRef.current = isPlaying
    setCurrentTrackIndex(prev => (prev + 1) % tracks.length)
  }, [tracks.length, isPlaying])

  const handlePrevTrack = useCallback(() => {
    if (!tracks.length) return
    shouldResumeRef.current = isPlaying
    setCurrentTrackIndex(prev => (prev - 1 + tracks.length) % tracks.length)
  }, [tracks.length, isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    const handleCanPlay = () => {
      setIsReady(true)
      setError(null)
      setDuration(audio.duration || 0)

      const shouldPlay = (!isMuted && (autoPlay || shouldResumeRef.current))
      if (shouldPlay) {
        audio
          .play()
          .then(() => {
            setIsPlaying(true)
            shouldResumeRef.current = false
          })
          .catch(() => {
            setIsPlaying(false)
          })
      } else {
        shouldResumeRef.current = false
      }
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleError = () => setError('Не удалось загрузить аудио')
    const handleEnded = () => {
      if (tracks.length > 1) {
        shouldResumeRef.current = true
        handleNextTrack()
      } else {
        audio.currentTime = 0
        setIsPlaying(false)
      }
    }

    audio.volume = volume
    audio.muted = isMuted

    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('error', handleError)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [autoPlay, currentTrack, handleNextTrack, isMuted, tracks.length, volume])

  const handleVolumeChange = useCallback((newVolume: number) => {
    const audio = audioRef.current
    if (!audio) return

    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    setVolume(clampedVolume)
    audio.volume = clampedVolume
    
    if (clampedVolume > 0 && isMuted) {
      setIsMuted(false)
      audio.muted = false
    } else if (clampedVolume === 0) {
      setIsMuted(true)
      audio.muted = true
    }
  }, [isMuted])

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const newTime = percent * duration
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }, [duration])

  const togglePlayPause = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    if (isPlaying) {
      audio.pause()
      return
    }

    try {
      if (isMuted) {
        audio.muted = false
        setIsMuted(false)
      }
      await audio.play()
      setIsPlaying(true)
    } catch (err) {
      console.warn('Music playback failed', err)
      setIsPlaying(false)
    }
  }, [currentTrack, isMuted, isPlaying])

  const toggleMute = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    const nextMuted = !isMuted
    audio.muted = nextMuted
    setIsMuted(nextMuted)
    
    if (!nextMuted && volume === 0) {
      handleVolumeChange(0.6)
    }
  }, [isMuted, volume, handleVolumeChange])

  const statusText = useMemo(() => {
    if (error) return error
    if (!isReady) return 'Загрузка...'
    return isPlaying ? 'Играет' : 'Пауза'
  }, [error, isPlaying, isReady])

  if (!currentTrack) {
    return null
  }

  return (
    <div
      className={`group relative flex w-full max-w-[650px] flex-col gap-3 rounded-3xl border border-white/20 bg-gradient-to-br from-white/10 via-white/8 to-white/5 p-5 text-white shadow-2xl backdrop-blur-3xl transition-all duration-300 hover:border-white/30 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] ${className}`}
    >
      <div className="flex items-center gap-2 text-xs text-white/50">
        <span className="font-mono tabular-nums">{formatTime(currentTime)}</span>
        <div
          className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/10 transition-all hover:h-2"
          onClick={handleProgressClick}
        >
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-white/60 to-white/40 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute left-0 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 transition-opacity group-hover:opacity-100"
            style={{ left: `${progress}%` }}
          />
        </div>
        <span className="font-mono tabular-nums">{formatTime(duration)}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-neue-haas text-base font-medium leading-tight text-white">
            {currentTrack.title}
          </span>
          <span className="text-xs font-feature-mono uppercase tracking-[0.18em] text-white/60">
            {statusText}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevTrack}
            disabled={!hasMultipleTracks}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 transition-all hover:scale-110 hover:bg-white/20 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 active:scale-95"
            aria-label="Предыдущий трек"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={togglePlayPause}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-white/30 bg-white/20 transition-all hover:scale-110 hover:bg-white/30 hover:shadow-xl active:scale-95"
            aria-label={isPlaying ? 'Пауза' : 'Старт'}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 translate-x-0.5" />
            ) : (
              <Play className="h-5 w-5 translate-x-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={handleNextTrack}
            disabled={!hasMultipleTracks}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 transition-all hover:scale-110 hover:bg-white/20 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 active:scale-95"
            aria-label="Следующий трек"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          <div
            className="relative flex items-center gap-2"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              type="button"
              onClick={toggleMute}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 transition-all hover:scale-110 hover:bg-white/20 hover:shadow-lg active:scale-95"
              aria-pressed={!isMuted}
              aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ${
                showVolumeSlider ? 'w-24 opacity-100' : 'w-0 opacity-0'
              }`}
            >
              <div className="flex items-center gap-2 py-1">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-white/60 transition-all hover:h-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:h-4 [&::-webkit-slider-thumb]:hover:w-4 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
                  aria-label="Громкость"
                />
                <span className="text-[10px] font-mono tabular-nums text-white/60 shrink-0 min-w-[28px] text-right">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <audio
        key={currentTrack.audioSrc}
        ref={audioRef}
        src={currentTrack.audioSrc}
        preload="auto"
        loop={currentTrack.loop ?? loop}
      />
    </div>
  )
}

export default Music
