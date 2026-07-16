import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const { issueId } = await req.json()

    // Client authentifié avec le JWT de l'appelant : auth.getUser() ci-dessous
    // vérifie réellement l'identité (verify_jwt côté plateforme ne fait que
    // s'assurer que le token est valide, pas qui est propriétaire de l'issue).
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const { data: issue, error: fetchError } = await supabase
      .from('issues')
      .select('created_by')
      .eq('id', issueId)
      .maybeSingle()

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    if (!issue || issue.created_by !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Vous n'êtes pas autorisé à supprimer ce signalement" }), {
        status: 403,
        headers: corsHeaders,
      })
    }

    const { error } = await supabase
      .from('issues')
      .delete()
      .eq('id', issueId)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})