const $=id=>document.getElementById(id);
const robot=$('robot'),route=$('routePath'),ambulance=$('ambulance'),chat=$('chat'),actions=$('actions'),scenario=$('scenario');
const data={
 caida:{name:'Caída',material:'gasa y cinta médica',severity:'inicial'},
 sangrado:{name:'Sangrado',material:'gasas y cinta médica',severity:'inicial'},
 fractura:{name:'Posible fractura',material:'férula y vendaje',severity:'profesional'},
 desmayo:{name:'Desmayo',material:'kit de primeros auxilios',severity:'profesional'},
 grave:{name:'Emergencia médica grave',material:'asistencia profesional',severity:'urgente'}
};
let running=false,voice=true,speaking=false,presentation=false,pendingDecision=null,runId=0;

const wait=ms=>new Promise(r=>setTimeout(r,ms));
function message(text,who='bot'){const d=document.createElement('div');d.className='chat-msg '+who;d.textContent=text;chat.appendChild(d);chat.scrollTop=chat.scrollHeight;}
function status(text){$('presentationStatus').textContent=text;}
function showDialogue(text,speaker='ROBOT'){
  $('presentationDialogue').textContent=text;
  $('presentationSpeaker').textContent=speaker;
}
function speak(text){
  return new Promise(resolve=>{
    if(!voice || !('speechSynthesis' in window)){resolve();return;}
    speechSynthesis.cancel(); speaking=true; $('voiceStatus').textContent='🔊 Reproduciendo…';
    const u=new SpeechSynthesisUtterance(text); u.lang='es-SV';u.rate=.86;u.pitch=1;u.volume=1;
    let done=false; const finish=()=>{if(done)return;done=true;speaking=false;$('voiceStatus').textContent='🔊 Voz lista';resolve();};
    u.onend=finish;u.onerror=finish;
    speechSynthesis.speak(u);
  });
}
async function sayRobot(text){
  message(text,'bot'); showDialogue(text,'ROBOT'); status(presentation?'SIMULACIÓN EN CURSO':'SIMULACIÓN');
  $('incident').classList.remove('speaking');
  await speak(text);
}
async function sayPerson(text){
  message(text,'user'); showDialogue(text,'PERSONA DEL INCIDENTE'); status('PERSONA DEL INCIDENTE HABLANDO');
  $('incident').classList.add('speaking');
  await speak(text);
  $('incident').classList.remove('speaking');
}
function steps(n){for(let i=1;i<=5;i++){const e=$('step'+i);e.classList.remove('current','done');if(i<n)e.classList.add('done');if(i===n)e.classList.add('current');}}
function normalButton(text,fn){const b=document.createElement('button');b.textContent=text;b.className='choice-btn';b.onclick=()=>{if(b.disabled)return;fn();};actions.appendChild(b);return b;}
function decision(question,choices){
  return new Promise(resolve=>{
    pendingDecision=resolve; actions.innerHTML=''; $('presentationChoices').innerHTML='';
    showDialogue(question); status(presentation?'MODO PRESENTACIÓN · ESPERANDO TU DECISIÓN':'ESPERANDO DECISIÓN');
    const add=(label,value)=>{
      const make=parent=>{const b=document.createElement('button');b.className='choice-btn big-choice';b.textContent=label;b.onclick=()=>{
        if(!pendingDecision || b.disabled)return;
        [...parent.querySelectorAll('button')].forEach(x=>x.disabled=true); pendingDecision=null;
        message('Persona: '+label,'user'); if(presentation)$('presentationChoices').innerHTML=''; else actions.innerHTML='';
        resolve(value);
      };parent.appendChild(b);};
      make(presentation?$('presentationChoices'):actions);
    };
    choices.forEach(c=>add(c.label,c.value));
    if(presentation) $('presentationChoices').classList.add('visible');
  });
}
function reset(){
  runId++; running=false;pendingDecision=null;speaking=false;if('speechSynthesis'in window)speechSynthesis.cancel();
  robot.classList.remove('drawer-open');robot.style.left='14%';robot.style.top='62%';route.style.opacity='0';ambulance.style.opacity='0';ambulance.style.left='1%';
  $('pill').textContent='EN ESPERA';$('pill').className='pill';$('missionTitle').textContent='Patrullaje preventivo';$('robotState').textContent='Patrullando';$('mapGps').textContent='GPS · Esperando ubicación';$('heroScenario').textContent=data[scenario.value].name;
  chat.innerHTML='<div class="chat-msg bot">El sistema está listo. Inicie una simulación.</div>';actions.innerHTML='';steps(1);$('startBtn').disabled=false;$('voiceStatus').textContent=voice?'🔊 Voz lista':'🔇 Voz apagada';
  showDialogue('El robot está patrullando el parque.','ROBOT');status(presentation?'MODO PRESENTACIÓN':'LISTO');$('presentationChoices').innerHTML='';$('presentationChoices').classList.remove('visible');
}
async function moveRobot(left,top,ms=1800){robot.style.left=left;robot.style.top=top;await wait(ms);}
async function escalate(d,myRun){
  if(myRun!==runId)return; actions.innerHTML='';steps(5);$('pill').textContent='EMERGENCIAS ACTIVADAS';$('pill').className='pill live';$('robotState').textContent='Asistiendo';
  await sayRobot('Voy a enviar la ubicación exacta a los servicios de emergencia y permaneceré junto a la persona mientras llega la ayuda.');
  if(myRun!==runId)return; ambulance.style.opacity='1';ambulance.style.left='72%';await wait(1600);
  await sayRobot('Sistema: unidad de emergencia solicitada. La ubicación fue compartida con el servicio de emergencia.');
  status(presentation?'SIMULACIÓN FINALIZADA · ROBOT EN EL LUGAR':'ASISTIENDO');
  if(!presentation){normalButton('🔊 Escuchar instrucciones',()=>speak('Permanezca junto a la persona y siga las instrucciones del asistente.'));normalButton('♿ Mostrar ruta accesible',()=>message('Sistema: ruta accesible mostrada en el mapa.','user'));}
}
async function runPresentation(){
  const myRun=runId,d=data[scenario.value];
  running=true;$('startBtn').disabled=true;
  status('SIMULACIÓN EN CURSO');
  await wait(350);if(myRun!==runId)return;

  $('pill').textContent='INCIDENTE';$('pill').className='pill alert';
  $('missionTitle').textContent='Incidente detectado';$('robotState').textContent='Alerta recibida';
  route.style.opacity='1';$('mapGps').textContent='GPS · Ubicación detectada';steps(1);
  message(`Sistema: se detectó una ${d.name.toLowerCase()} en la zona recreativa.`);
  await sayRobot('He detectado una posible emergencia. Voy a dirigirme hacia la persona.');
  if(myRun!==runId)return;

  steps(2);$('pill').textContent='MISIÓN ASIGNADA';$('robotState').textContent='Desplazándose';
  message('Sistema: Robot R-01 asignado. Calculando una ruta accesible.');
  await moveRobot('43%','51%',1900);if(myRun!==runId)return;

  steps(3);$('pill').textContent='EN EL INCIDENTE';$('robotState').textContent='En el lugar';
  await moveRobot('78%','43%',1500);if(myRun!==runId)return;
  await sayRobot('Ya llegué al lugar del incidente. Voy a realizar una evaluación inicial.');
  await sayRobot('Hola. Soy el asistente de primeros auxilios del parque. Estoy aquí para ayudarte.');
  await sayRobot('Necesito realizar una evaluación inicial. ¿La persona está consciente?');

  // La presentación es 100 % automática: la persona responde mediante voz.
  if(d.severity==='urgente' || d.name==='Desmayo'){
    await sayRobot('Voy a comprobar el estado de respuesta de la persona.');
    await sayRobot('La persona no responde.');
    await sayRobot('Entendido. La persona está inconsciente.');
    await sayRobot('Esta situación requiere asistencia profesional.');
    await escalate(d,myRun);return;
  }

  await sayPerson('Sí, estoy consciente.');
  await sayRobot('De acuerdo. La persona está consciente.');
  await sayRobot('Ahora necesito comprobar si presenta sangrado importante.');

  if(d.name==='Sangrado'){
    await sayPerson('Sí, tengo sangrado importante.');
    await sayRobot(`Entendido. Prepararé ${d.material} para la atención inicial.`);
  }else{
    await sayPerson('No, no tengo sangrado importante.');
    await sayRobot('De acuerdo. No se observa sangrado importante. Continuemos con la atención inicial.');
  }

  if(d.severity==='profesional'){
    await sayRobot('Por las características de este escenario, también solicitaré asistencia profesional. Mientras tanto, continuaré guiando la atención.');
    await escalate(d,myRun);return;
  }

  await sayRobot('Tengo disponible el material básico. Voy a abrir el compartimento de primeros auxilios.');
  robot.classList.add('drawer-open');await wait(900);if(myRun!==runId)return;
  await sayPerson('De acuerdo.');
  await sayRobot('Compartimento abierto. Puedes utilizar el material indicado.');
  await sayRobot('Continuaré dando instrucciones mientras sea necesario.');
  status('SIMULACIÓN FINALIZADA · ATENCIÓN BÁSICA');
  $('pill').textContent='ATENCIÓN COMPLETADA';$('pill').className='pill';
  $('robotState').textContent='Asistiendo';
}

async function runSimulation(){
  const myRun=runId,d=data[scenario.value]; running=true;$('startBtn').disabled=true;
  await wait(500);if(myRun!==runId)return;
  $('pill').textContent='INCIDENTE';$('pill').className='pill alert';$('missionTitle').textContent='Incidente detectado';$('robotState').textContent='Alerta recibida';route.style.opacity='1';$('mapGps').textContent='GPS · Ubicación detectada';message(`Sistema: se detectó una ${d.name.toLowerCase()} en la zona recreativa.`);steps(1);
  await sayRobot('Recibí la alerta. Voy hacia el lugar.');if(myRun!==runId)return;
  steps(2);$('pill').textContent='MISIÓN ASIGNADA';$('robotState').textContent='Desplazándose';message('Sistema: Robot R-01 asignado. Calculando una ruta accesible.');await moveRobot('43%','51%',1900);if(myRun!==runId)return;
  steps(3);$('pill').textContent='EN EL INCIDENTE';$('robotState').textContent='En el lugar';await moveRobot('78%','43%',1500);if(myRun!==runId)return;
  await sayRobot('Hola. Soy el asistente de primeros auxilios del parque. Estoy aquí para ayudarte.');
  await sayRobot('Necesito realizar una evaluación inicial. ¿La persona está consciente?');
  const conscious=await decision('¿La persona está consciente?',[{label:'SÍ, ESTÁ CONSCIENTE',value:'yes'},{label:'NO, ESTÁ INCONSCIENTE',value:'no'}]);if(myRun!==runId)return;
  if(conscious==='no'){
    await sayRobot('Entendido. La persona está inconsciente.');
    await sayRobot('Esta situación requiere asistencia profesional.');
    await escalate(d,myRun);return;
  }
  await sayRobot('De acuerdo. La persona está consciente.');
  await sayRobot('Ahora necesito comprobar si presenta sangrado importante.');
  const bleeding=await decision('¿Presenta sangrado importante?',[{label:'SÍ, HAY SANGRADO',value:'yes'},{label:'NO HAY SANGRADO',value:'no'}]);if(myRun!==runId)return;
  if(bleeding==='yes'){
    await sayRobot(`Entendido. Prepararé ${d.material} para la atención inicial.`);
  }else{
    await sayRobot('De acuerdo. No se observa sangrado importante. Continuemos con la atención inicial.');
  }
  if(d.severity==='profesional'||d.severity==='urgente'){
    await sayRobot('Por las características de este escenario, también solicitaré asistencia profesional. Mientras tanto, continuaré guiándote.');
    await escalate(d,myRun);return;
  }
  await sayRobot('Tengo disponible el material básico. ¿Quieres que abra el compartimento de primeros auxilios?');
  const drawer=await decision('¿Deseas abrir el compartimento de primeros auxilios?',[{label:'SÍ, ABRIR COMPARTIMENTO',value:'open'},{label:'SOLICITAR AMBULANCIA',value:'ambulance'}]);if(myRun!==runId)return;
  if(drawer==='ambulance'){await escalate(d,myRun);return;}
  robot.classList.add('drawer-open');await wait(900);
  await sayRobot('Compartimento abierto. Puedes utilizar el material indicado.');
  await sayRobot('Continuaré dando instrucciones mientras sea necesario.');
  status(presentation?'SIMULACIÓN FINALIZADA · ATENCIÓN BÁSICA':'ATENCIÓN BÁSICA COMPLETADA');
  if(!presentation)normalButton('🔊 Escuchar instrucciones',()=>speak('Siga las instrucciones del asistente y solicite ayuda profesional si la situación empeora.'));
}
function start(){reset();runSimulation();}
$('startBtn').onclick=start;$('resetBtn').onclick=reset;scenario.onchange=reset;
$('voiceToggle').onclick=()=>{voice=!voice;$('voiceToggle').textContent='Voz: '+(voice?'ON':'OFF');$('voiceStatus').textContent=voice?'🔊 Voz lista':'🔇 Voz apagada';if(!voice&&'speechSynthesis'in window)speechSynthesis.cancel()};
$('presentationBtn').onclick=()=>{
  presentation=!presentation;
  document.body.classList.toggle('presentation',presentation);
  $('presentationBtn').textContent=presentation?'✕ SALIR DE PRESENTACIÓN':'▶ MODO PRESENTACIÓN';
  if(presentation){
    reset();
    presentation=true;
    document.body.classList.add('presentation');
    $('presentationBtn').textContent='✕ SALIR DE PRESENTACIÓN';
    runPresentation();
  }else{
    runId++;running=false;pendingDecision=null;
    if('speechSynthesis' in window)speechSynthesis.cancel();
    $('presentationChoices').innerHTML='';$('presentationChoices').classList.remove('visible');
    status('LISTO');
  }
};
$('presentationReset').onclick=reset;$('presentationExit').onclick=()=>{$('presentationBtn').click()};
reset();
