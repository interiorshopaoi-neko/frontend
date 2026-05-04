import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lboskhjidbqxwrenwjdr.supabase.co'
const supabaseKey = 'sb_publishable_v2U-RibzTmtIOJnY3f5pyw_aRDL4dJG'

console.log('SUPABASE_URL', supabaseUrl)
console.log('SUPABASE_KEY', supabaseKey ? supabaseKey.slice(0, 10) + '...' : '（空）')

export const supabase = createClient(supabaseUrl, supabaseKey)

