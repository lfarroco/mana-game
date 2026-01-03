import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bsorlueqmikmixlcryiq.supabase.co';
const supabaseKey = 'sb_publishable_75wmGG1tt_gr8aGscan7PQ_kH07-3E1';

export const supabase = createClient(supabaseUrl, supabaseKey);
