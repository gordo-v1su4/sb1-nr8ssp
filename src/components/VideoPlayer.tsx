import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Scissors, Move, Zap } from 'lucide-react';
import { formatTime } from '../utils/timeFormat';
import type { VideoSegment } from '../types';

interface VideoPlayerProps {
  segments: VideoSegment[];
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  onPlayPause: () => void;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  analyser: AnalyserNode | null;
}

export function VideoPlayer({
  segments,
  audioRef,
  isPlaying,
  onPlayPause,
  currentTime,
  onTimeUpdate,
  analyser
}: VideoPlayerProps) {
  const [currentSegment, setCurrentSegment] = useState(0);
  const [scale, setScale] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const duration = audioRef.current?.duration || 0;
  const lastBeatTime = useRef(0);
  const lastScaleTime = useRef(0);
  const energyHistory = useRef<number[]>([]);
  const beatHistory = useRef<number[]>([]);
  const frameRef = useRef<number>(0);
  
  const controls = useRef({
    cutSensitivity: 0.5,
    cutFrequency: 0.5,
    scaleSensitivity: 0.5,
    scaleFrequency: 0.5
  });

  const [controlValues, setControlValues] = useState(controls.current);

  const updateControl = useCallback((name: keyof typeof controls.current, value: number) => {
    controls.current[name] = value;
    setControlValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const detectBeat = useCallback((frequencies: Uint8Array, sampleRate: number) => {
    // Analyze specific frequency bands for beat detection
    const lowEnd = frequencies.slice(0, 6);  // 0-120Hz
    const lowMids = frequencies.slice(6, 12); // 120-240Hz
    const highMids = frequencies.slice(12, 24); // 240-480Hz
    
    const lowEndEnergy = Array.from(lowEnd).reduce((sum, val) => sum + val, 0) / lowEnd.length;
    const lowMidsEnergy = Array.from(lowMids).reduce((sum, val) => sum + val, 0) / lowMids.length;
    const highMidsEnergy = Array.from(highMids).reduce((sum, val) => sum + val, 0) / highMids.length;
    
    // Weight the energies based on their importance for beat detection
    const instantEnergy = (lowEndEnergy * 1.4 + lowMidsEnergy * 0.75 + highMidsEnergy * 0.5) / 2.65;
    
    beatHistory.current.push(instantEnergy);
    if (beatHistory.current.length > 43) { // About 1 second of history at 43Hz
      beatHistory.current.shift();
    }
    
    const localAverage = beatHistory.current.reduce((sum, val) => sum + val, 0) / beatHistory.current.length;
    const variance = beatHistory.current.reduce((sum, val) => sum + Math.pow(val - localAverage, 2), 0) / beatHistory.current.length;
    
    // Dynamic threshold based on local energy levels
    const threshold = localAverage + Math.sqrt(variance) * 1.2;
    
    return {
      isBeat: instantEnergy > threshold,
      energy: instantEnergy / 255, // Normalize to 0-1
      intensity: (instantEnergy - localAverage) / (threshold - localAverage) // How much above threshold
    };
  }, []);

  const analyzeAudio = useCallback(() => {
    if (!analyser || !isPlaying) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const beatInfo = detectBeat(dataArray, analyser.context.sampleRate);
    
    // Only process effects if sensitivity is above 0
    if (controls.current.cutSensitivity > 0 || controls.current.scaleSensitivity > 0) {
      const now = Date.now();
      
      // Cut detection
      if (controls.current.cutSensitivity > 0) {
        const minInterval = 1000 - (controls.current.cutFrequency * 900); // 100ms to 1000ms
        const shouldCut = beatInfo.isBeat && 
                         beatInfo.intensity > controls.current.cutSensitivity * 0.7 &&
                         now - lastBeatTime.current > minInterval;

        if (shouldCut) {
          lastBeatTime.current = now;
          
          // Varied transition patterns based on beat intensity and frequency
          const changePattern = Math.random() * beatInfo.intensity;
          if (changePattern > 0.8 && controls.current.cutFrequency > 0.7) {
            setCurrentSegment(Math.floor(Math.random() * segments.length));
          } else if (changePattern > 0.5) {
            setCurrentSegment(prev => (prev + 1) % segments.length);
          }
        }
      }
      
      // Scale effect
      if (controls.current.scaleSensitivity > 0) {
        const scaleInterval = 100 - (controls.current.scaleFrequency * 90); // 10ms to 100ms
        const shouldScale = beatInfo.energy > (controls.current.scaleSensitivity * 0.3) &&
                          now - lastScaleTime.current > scaleInterval;

        if (shouldScale) {
          lastScaleTime.current = now;
          const scaleIntensity = controls.current.scaleSensitivity * 0.15;
          const scaleAmount = 1 + (beatInfo.energy * scaleIntensity);
          setScale(scaleAmount);
        } else {
          setScale(prev => {
            const target = 1;
            const speed = 0.1 + (controls.current.scaleFrequency * 0.2);
            return prev + (target - prev) * speed;
          });
        }
      } else {
        setScale(1); // Reset scale when sensitivity is 0
      }
    } else {
      // Reset everything when all controls are at 0
      setScale(1);
    }
  }, [analyser, isPlaying, segments.length, detectBeat]);

  useEffect(() => {
    if (!analyser || !isPlaying) return;

    const animate = () => {
      analyzeAudio();
      frameRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(frameRef.current);
  }, [analyser, isPlaying, analyzeAudio]);

  useEffect(() => {
    const currentSegmentData = segments[currentSegment];
    if (currentSegmentData?.type === 'video' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentSegment, segments]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    onTimeUpdate(newTime);
  };

  const currentSegmentData = segments[currentSegment];

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="aspect-video bg-black relative">
        <div className="absolute inset-0 w-full h-full">
          {currentSegmentData?.type === 'video' ? (
            <video
              ref={videoRef}
              src={currentSegmentData?.src}
              className="w-full h-full object-cover"
              style={{
                transform: `scale(${scale})`,
                transition: 'transform 100ms ease-out'
              }}
              loop
              muted
            />
          ) : (
            <img 
              src={currentSegmentData?.src}
              alt="Current frame"
              className="w-full h-full object-cover"
              style={{
                transform: `scale(${scale})`,
                transition: 'transform 100ms ease-out'
              }}
            />
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div 
          className="progress-bar h-1.5 rounded-full overflow-hidden cursor-pointer relative"
          onClick={handleTimelineClick}
        >
          <div 
            className="progress-bar-fill h-full absolute left-0 top-0"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onPlayPause}
              className="control-button p-2 rounded-lg"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>

            <div className="text-sm space-x-2">
              <span>{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-white/10">
          <div className="flex items-center gap-3">
            <Scissors className="w-4 h-4" style={{ color: 'var(--accent-color)' }} />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Cut Sensitivity</span>
                <span>{Math.round(controlValues.cutSensitivity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={controlValues.cutSensitivity}
                onChange={(e) => updateControl('cutSensitivity', Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4" style={{ color: 'var(--accent-color)' }} />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Cut Frequency</span>
                <span>{Math.round(controlValues.cutFrequency * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={controlValues.cutFrequency}
                onChange={(e) => updateControl('cutFrequency', Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Move className="w-4 h-4" style={{ color: 'var(--accent-color)' }} />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Scale Sensitivity</span>
                <span>{Math.round(controlValues.scaleSensitivity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={controlValues.scaleSensitivity}
                onChange={(e) => updateControl('scaleSensitivity', Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4" style={{ color: 'var(--accent-color)' }} />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Scale Frequency</span>
                <span>{Math.round(controlValues.scaleFrequency * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={controlValues.scaleFrequency}
                onChange={(e) => updateControl('scaleFrequency', Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}