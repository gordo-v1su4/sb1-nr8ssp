import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image, Plus, ChevronDown, Video, X } from 'lucide-react';
import { VideoPlayer } from './components/VideoPlayer';
import { PromptBox } from './components/PromptBox';
import type { VideoSegment } from './types';

const initialSequences = [
  {
    id: '1',
    segments: [
      { type: 'image', src: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&q=80', lyrics: 'Verse 1' },
      { type: 'image', src: 'https://images.unsplash.com/photo-1571974599782-7c0518027768?auto=format&fit=crop&q=80', lyrics: 'Line 2' },
      { type: 'image', src: 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?auto=format&fit=crop&q=80', lyrics: 'Line 3' },
      { type: 'image', src: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&q=80', lyrics: 'Line 4' },
      { type: 'image', src: 'https://images.unsplash.com/photo-1583795128727-6ec3642408f8?auto=format&fit=crop&q=80', lyrics: 'Line 5' },
      { type: 'image', src: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80', lyrics: 'Line 6' },
      { type: 'image', src: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80', lyrics: 'Line 7' },
      { type: 'image', src: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&q=80', lyrics: 'Line 8' },
    ] as VideoSegment[]
  }
];

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [sequences, setSequences] = useState(initialSequences);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audioRef.current?.currentTime || 0);
    };

    audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audioRef.current?.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  const handleMediaUpload = (files: FileList | null, sequenceId: string) => {
    if (!files?.length) return;

    const file = files[0];
    const isVideo = file.type.startsWith('video/');
    const url = URL.createObjectURL(file);

    setSequences(prev => prev.map(seq => {
      if (seq.id === sequenceId) {
        return {
          ...seq,
          segments: [...seq.segments, {
            type: isVideo ? 'video' : 'image',
            src: url,
            lyrics: '',
            thumbnail: isVideo ? generateThumbnail(url) : undefined
          }]
        };
      }
      return seq;
    }));
  };

  const removeSegment = (sequenceId: string, index: number) => {
    setSequences(prev => prev.map(seq => {
      if (seq.id === sequenceId) {
        const newSegments = [...seq.segments];
        newSegments.splice(index, 1);
        return { ...seq, segments: newSegments };
      }
      return seq;
    }));
  };

  const generateThumbnail = async (videoUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.currentTime = 0;
      video.addEventListener('loadeddata', () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      });
    });
  };

  const handleAudioUpload = (files: FileList | null) => {
    if (!files?.length) return;
    
    const file = files[0];
    if (!file.type.startsWith('audio/')) {
      alert('Please upload an audio file');
      return;
    }

    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.load();
    }

    setupAudioContext();
  };

  const setupAudioContext = () => {
    if (!audioRef.current) return;

    audioContextRef.current = new AudioContext();
    const source = audioContextRef.current.createMediaElementSource(audioRef.current);
    const analyser = audioContextRef.current.createAnalyser();
    
    source.connect(analyser);
    analyser.connect(audioContextRef.current.destination);
    
    analyser.fftSize = 2048;
    analyserRef.current = analyser;
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const addSequence = () => {
    setSequences(prev => [...prev, {
      id: Date.now().toString(),
      segments: []
    }]);
  };

  return (
    <div className="min-h-screen p-6">
      <main className="container mx-auto max-w-4xl">
        <div className="space-y-6">
          <header className="glass rounded-2xl p-4">
            <h1 className="text-2xl font-bold mb-4">Nerate Ninja AI</h1>
            <div className="flex gap-4">
              <label className="control-button flex-1 flex items-center justify-center gap-2 p-4 rounded-xl cursor-pointer">
                <Upload className="w-5 h-5" />
                <span>Upload Audio</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => handleAudioUpload(e.target.files)}
                />
              </label>
            </div>
          </header>

          <div className="glass rounded-2xl p-4">
            <div 
              className="collapsible-header flex items-center gap-2 mb-4"
              onClick={() => setIsPromptOpen(!isPromptOpen)}
            >
              <ChevronDown 
                className={`w-5 h-5 transition-transform ${isPromptOpen ? 'rotate-180' : ''}`}
              />
              <h2 className="text-lg font-semibold">Image Generation</h2>
            </div>
            <div className={`collapsible-content ${isPromptOpen ? '' : 'collapsed'}`}>
              <PromptBox />
            </div>
          </div>

          {sequences.map((sequence, index) => (
            <div key={sequence.id} className="glass rounded-2xl p-4">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <Image className="w-4 h-4" /> Sequence {String(index + 1).padStart(3, '0')}
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {sequence.segments.map((segment, i) => (
                  <div key={i} className="aspect-video rounded-xl overflow-hidden relative group">
                    {segment.type === 'video' ? (
                      <>
                        <img 
                          src={segment.thumbnail || segment.src}
                          alt={`Scene ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <Video className="absolute top-2 right-2 w-4 h-4 text-white" />
                      </>
                    ) : (
                      <img 
                        src={segment.src}
                        alt={`Scene ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <button
                      onClick={() => removeSegment(sequence.id, i)}
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
                <label className="control-button aspect-video rounded-xl flex items-center justify-center group cursor-pointer">
                  <Plus className="w-8 h-8 text-gray-400 group-hover:accent-text" />
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => handleMediaUpload(e.target.files, sequence.id)}
                  />
                </label>
              </div>
            </div>
          ))}

          <button
            onClick={addSequence}
            className="control-button w-full p-4 rounded-xl flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Sequence</span>
          </button>

          <VideoPlayer 
            segments={sequences[0].segments}
            audioRef={audioRef}
            isPlaying={isPlaying}
            onPlayPause={togglePlayback}
            currentTime={currentTime}
            onTimeUpdate={handleTimeUpdate}
            analyser={analyserRef.current}
          />
        </div>
      </main>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}