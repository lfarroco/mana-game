import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase-project-REDACTED.supabase.co';
const supabaseKey = 'sb_publishable_REDACTED';

export const supabase = createClient(supabaseUrl, supabaseKey);
