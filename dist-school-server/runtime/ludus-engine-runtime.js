(function(){
  var VERSION='1.16.18', currentLang='cs', translating=false, mo=null, translatePending=false;
  var textSources=new WeakMap(), attrSources=new WeakMap(), htmlSources=new WeakMap();
  var titleRecord={source:document.title,last:document.title,sourceLang:'cs'};
  var COPY={
    cs:{badgeTitle:'LUDUS · 3× klepnutí = učitelský režim',langTitle:'Přepnout rozhraní do angličtiny',teacher:'Učitel',map:'Mapa / začátek',skip:'Přeskočit úlohu',boss:'Finále / boss',report:'Stáhnout report',copy:'Kopírovat report',off:'Vypnout',standard:'standard LUDUS',reportTitle:'LUDUS — učitelský report',generated:'Vygenerováno',title:'Titulek',engine:'Engine',progress:'Postup',visible:'Viditelný přehled',note:'Poznámka: Report je lokální záchytný export z aktuálně otevřené hry. Pro klasifikaci vždy ověř ručně podle skutečného průběhu hodiny.',copyPrompt:'Zkopíruj report:'},
    en:{badgeTitle:'LUDUS · triple tap = teacher mode',langTitle:'Switch the interface to Czech',teacher:'Teacher',map:'Map / start',skip:'Skip task',boss:'Finale / boss',report:'Download report',copy:'Copy report',off:'Turn off',standard:'LUDUS standard',reportTitle:'LUDUS — teacher report',generated:'Generated',title:'Title',engine:'Engine',progress:'Progress',visible:'Visible summary',note:'Note: This is a local snapshot of the currently open game. Always verify grading against the actual lesson activity.',copyPrompt:'Copy the report:'}
  };
  var CS_EN={
    'Vlastník aplikace:':'Application owner:','Všechna práva vyhrazena.':'All rights reserved.','Celá obrazovka':'Fullscreen','Ukončit celou obrazovku':'Exit fullscreen','Zapnout zvuk':'Turn sound on','Vypnout zvuk':'Turn sound off','Zvuk':'Sound','Nahrát':'Upload','Zavřít panel':'Close panel','Zavřít':'Close','Hotovo':'Done','Smazat všechny':'Delete all','Smazat postup':'Reset progress','Začít znovu':'Start over','Zkusit znovu':'Try again','Pokračovat':'Continue','Nová výprava':'New quest','Pokračovat ve výpravě':'Resume quest','Přeskočit vše':'Skip all','Přeskočit cvičení':'Skip exercise','Přeskočit úlohu':'Skip task','přeskočit úlohu':'skip task','Zpět na hrad':'Back to the castle','Hrad':'Castle','Mapa':'Map','Správně':'Correct','Špatně':'Incorrect','Ověřit':'Check','Výsledek':'Result','Jméno hrdiny':'Hero name','JMÉNO HRDINY':'HERO NAME','OBTÍŽNOST VÝPRAVY':'QUEST DIFFICULTY','Nováček':'Beginner','Dobrodruh':'Adventurer','Hrdina':'Hero','chyb v souboji':'mistakes in battle','ZAHÁJIT VÝPRAVU':'BEGIN THE QUEST','VÝPRAVA ODVÁŽNÝCH':'QUEST OF THE BRAVE','Prozkoumej temnou kobku, přelstěte pasti a postavte se prastarému drakovi.':'Explore the dark dungeon, outsmart its traps and face the ancient dragon.','UČITELSKÝ NÁHLED':'TEACHER PREVIEW','Správné odpovědi vidíš přímo v úlohách (zlaté zvýraznění / předvyplněné). Panel je studentům skrytý.':'Correct answers are visible directly in the tasks. The panel remains hidden from students.','GALAKTICKÁ AKADEMIE · VÝCVIK RYTÍŘE':'GALACTIC ACADEMY · KNIGHT TRAINING','VÝCVIK MLADÉHO RYTÍŘE':'YOUNG KNIGHT TRAINING','JMÉNO KADETA':'CADET NAME','STUPEŇ VÝCVIKU':'TRAINING LEVEL','Učeň':'Apprentice','Rytíř':'Knight','Mistr':'Master','ZAHÁJIT VÝCVIK':'BEGIN TRAINING','Pokračovat ve výcviku':'Resume training','Nový výcvik':'New training','Projdi výcvikové světy, ovládni Sílu a postav se Temnému lordovi.':'Cross the training worlds, master the Force and face the Dark Lord.','SPOLEČNOST OBJEVITELŮ · VÝPRAVA ZA RELIKVIEMI':'EXPLORERS SOCIETY · RELIC EXPEDITION','VÝPRAVA ZA ZTRACENÝMI RELIKVIEMI':'QUEST FOR THE LOST RELICS','JMÉNO OBJEVITELE':'EXPLORER NAME','NÁROČNOST VÝPRAVY':'EXPEDITION DIFFICULTY','Legenda':'Legend','chyb ve finále':'mistakes in the finale','Projdi vykopávky, získej relikvie a postav se Strážci chrámu.':'Explore the excavation sites, recover the relics and face the Temple Guardian.','Hrát znovu':'Play again','Vstát a bojovat dál':'Stand up and fight on','Originál':'Original','Bezpečná verze':'Safe version','Čeština':'Czech','Angličtina':'English','KLEPNUTÍM VSTOUPÍŠ':'TAP TO ENTER','Přeskočit':'Skip','Skok na intro':'Jump to intro','Skok na mapu':'Jump to map','Skok na obvinění':'Jump to accusation','Skok na výsledek':'Jump to result','Přepnout skin':'Switch skin','Obrázky':'Images','Jazyk: EN':'Language: EN','Jazyk: CS':'Language: CS','Tvé jméno':'Your name','TVÉ JMÉNO':'YOUR NAME','Otevřít první dveře':'Open the first door','ANGLIČTINA · GRAMATIKA':'ENGLISH · GRAMMAR','KANYSTRY':'CANISTERS','REVIZE':'REVIEW','Revize':'Review','revize':'review','Žádný obsah. Builder nevložil LUDUS_CONTENT.':'No playable content was supplied by the builder.',
    'ČASOVÁ OSA':'TIMELINE',
    'CHRONOSFÉRA':'CHRONOSPHERE',
    'JEDNA ČASOVÁ OSA · NEKONEČNO ČASŮ':'ONE TIMELINE · INFINITE TIMES',
    'KOBKA OSUDU · VÝPRAVA HRDINY':'DUNGEON OF FATE · HERO\'S QUEST',
    'KOSTKA OSUDU':'DIE OF DESTINY',
    'KOSTKA':'DIE',
    'OSUDU':'OF DESTINY',
    'Zadej jméno hrdiny':'Enter the hero name',
    'Vítej v Továrně na smích. Za každými dveřmi je dětský pokoj — rozesměj děti správnými odpověďmi, naplň kanystry smíškovou energií a spusť velký výboj, který rozsvítí celé město.':'Welcome to the Laugh Factory. Behind every door is a child’s room — make the children laugh with correct answers, fill the canisters with laughter energy and trigger the surge that lights up the whole city.',
    'Továrna na smích':'Laugh Factory',
    'SMÍŠKOVÁ ENERGIE':'LAUGHTER ENERGY',
    'LUDUS · HRA':'LUDUS · GAME',
    'OTEVŘÍT PRVNÍ DVEŘE':'OPEN THE FIRST DOOR',
    'VRAŽDA V ZIMNÍM EXPRESU':'MURDER ON THE WINTER EXPRESS',
    'DETEKTIVKA / DEDUKCE':'DETECTIVE GAME / DEDUCTION',
    'JMÉNO VYŠETŘUJÍCÍHO DETEKTIVA':'INVESTIGATOR NAME',
    'ZAČÍT VYŠETŘOVÁNÍ':'BEGIN THE INVESTIGATION',
    'Máš čas do svítání. Pět podezřelých. Jeden vrah.':'You have until dawn. Five suspects. One murderer.',
    'zima':'winter',
    'Skok na místnost…':'Jump to room…',
    'Vražda v Zimním expresu':'Murder on the Winter Express',
    'TAJEMSTVÍ V JAVOROVÉ ROKLI':'THE MYSTERY OF MAPLE HOLLOW',
    'JAVOROVÁ ROKLE':'MAPLE HOLLOW',
    'LUDUS · ÚNIKOVÁ HRA':'LUDUS · ESCAPE GAME',
    'LUDUS · DETEKTIVKA':'LUDUS · DETECTIVE GAME',
    'otevírá':'opening',
    'VSTOUPIT':'ENTER',
    'Vstoupit':'Enter',
    'ZAHÁJIT HRU':'START THE GAME',
    'JMÉNO HRÁČE':'PLAYER NAME',
    'Lehká':'Easy',
    'Normální':'Normal',
    'Těžká':'Hard',
    'životů':'lives',
    'životy':'lives',
    'život':'life',
    'CHYB':'MISTAKES',
    'chyby':'mistakes',
    'chyba':'mistake',
    'Zpět na mapu':'Back to the map',
    'Znovu':'Again',
    'Nová hra':'New game',
    'Pokračovat ve hře':'Resume game',
    'Nové vyšetřování':'New investigation',
    'Pokračovat ve vyšetřování':'Resume investigation',
    'Vyšetřování':'Investigation',
    'Obvinění':'Accusation',
    'Místnost':'Room',
    'Úloha':'Task',
    'Odpověď':'Answer',
    'Nápověda':'Hint',
    'Vybrat':'Select',
    'Potvrdit':'Confirm',
    'Další':'Next',
    'Předchozí':'Previous',
    'Kopírovat':'Copy',
    'Stáhnout':'Download',
    'Učitel':'Teacher',
    'Vaše jméno':'Your name',
    'ZAPNUTO':'ON',
    'VYPNUTO':'OFF',
    'Zapnuto':'On',
    'Vypnuto':'Off',
    'Časová osa':'Timeline',
    'Chronosféra':'Chronosphere',
    'Jedna časová osa · nekonečno časů':'One timeline · infinite times',
    'Kobka osudu · výprava hrdiny':'Dungeon of Fate · Hero\'s Quest',
    'Kostka osudu':'Die of Destiny',
    'výprava odvážných':'quest of the brave',
    'Obtížnost výpravy':'Quest difficulty',
    'Zahájit výpravu':'Begin the quest',
    'chyby v souboji':'mistakes in battle',
    'chyba v souboji':'mistake in battle',
    'Mapa kobky':'Dungeon map',
    'Splněno':'Completed',
    'Dostupné':'Available',
    'Zamčeno':'Locked',
    'Otázka':'Question',
    'Útok':'Attack',
    'Temný lord':'Dark Lord',
    'Kronika výpravy':'Quest chronicle',
    'Kobka dobyta':'Dungeon conquered',
    'Skóre':'Score',
    'Úspěšnost':'Success rate',
    'Souboj':'Battle',
    'Datum':'Date',
    'zapomenout':'forget',
    'Učitelský náhled':'Teacher preview',
    'Galaktická akademie · výcvik rytíře':'Galactic Academy · Knight Training',
    'Výcvik mladého rytíře':'Young Knight Training',
    'Jméno kadeta':'Cadet name',
    'Stupeň výcviku':'Training level',
    'Zahájit výcvik':'Begin training',
    'chyby ve finále':'mistakes in the finale',
    'chyba ve finále':'mistake in the finale',
    'Společnost objevitelů · výprava za relikviemi':'Explorers Society · Relic Expedition',
    'Výprava za ztracenými relikviemi':'Quest for the Lost Relics',
    'Jméno objevitele':'Explorer name',
    'Náročnost výpravy':'Expedition difficulty',
    'LUDUS · hra':'LUDUS · game',
    'Kanystry':'Canisters',
    'Angličtina · gramatika':'English · grammar',
    'Detektivka / dedukce':'Detective game / deduction',
    'Jméno vyšetřujícího detektiva':'Investigator name',
    'Začít vyšetřování':'Begin the investigation',
    'Tajemství v Javorové rokli':'The Mystery of Maple Hollow',
    'Javorová rokle':'Maple Hollow',
    'LUDUS · úniková hra':'LUDUS · escape game',
    'LUDUS · detektivka':'LUDUS · detective game',
    'otevírám se':'opening',
    '→ obvinění':'→ accusation',
    '→ výsledek':'→ result',
    'restart':'restart',
    'Lovci relikvií':'Relic Hunters',
    'Případ Simulakrum':'The Simulacrum Case',
    'Únik z Javorové rokle':'Maple Hollow Escape',
    'Továrna na smích — LUDUS':'Laughworks Factory — LUDUS',
    'TEACHERSKÝ NÁHLED':'TEACHER PREVIEW',
    'v souboji':'in battle',
    've finále':'in the finale',
    'ČASOVÁ OSA':'TIMELINE',
    'Časová osa':'Timeline',
    'výprava za ztracenými relikviemi':'quest for the lost relics',
    'výcvik mladého rytíře':'young knight training',
    'kanystry':'canisters',
    'Klepnutím vstoupíš':'Tap to enter',
    'klepnutím vstoupíš':'tap to enter'
  };
  var EN_CS={};Object.keys(CS_EN).forEach(function(k){if(!Object.prototype.hasOwnProperty.call(EN_CS,CS_EN[k]))EN_CS[CS_EN[k]]=k;});
  var CS_EN_KEYS=Object.keys(CS_EN).sort(function(a,b){return b.length-a.length;});
  var EN_CS_KEYS=Object.keys(EN_CS).sort(function(a,b){return b.length-a.length;});
  function qs(s,r){return (r||document).querySelector(s);} function qsa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
  function contentLang(){var c=window.LUDUS_CONTENT||window.GAME_CONTENT||{},m=c.meta||{},l=c.lang||{};var v=c.uiLang||l.ui||m.uiLang||(typeof m.lang==='string'?m.lang:'');return v==='en'?'en':'cs';}
  function detectSourceLang(s){var v=String(s||''),cs=0,en=0,i;for(i=0;i<CS_EN_KEYS.length&&cs<2;i++)if(v.indexOf(CS_EN_KEYS[i])>=0)cs++;for(i=0;i<EN_CS_KEYS.length&&en<2;i++)if(v.indexOf(EN_CS_KEYS[i])>=0)en++;return en>cs?'en':'cs';}
  function replaceMappedToken(text,key,value){
    var escaped=String(key).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    var startsWord=/^[\p{L}\p{N}_]/u.test(key),endsWord=/[\p{L}\p{N}_]$/u.test(key);
    var source=(startsWord?'(^|[^\\p{L}\\p{N}_])':'')+escaped+(endsWord?'(?![\\p{L}\\p{N}_])':'');
    var re=new RegExp(source,'gu');
    return String(text).replace(re,function(match,prefix){return startsWord?(prefix+value):value;});
  }
  function translateString(s,lang,sourceLang){var out=String(s||''),src=sourceLang==='en'?'en':'cs';if(lang===src)return out;if(src==='cs'&&lang==='en'){
    out=out.replace(/Zbývají\s+(\d+)\s+život(?:y|ů)/gi,'$1 lives remaining')
      .replace(/(\d+)\s+chyb(?:a|y|u|ami)?\s+v\s+souboji/gi,'$1 mistakes in battle')
      .replace(/Legenda o draku/gi,'Legend of the dragon');
  }
    var map=src==='cs'?CS_EN:EN_CS,keys=src==='cs'?CS_EN_KEYS:EN_CS_KEYS;
    for(var i=0;i<keys.length;i++){var k=keys[i];if(out.indexOf(k)>=0)out=replaceMappedToken(out,k,map[k]);}
    return out;
  }
  function nodeRecord(node){var current=node.nodeValue,rec=textSources.get(node);if(!rec||rec.last!==current){rec={source:current,last:current,sourceLang:detectSourceLang(current)};textSources.set(node,rec);}return rec;}
  function attrRecord(el,a){var current=el.getAttribute(a),bucket=attrSources.get(el);if(!bucket){bucket={};attrSources.set(el,bucket);}var rec=bucket[a];if(!rec||rec.last!==current){rec={source:current,last:current,sourceLang:detectSourceLang(current)};bucket[a]=rec;}return rec;}
  function htmlRecord(el){var current=el.innerHTML,rec=htmlSources.get(el);if(!rec||rec.last!==current){rec={source:current,last:current,sourceLang:detectSourceLang(current)};htmlSources.set(el,rec);}return rec;}
  function translateChrome(lang){if(translating)return;translating=true;if(mo)mo.disconnect();try{
    var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:function(n){
      var p=n.parentElement;if(!p||!n.nodeValue||!n.nodeValue.trim())return NodeFilter.FILTER_REJECT;
      if(p.closest&&p.closest('#ludusStandardTeacherDock,script,style,noscript,textarea,code,pre'))return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }}),nodes=[],n;while((n=walker.nextNode()))nodes.push(n);
    nodes.forEach(function(node){var rec=nodeRecord(node),next=translateString(rec.source,lang,rec.sourceLang);if(next!==node.nodeValue)node.nodeValue=next;rec.last=next;});
    qsa('[title],[aria-label],[placeholder],[alt]').forEach(function(el){if(el.closest&&el.closest('#ludusStandardTeacherDock'))return;['title','aria-label','placeholder','alt'].forEach(function(a){if(!el.hasAttribute(a))return;var rec=attrRecord(el,a),next=translateString(rec.source,lang,rec.sourceLang);if(next!==el.getAttribute(a))el.setAttribute(a,next);rec.last=next;});});
    qsa('.ludus-owner-footer').forEach(function(el,i){if(i>0){el.remove();return;}var rec=htmlRecord(el),next=translateString(rec.source,lang,rec.sourceLang);if(next!==el.innerHTML)el.innerHTML=next;rec.last=next;});
    var manifest=window.LUDUS_GAME_MANIFEST||{},ti=manifest.title||{},nextTitle;if(titleRecord.last!==document.title){titleRecord={source:document.title,last:document.title,sourceLang:detectSourceLang(document.title)};}
    if(lang==='en'&&ti.en)nextTitle=ti.en;else if(lang==='cs'&&ti.cs)nextTitle=ti.cs;else nextTitle=translateString(titleRecord.source,lang,titleRecord.sourceLang);if(nextTitle!==document.title)document.title=nextTitle;titleRecord.last=nextTitle;
  }finally{if(mo){mo.takeRecords();mo.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder','alt']});}translating=false;}}
  function applyNative(target){
    try{if(typeof UILANG!=='undefined'){UILANG=target;if(typeof applyUILang==='function')applyUILang();}}catch(e){}
    try{if(typeof UI_LANG!=='undefined'){UI_LANG=target;if(typeof applyUiLang==='function')applyUiLang();if(typeof applyI18n==='function')applyI18n();}}catch(e){}
    try{if(typeof CURRENT_UI_LANG!=='undefined'){CURRENT_UI_LANG=target;if(typeof applyLang==='function')applyLang(target,true);else if(typeof applyStaticI18n==='function')applyStaticI18n();else if(typeof render==='function')render();}}catch(e){}
    try{if(typeof state!=='undefined'&&state&&Object.prototype.hasOwnProperty.call(state,'lang')){state.lang=target;if(typeof LUDUS_CONTENT!=='undefined'&&typeof __ludusCoerceV2==='function'&&typeof DATA!=='undefined')DATA=__ludusCoerceV2(LUDUS_CONTENT);if(typeof render==='function')render();}}catch(e){}
    try{if(typeof S!=='undefined'&&S&&Object.prototype.hasOwnProperty.call(S,'lang')){S.lang=target;if(typeof rerender==='function')rerender();else if(typeof render==='function')render();}}catch(e){}
    try{if(typeof lang!=='undefined'&&(lang==='cs'||lang==='en')){lang=target;if(typeof S!=='undefined'&&S)S.lang=target;if(typeof render==='function')render();}}catch(e){}
    try{if(typeof refreshLang==='function')refreshLang();}catch(e){}
    try{document.documentElement.lang=target;}catch(e){}
  }
  function applyStandardLabels(){var c=COPY[currentLang];var b=qs('#ludusBadge'),ls=qs('#ludusLangSwitch');if(b)b.title=c.badgeTitle;if(ls){ls.textContent=currentLang==='cs'?'CZ / EN':'EN / CZ';ls.title=c.langTitle;ls.setAttribute('aria-label',c.langTitle);}var d=qs('#ludusStandardTeacherDock');if(d){var h=qs('.lstd-title',d),n=qs('.lstd-note',d);if(h)h.textContent=c.teacher;if(n)n.textContent=c.standard;[['map','map'],['skip','skip'],['boss','boss'],['report','report'],['copy','copy'],['off','off']].forEach(function(x){var e=qs('[data-lstd="'+x[0]+'"]',d);if(e)e.textContent=c[x[1]];});}}
  function setLanguage(lang,opts){currentLang=lang==='en'?'en':'cs';try{localStorage.setItem('ludus_ui_lang',currentLang);}catch(e){}applyNative(currentLang);applyStandardLabels();translateChrome(currentLang);[50,250,800].forEach(function(delay){setTimeout(function(){applyNative(currentLang);applyStandardLabels();translateChrome(currentLang);},delay);});if(!(opts&&opts.silent)){try{document.dispatchEvent(new CustomEvent('ludus:languagechange',{detail:{lang:currentLang}}));}catch(e){}}return currentLang;}
  function ensureBadge(){var b=qs('#ludusBadge');if(!b){b=document.createElement('button');b.type='button';b.id='ludusBadge';b.textContent='LUDUS';document.body.appendChild(b);}return b;}
  function ensureLangSwitch(){var b=qs('#ludusLangSwitch');if(!b){b=document.createElement('button');b.type='button';b.id='ludusLangSwitch';document.body.appendChild(b);}b.onclick=function(){setLanguage(currentLang==='cs'?'en':'cs');};return b;}
  function ensureEndWork(){var b=qs('#ludusEndWork');if(!b){b=document.createElement('button');b.type='button';b.id='ludusEndWork';b.textContent='↪';document.body.appendChild(b);}b.title=currentLang==='en'?'End work and clear local LUDUS data':'Ukončit práci a smazat lokální data LUDUS';b.setAttribute('aria-label',b.title);b.onclick=function(){var msg=currentLang==='en'?'End work and clear local LUDUS data on this device?':'Ukončit práci a smazat lokální data LUDUS na tomto zařízení?';if(!window.confirm(msg))return;if(window.LUDUSPrivacy?.endWork)window.LUDUSPrivacy.endWork({reload:true});};return b;}
  function enableTeacher(on){document.body.classList.toggle('teacher',!!on);document.body.classList.toggle('ludus-teacher-mode',!!on);try{if(typeof window.enableTeacher==='function'&&on)window.enableTeacher();}catch(e){}try{if(typeof window.setTeacher==='function')window.setTeacher(!!on);}catch(e){}try{if(typeof window.syncTeacherUI==='function')window.syncTeacherUI();}catch(e){}try{if(window.G)window.G.teacher=!!on;}catch(e){}try{if(window.S)window.S.teacher=!!on;}catch(e){}try{sessionStorage.setItem('ludusTeacherMode',on?'1':'0');}catch(e){}}
  function teacherOn(){return document.body.classList.contains('teacher')||document.body.classList.contains('ludus-teacher-mode');}
  function wireTripleTap(el){if(!el||el.__ludusTapWired)return;el.__ludusTapWired=true;var taps=[];el.addEventListener('click',function(ev){var now=Date.now();taps=taps.filter(function(t){return now-t<1200;});taps.push(now);if(taps.length>=3){taps=[];enableTeacher(!teacherOn());try{ev.preventDefault();ev.stopPropagation();}catch(e){}}},true);}
  function clickFirst(list){for(var i=0;i<list.length;i++){var el=qs(list[i]);if(el){try{el.click();return true;}catch(e){}}}return false;}
  function collectReport(){var c=COPY[currentLang],title=(document.title||'LUDUS').trim(),manifest=window.LUDUS_GAME_MANIFEST||{},summary=null;try{summary=window.LUDUS_PROGRESS&&window.LUDUS_PROGRESS.getProgressSummary?window.LUDUS_PROGRESS.getProgressSummary():null;}catch(e){}var lines=[c.reportTitle,c.generated+': '+new Date().toLocaleString(currentLang==='en'?'en-GB':'cs-CZ'),c.title+': '+title];if(manifest.gameId||manifest.engineId)lines.push(c.engine+': '+(manifest.engineId||manifest.gameId||'')+' · '+(manifest.mechanicId||''));if(summary)lines.push(c.progress+': '+JSON.stringify(summary));var visible=qsa('.brow,#breakdown .row,.result,.summary,.score,.team,.station,.room').map(function(el){return (el.innerText||'').replace(/\s+/g,' ').trim();}).filter(Boolean).slice(0,80);if(visible.length){lines.push('',c.visible+':');visible.forEach(function(x){lines.push('- '+x);});}lines.push('',c.note);return lines.join('\n');}
  function downloadReport(){var text=collectReport(),blob=new Blob([text],{type:'text/plain;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ludus-teacher-report-'+new Date().toISOString().slice(0,10)+'.txt';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);}
  function copyReport(){var text=collectReport();if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text);else window.prompt(COPY[currentLang].copyPrompt,text);}
  function ensureDock(){if(qs('#ludusStandardTeacherDock'))return;var d=document.createElement('div');d.id='ludusStandardTeacherDock';d.innerHTML='<span class="lstd-title"></span><button type="button" data-lstd="map"></button><button type="button" data-lstd="skip"></button><button type="button" data-lstd="boss"></button><button type="button" data-lstd="report"></button><button type="button" data-lstd="copy"></button><button type="button" data-lstd="off"></button><span class="lstd-note"></span>';document.body.appendChild(d);d.addEventListener('click',function(e){var a=e.target&&e.target.getAttribute('data-lstd');if(!a)return;if(a==='map')clickFirst(['#tp-map','#tpMap','[data-act="map"]','#mapBtn','#continue-btn','#startBtn','#start']);if(a==='skip')clickFirst(['#skip-btn','#fin-skip','.skipbtn','[data-act="skip"]','#tpSkip','.teacher-skip']);if(a==='boss')clickFirst(['#tp-boss','#bossBtn','[data-act="boss"]','#finBtn','#finalBtn']);if(a==='report')downloadReport();if(a==='copy')copyReport();if(a==='off')enableTeacher(false);});}
  function boot(){var b=ensureBadge();ensureLangSwitch();ensureEndWork();wireTripleTap(b);['#logo','.brandtap','.brand','.logo'].forEach(function(sel){qsa(sel).forEach(wireTripleTap);});ensureDock();var forced=false;try{forced=/[?&]teacher=1\b/.test(location.search)||/[#&?]teacher=1\b/.test(location.hash)||sessionStorage.getItem('ludusTeacherMode')==='1';}catch(e){}if(forced)enableTeacher(true);var wanted=contentLang();try{var saved=localStorage.getItem('ludus_ui_lang');if(!window.LUDUS_CONTENT&&!window.GAME_CONTENT&&(saved==='cs'||saved==='en'))wanted=saved;}catch(e){}setLanguage(wanted,{silent:true});ensureEndWork();mo=new MutationObserver(function(){if(translating||translatePending)return;translatePending=true;var schedule=window.requestAnimationFrame||function(cb){return setTimeout(cb,16);};schedule(function(){translatePending=false;translateChrome(currentLang);});});mo.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder','alt']});window.LUDUS_STANDARD={version:VERSION,enableTeacher:enableTeacher,collectReport:collectReport,downloadReport:downloadReport,copyReport:copyReport,setLanguage:setLanguage,getLanguage:function(){return currentLang;}};window.LUDUS_I18N={version:'ludus-i18n-v1.1',setLanguage:setLanguage,getLanguage:function(){return currentLang;},translateString:translateString,languages:['cs','en']};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

;
(function () {
  'use strict';
  const CONTRACT = 'ludus-engine-runtime-v1';
  const root = document.documentElement;
  const profile = String(window.__LUDUS_MEDIA_PROFILE__ || root.dataset.ludusMediaProfile || 'safe').toLowerCase() === 'official' ? 'official' : 'safe';
  const engineId = root.dataset.ludusEngineId || '';
  const contentPackUrl = root.dataset.ludusContentPack || '';
  const state = { contract: CONTRACT, engineId, profile, contentPack: null, contentPackUrl };

  function applyMediaProfile() {
    root.dataset.ludusMediaProfile = profile;
    root.dataset.ludusMediaVariant = profile;
    document.querySelectorAll('source[data-ludus-media]').forEach((source) => {
      const selected = source.getAttribute(`data-ludus-src-${profile}`) || '';
      if (selected) source.setAttribute('src', selected);
      else source.removeAttribute('src');
      const player = source.parentElement;
      if (player && typeof player.load === 'function') {
        try { player.load(); } catch {}
      }
    });
  }

  function enhanceControls() {
    document.querySelectorAll('[onclick], [data-action], .btn, button').forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.tagName !== 'BUTTON' && node.tagName !== 'A' && !node.hasAttribute('role')) node.setAttribute('role', 'button');
      if (node.getAttribute('role') === 'button' && !node.hasAttribute('tabindex')) node.tabIndex = 0;
      if (node.getAttribute('role') === 'button' && node.tagName !== 'BUTTON') {
        node.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          node.click();
        });
      }
    });
    document.querySelectorAll('[aria-live]').forEach((node) => {
      if (!node.getAttribute('aria-atomic')) node.setAttribute('aria-atomic', 'true');
    });
  }

  async function loadContentPack() {
    if (!contentPackUrl) return null;
    try {
      const response = await fetch(contentPackUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const pack = await response.json();
      if (pack.schema !== 'ludus-engine-content-pack-v1' || pack.engineId !== engineId) throw new Error('Incompatible content pack');
      state.contentPack = Object.freeze(pack);
      window.dispatchEvent(new CustomEvent('ludus:content-pack-ready', { detail: state.contentPack }));
      return state.contentPack;
    } catch (error) {
      console.warn('[LUDUS runtime] Content pack was not loaded.', error);
      window.dispatchEvent(new CustomEvent('ludus:content-pack-error', { detail: { engineId, message: String(error?.message || error) } }));
      return null;
    }
  }

  function reportPerformance() {
    const platform = window.GHRAB_PLATFORM;
    try { platform?.performance?.mark?.(`ludus:${engineId}:ready`); } catch {}
    try {
      const snapshot = platform?.performance?.snapshot?.() || null;
      window.dispatchEvent(new CustomEvent('ludus:performance', { detail: { engineId, profile, snapshot } }));
    } catch {}
  }

  async function start() {
    applyMediaProfile();
    enhanceControls();
    await loadContentPack();
    reportPerformance();
    root.dataset.ludusRuntime = 'ready';
    window.dispatchEvent(new CustomEvent('ludus:engine-runtime-ready', { detail: Object.freeze({ ...state }) }));
  }

  const api = Object.freeze({
    contract: CONTRACT,
    get engineId() { return engineId; },
    get mediaProfile() { return profile; },
    get contentPack() { return state.contentPack; },
    applyMediaProfile,
    enhanceControls,
    loadContentPack,
    start,
  });
  window.LUDUS_ENGINE_RUNTIME = api;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => void start(), { once: true });
  else void start();
})();
