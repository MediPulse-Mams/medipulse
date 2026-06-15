import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz7H-Q8QqoQ19R_sekf0sctWGzg8mJ-jlWvj5-EdVvUYV9YCB8pElGe-yH8dY1SB-_G/exec'

// Email unique par cabinet grâce au suffix cabinetId
function genEmail(prefix: string, nom: string, cabinetId: string): string {
  const clean = nom
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 6)
  const suffix = cabinetId.replace(/-/g, '').substring(0, 4)
  return `${prefix}-${clean}${suffix}@medipulse.ma`
}

function genPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = 'Pulse#'
  for (let i = 0; i < 6; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pwd
}

async function upsertAuthUser(
  supabase: any,
  email: string,
  password: string,
  metadata: Record<string, any>
): Promise<{ id: string | null; error: string | null; existed: boolean }> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  })

  if (!error && data?.user?.id) {
    return { id: data.user.id, error: null, existed: false }
  }

  if (error && (error.message.includes('already been registered') || error.message.includes('already exists'))) {
    console.log(`[hyper-worker] User ${email} existe déjà, récupération...`)
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers()
    if (!listErr && list?.users) {
      const existing = list.users.find((u: any) => u.email === email)
      if (existing) {
        await supabase.auth.admin.updateUserById(existing.id, { password, user_metadata: metadata })
        return { id: existing.id, error: null, existed: true }
      }
    }
    return { id: null, error: `User ${email} existe mais introuvable`, existed: true }
  }

  return { id: null, error: error?.message || 'Erreur inconnue', existed: false }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[hyper-worker v5] START')

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    if (!serviceKey || !supabaseUrl) throw new Error('Variables env manquantes')

    const supabase = createClient(supabaseUrl, serviceKey)
    const body = await req.json()
    console.log('[hyper-worker v5] BODY:', JSON.stringify(body))

    // ── CLAUDE SCORE ───────────────────────────────────────────────────────
    if (body.action === 'claude_score') {
      const { prospect } = body
      if (!prospect) throw new Error('prospect manquant')

      const p = prospect
      const prompt = `Tu es l'Agent IA de Prospection MediPulse.
MediPulse est une solution SaaS marocaine qui aide les cabinets medicaux a generer davantage d'avis Google via WhatsApp et a ameliorer leur visibilite en ligne.

DONNEES PROSPECT:
Nom: ${p.nom}
Specialite: ${p.specialite}
Ville: ${p.ville || ''}${p.quartier ? ' / ' + p.quartier : ''}
Nb avis Google: ${p.nb_avis || 0}
Note Google: ${p.rating || p.note_google || 0}/5
Avis confrere principal: ${p.concurrent_principal_avis || 0}
Note confrere principal: ${p.concurrent_principal_rating || 0}/5
Site web: ${p.site_web ? 'Oui' : 'Non'}
Instagram: ${p.instagram ? 'Oui' : 'Non'}
Facebook: ${p.facebook ? 'Oui' : 'Non'}
Dabadoc: ${p.dabadoc ? 'Oui' : 'Non'}
Publicite detectee: ${p.publicite_detectee ? 'Oui' : 'Non'}
Repond aux avis: ${p.repond_aux_avis ? 'Oui' : 'Non'}
A repondu WhatsApp: ${p.a_repondu_whatsapp ? 'Oui' : 'Non'}
A repondu LinkedIn: ${p.a_repondu_linkedin ? 'Oui' : 'Non'}
Nombre relances: ${p.nombre_relances || 0}
Essai actif: ${p.essai_active ? 'Oui' : 'Non'}
Raison refus: ${p.raison_refus || 'Aucune'}
Historique: ${p.note || 'Aucun'}
Source: ${p.source || 'manuel'}

LOGIQUE DE SCORING (calcule toi-meme):
OPPORTUNITE GOOGLE (40 pts): nb_avis<20→+40, 20-50→+30, 50-100→+20, >100→+10
ECART CONCURRENTIEL (20 pts): ecart=concurrent_avis-nb_avis; >300→+20, >150→+15, >50→+10, sinon→+5
MATURITE DIGITALE (15 pts): dabadoc→+5, site_web→+3, instagram→+3, facebook→+2, repond_avis→+2
INTENTION ACHAT (15 pts): publicite→+10, repondu_wa→+3, repondu_linkedin→+2
ENGAGEMENT (10 pts): essai_actif→+10, >3 relances sans reponse→-5, refus_explicite→-10

TEMPERATURE: 0-39=froid, 40-59=tiede, 60-79=chaud, 80-100=tres_chaud
PRIORITE: 0-39=faible, 40-59=moyenne, 60-79=haute, 80-100=critique

ANGLES POSSIBLES: manque_avis, ecart_confrere, reputation_en_ligne, acquisition_patients, automatisation, gain_temps_assistante, visibilite_locale
ACTIONS POSSIBLES: appel_immediat, whatsapp_immediat, linkedin, relance_j3, relance_j7, demo, essai_gratuit, cloturer

Retourne UNIQUEMENT ce JSON valide sans markdown:
{"score":0,"temperature":"","priorite":"","probabilite_signature":0,"cas":"1","raison_principale":"","opportunite":"","angle_commercial":"","objection_probable":"","reponse_objection":"","action_recommandee":"","script_medecin":"","script_receptionniste":"","message_whatsapp":"","prochaine_action":"","resume_commercial":""}`

      const groqKey = Deno.env.get('GROQ_API_KEY')
      if (!groqKey) throw new Error('GROQ_API_KEY manquante')

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1000,
          messages: [
            { role: 'system', content: 'Tu es expert en prospection B2B medicale au Maroc. Reponds UNIQUEMENT en JSON valide sans markdown ni backticks.' },
            { role: 'user', content: prompt }
          ]
        })
      })

      const groqData = await groqRes.json()
      const text = groqData?.choices?.[0]?.message?.content || '{}'
      const clean = text.replace(/```json|```/g, '').trim()
      const result = JSON.parse(clean)

      return new Response(
        JSON.stringify({ success: true, result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── RESET PASSWORD ─────────────────────────────────────────────────────
    if (body.action === 'reset_password') {
      const { cabinetId, newPassword } = body
      if (!cabinetId || !newPassword) throw new Error('cabinetId ou newPassword manquant')
      const cabRes = await supabase.from('cabinets').select('email_medecin, email_assistante').eq('id', cabinetId).single()
      if (cabRes.error) throw new Error('Cabinet introuvable')
      const { email_medecin, email_assistante } = cabRes.data
      const { data: list } = await supabase.auth.admin.listUsers()
      const users = list?.users || []
      for (const email of [email_medecin, email_assistante]) {
        if (!email) continue
        const u = users.find((x: any) => x.email === email)
        if (u) await supabase.auth.admin.updateUserById(u.id, { password: newPassword })
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const {
      cabinetId, nomCabinet, nomMedecin, nomAssistante,
      emailMedecin, emailAssistante, specialite, ville,
      whatsapp, lienGoogle, commercial,
    } = body

    if (!cabinetId) throw new Error('cabinetId manquant')

    const results: any = { auth: [], appsScript: null, errors: [] }

    // Email unique par cabinet (suffix 4 chars du cabinetId)
    const emailMed = emailMedecin?.trim() || genEmail('dr', nomMedecin || 'medecin', cabinetId)
    const emailAss = emailAssistante?.trim() || genEmail('as', nomAssistante || 'assistante', cabinetId)
    const emailMedFictif = !emailMedecin?.trim()
    const emailAssFictif = !emailAssistante?.trim()
    const password = genPassword()

    console.log('[hyper-worker v5] Email médecin:', emailMed, emailMedFictif ? '(fictif)' : '(réel)')
    console.log('[hyper-worker v5] Email assistante:', emailAss, emailAssFictif ? '(fictif)' : '(réel)')

    // ── UPSERT MÉDECIN ─────────────────────────────────────────────────────
    const medResult = await upsertAuthUser(supabase, emailMed, password, { role: 'medecin', cabinet_id: cabinetId })
    if (medResult.error) {
      results.errors.push({ type: 'auth_medecin', message: medResult.error })
    } else {
      results.auth.push({ role: 'medecin', email: emailMed, id: medResult.id, existed: medResult.existed })
    }

    // ── UPSERT ASSISTANTE ──────────────────────────────────────────────────
    const assResult = await upsertAuthUser(supabase, emailAss, password, { role: 'assistante', cabinet_id: cabinetId })
    if (assResult.error) {
      results.errors.push({ type: 'auth_assistante', message: assResult.error })
    } else {
      results.auth.push({ role: 'assistante', email: emailAss, id: assResult.id, existed: assResult.existed })
    }

    // ── UPDATE USERS TABLE ─────────────────────────────────────────────────
    if (medResult.id) {
      await supabase.from('users').update({ auth_id: medResult.id, email: emailMed }).eq('cabinet_id', cabinetId).eq('role', 'medecin')
    }
    if (assResult.id) {
      await supabase.from('users').update({ auth_id: assResult.id, email: emailAss }).eq('cabinet_id', cabinetId).eq('role', 'assistante')
    }

    // ── PATCH CABINETS ─────────────────────────────────────────────────────
    await supabase.from('cabinets').update({ email_medecin: emailMed, email_assistante: emailAss }).eq('id', cabinetId)

    // ── APPS SCRIPT ────────────────────────────────────────────────────────
    try {
      const appsRes = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomCabinet, nomMedecin, email: emailMed,
          emailAssistante: emailAss, specialite, ville,
          tel: whatsapp || '', lienGoogle: lienGoogle || '',
          commercial: commercial || '', cabinetId,
          emailMedFictif, emailAssFictif,
        }),
      })
      const appsData = await appsRes.json()
      if (appsData.success && appsData.data) {
        results.appsScript = appsData.data
        const { sheetId, formFRUrl, formARUrl } = appsData.data
        await supabase.from('cabinets').update({ sheet_id: sheetId, form_fr_url: formFRUrl, form_ar_url: formARUrl }).eq('id', cabinetId)
      } else {
        results.errors.push({ type: 'apps_script', message: appsData.error || 'Réponse invalide' })
      }
    } catch (appsErr: any) {
      results.errors.push({ type: 'apps_script_fetch', message: appsErr.message })
    }

    const success = results.errors.length === 0
    console.log('[hyper-worker v5] DONE. Succès:', success)

    return new Response(
      JSON.stringify({
        success,
        results,
        acces: {
          medecin:    { email: emailMed,  password, url: 'https://medipulse-gamma.vercel.app/medecin.html' },
          assistante: { email: emailAss,  password, url: 'https://medipulse-gamma.vercel.app/assistante.html' },
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('[hyper-worker v5] FATAL:', err.message)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})