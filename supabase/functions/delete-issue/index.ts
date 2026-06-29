import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // ✅ LOG pour vérifier si la requête arrive
  console.log('METHOD:', req.method)

  // ✅ Gestion PRE-FLIGHT (ULTRA IMPORTANT)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204, // ⚠️ important (pas 200)
      headers: corsHeaders,
    })
  }

  try {
    const { issueId } = await req.json()

    const supabase = createClient(
      Deno.env.get('VITE_SUPABASE_URL')!,
      Deno.env.get('VITE_SUPABASE_ANON_KEY')!
    )

    const { error } = await supabase
      .from('issues')
      .delete()
      .eq('id', issueId)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: corsHeaders, // ✅ IMPORTANT
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders, // ✅ IMPORTANT
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders, // ✅ IMPORTANT
    })
  }
})