// Loaded only when About is opened; no effect on game generation or access policy.
let stylesReady=null;
function loadStyles(){
  if(stylesReady)return stylesReady;
  stylesReady=new Promise((resolve,reject)=>{
    const link=document.createElement('link');link.rel='stylesheet';
    link.href=new URL('./ludus-about.css',import.meta.url).href;
    const timer=setTimeout(()=>fail(),8000);
    const fail=()=>{clearTimeout(timer);link.remove();stylesReady=null;reject(new Error('About stylesheet unavailable'));};
    link.onload=()=>{clearTimeout(timer);resolve();};link.onerror=fail;
    document.head.append(link);
  });
  return stylesReady;
}
function aboutReleaseRows(items,esc){
  return '<ul class="about-releases">'+items.map(item=>{
    const split=item.indexOf(' · ');
    const version=split<0?'':item.slice(0,split);
    const description=split<0?item:item.slice(split+3);
    return '<li><span class="about-release-version">'+esc(version)+'</span><p>'+esc(description)+'</p></li>';
  }).join('')+'</ul>';
}
export async function openAboutView({version:APP_VERSION,metadata:APP_ABOUT,history:CHANGELOG,archive:CHANGELOG_ARCHIVE,escapeHtml:esc,showDialog:modalOpen}){
  await loadStyles();
  const releaseDate=/^\d{4}-\d{2}-\d{2}$/.test(APP_ABOUT.releaseDate)?APP_ABOUT.releaseDate.split('-').reverse().map(Number).join('. '):APP_ABOUT.releaseDate;
  const live=APP_ABOUT.shieldLive==='NOT TESTED'?'LIVE provoz dosud neověřen.':'Stav LIVE: '+APP_ABOUT.shieldLive+'.';
  const server=APP_ABOUT.serverStatus==='DEFERRED_BY_OWNER_DECISION'?'Nasazení školního serveru je odloženo.':'Stav školního serveru je třeba ověřit u správce.';
  modalOpen('O aplikaci',
    '<div class="about-grid">'+
      '<section class="about-identity" aria-labelledby="aboutName">'+
        '<div class="about-kicker">Součást ekosystému AI Studio</div><h4 id="aboutName">LUDUS</h4>'+
        '<p class="about-subtitle">Dílna výukových her</p>'+
        '<p class="about-description">Vyber mechaniku, svět a učivo. LUDUS z nich pomáhá připravit výukovou hru, třídní soutěž nebo lesson pack — bez programování.</p>'+
        '<span class="about-status">'+esc(APP_ABOUT.pilotStatus)+'</span>'+
      '</section>'+
      '<div class="about-facts">'+
        '<dl class="about-credits"><div><dt>Autor a vývojový garant</dt><dd>Daniel Baláž</dd></div>'+
        '<div><dt>Školní projekt</dt><dd>Gymnázium, Ostrava-Hrabůvka</dd></div></dl>'+
        '<section class="about-tech" aria-labelledby="aboutTechTitle"><h4 id="aboutTechTitle">Verze a technický stav</h4><dl>'+
          '<div><dt>Verze aplikace</dt><dd id="aboutVersion">'+esc(APP_VERSION)+'</dd></div>'+
          '<div><dt>Datum vydání</dt><dd>'+esc(releaseDate)+'</dd></div>'+
          '<div><dt>GHRAB Platform</dt><dd>'+esc(APP_ABOUT.platformVersion)+'</dd></div>'+
          '<div><dt>GHRAB AI Core</dt><dd>'+esc(APP_ABOUT.aiCoreVersion)+'</dd></div>'+
          '<div><dt>Bezpečnostní architektura</dt><dd>GARP '+esc(APP_ABOUT.garpVersion)+' · FOUNDATION</dd></div>'+
        '</dl><p class="about-scope">'+esc(live)+' '+esc(server)+' Pilotní stav není potvrzením produkční připravenosti.</p></section>'+
      '</div>'+
    '</div>'+
    '<div class="about-guidance">'+
      '<section class="about-copy"><h4>Účel a odpovědnost</h4><p>Nástroj pro učitele k přípravě a vedení výuky. Před použitím zkontroluj správnost zadání, řešení i přiměřenost třídě. AI nenahrazuje pedagogické rozhodnutí učitele.</p></section>'+
      '<section class="about-copy"><h4>Provozní zásady</h4><p>Hotovou hru před hodinou vyzkoušej. Hratelný export závisí na dostupnosti enginu pro vybranou kombinaci; jinak využij nabízený obsah, soutěž nebo lesson pack. Používej jen schválený přístup.</p></section>'+
    '</div>'+
    '<details class="about-history" id="aboutHistory"><summary>Historie vydání</summary><div class="about-history-body">'+
      '<p>Novinky a předchozí změny aplikace. Starší záznamy zůstávají zachované.</p>'+
      aboutReleaseRows(CHANGELOG,esc)+
      (CHANGELOG_ARCHIVE.length?'<details class="about-archive" id="aboutOlderChanges"><summary>Starší záznamy ('+CHANGELOG_ARCHIVE.length+')</summary>'+aboutReleaseRows(CHANGELOG_ARCHIVE,esc)+'</details>':'')+
    '</div></details>','about');
}
