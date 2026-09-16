-- Common phone and browser audio formats used by profile performance samples.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp',
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/webm', 'audio/ogg',
  'video/mp4', 'video/quicktime'
]
where id = 'profile-media';
