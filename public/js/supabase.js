const SB_URL='https://czttvnvcetgmjfqishig.supabase.co';
const SB_KEY='sb_publishable_mRTR9POOteWe_D2YgpucRQ_hMMxNP1m';
const sb=supabase.createClient(SB_URL,SB_KEY);
const TD=1499;
const TARIF={starter:999,pro:1499,enterprise:2499};
const P_SIG_TEL=0.20,P_SIG_TER=0.30,P_REC_TEL=0.07,P_REC_TER=0.10;
const PAL_TEL=[{s:5,b:200},{s:10,b:400},{s:15,b:600}];
const PAL_TER=[{s:5,b:250},{s:10,b:500},{s:15,b:750}];
const ST=[
{key:'Nouveau',label:'Nouveau',desc:'Pas encore appele',bg:'#EFF6FF',color:'#2563EB',border:'#BFDBFE'},
{key:'Tente',label:'Tente',desc:'Pas decroche',bg:'#FEFCE8',color:'#CA8A04',border:'#FDE68A'},
{key:'Joignable',label:'Joignable',desc:'A decroche',bg:'#F0FDF4',color:'#16A34A',border:'#BBF7D0'},
{key:'Rappeler',label:'Rappeler',desc:'Rappel planifie',bg:'#FFF7ED',color:'#EA580C',border:'#FED7AA'},
{key:'Demo Bookee',label:'Demo Bookee',desc:'RDV confirme',bg:'#FAF5FF',color:'#9333EA',border:'#E9D5FF'},
{key:'Demo Faite',label:'Demo Faite',desc:'En attente',bg:'#F5F3FF',color:'#7C3AED',border:'#DDD6FE'},
{key:'Signe',label:'Signe',desc:'Contrat signe',bg:'#F0FDF4',color:'#15803D',border:'#86EFAC'},
{key:'Refus',label:'Refus',desc:'Pas interesse',bg:'#FFF1F2',color:'#BE123C',border:'#FECDD3'},
];