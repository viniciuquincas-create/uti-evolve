import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://scuqankwjemqmtjwgema.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdXFhbmt3amVtcW10andnZW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NzIxMDksImV4cCI6MjA5MjU0ODEwOX0.YFK_1s5fed12sLMZRB4kXct6_DDsxAheB5hWyKlcUIg'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
