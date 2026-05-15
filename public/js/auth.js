const SB_URL='https://czttvnvcetgmjfqishig.supabase.co';
const SB_KEY='sb_publishable_mRTR9POOteWe_D2YgpucRQ_hMMxNP1m';
const sb=supabase.createClient(SB_URL,SB_KEY);
const TD=1499;
const TARIF={starter:999,pro:1499,enterprise:2499};
const P_SIG_TEL=0.20,P_SIG_TER=0.30,P_REC_TEL=0.07,P_REC_TER=0.10;
const PAL_TEL=[{s:5,b:200},{s:10,b:400},{s:15,b:600}];
const PAL_TER=[{s:5,b:250},{s:10,b:500},{s:15,b:750}];
const ST=[
  {key:'Nouveau',label:'Nouveau',desc:'Pas encore appele',bg:'#0D2137',color:'#60A5FA',border:'#1E40AF'},
  {key:'Tente',label:'Tente',desc:'Pas decroche',bg:'#1C1500',color:'#FCD34D',border:'#92400E'},
  {key:'Joignable',label:'Joignable',desc:'A decroche',bg:'#052E16',color:'#34D399',border:'#065F46'},
  {key:'Rappeler',label:'Rappeler',desc:'Rappel planifie',bg:'#1C0A00',color:'#FB923C',border:'#7C2D12'},
  {key:'Demo Bookee',label:'Demo Bookee',desc:'RDV confirme',bg:'#1A0533',color:'#C084FC',border:'#6B21A8'},
  {key:'Demo Faite',label:'Demo Faite',desc:'En attente decision',bg:'#150529',color:'#A78BFA',border:'#5B21B6'},
  {key:'Signe',label:'Signe',desc:'Contrat signe',bg:'#052E16',color:'#4ADE80',border:'#16A34A'},
  {key:'Refus',label:'Refus',desc:'Pas interesse',bg:'#2D0A0A',color:'#F87171',border:'#991B1B'},
];

async function requireAuth(role){
  const{data:{session}}=await sb.auth.getSession();
  if(!session){window.location.href='/app.html';return null;}
  const{data:user}=await sb.from('users').select('*').eq('email',session.user.email).single();
  if(!user){await sb.auth.signOut();window.location.href='/app.html';return null;}
  if(user.statut==='suspendu'){await sb.auth.signOut();window.location.href='/app.html';return null;}
  const roles=Array.isArray(role)?role:[role];
  if(!roles.includes(user.role)){
    const redirects={owner:'/owner.html',commercial:'/commercial.html',medecin:'/medecin.html',assistante:'/assistante.html'};
    window.location.href=redirects[user.role]||'/app.html';
    return null;
  }
  return{session,user};
}

async function doLogout(){await sb.auth.signOut();window.location.href='/app.html';}

function showToast(msg,type){
  const t=document.getElementById('toast');
  if(!t)return;
  const colors={success:'#10B981',error:'#F43F5E',info:'#06B6D4',warning:'#F59E0B'};
  const icons={success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};
  t.innerHTML=(icons[type]||'ℹ️')+' '+msg;
  t.style.cssText='position:fixed;bottom:24px;right:24px;background:#fff;color:#111827;border:1px solid #E5E7EB;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:500;z-index:300;opacity:1;box-shadow:0 8px 24px rgba(0,0,0,0.1);font-family:Plus Jakarta Sans,sans-serif;display:flex;align-items:center;gap:8px;transition:opacity 0.3s';
  setTimeout(()=>{t.style.opacity='0';},3000);
}