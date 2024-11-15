export interface VideoSegment {
  type: 'image' | 'video';
  src: string;
  lyrics: string;
  thumbnail?: string;
}