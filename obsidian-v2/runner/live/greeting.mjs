import {readAboutMe} from './about.mjs';

// Spoken once when a call the user started is connected and has audio, so they hear it is live
// before they say anything. Several variations, never the same one twice in a row.
const ANY = [
 name => `Oi${name}. No que vamos trabalhar hoje?`,
 name => `Olá${name}. Por onde começamos?`,
 name => `Oi${name}. O que você tem em mente?`,
 name => `Oi${name}. Como posso ajudar?`,
 name => `Olá${name}. Pode falar.`
];
const MORNING = [name => `Bom dia${name}. O que vem primeiro hoje?`, name => `Bom dia${name}. O que você quer resolver hoje?`];
const AFTERNOON = [name => `Boa tarde${name}. Como posso ajudar?`];
const EVENING = [name => `Boa noite${name}. No que vamos trabalhar?`, name => `Boa noite${name}. O que você precisa?`];

// The name the user gave in About me ("I'm Chase.", "My name is Chase", "Name: Chase").
export function userName(text) {
 const profile=String(text??'').normalize('NFC');
 const explicit=/(?:^|[\s.!])(?:my name is|name:|meu nome [eé]|me chamo|nome:)\s+([\p{L}][\p{L}'’-]{0,30})/iu.exec(profile);
 const intro=/(?:^|[\s.!])(?:I['’]m|I am|(?:eu )?sou)\s+([\p{L}][\p{L}'’-]{0,30})/iu.exec(profile);
 const name=explicit?.[1]??intro?.[1];
 if(!name||(!explicit&&!/^\p{Lu}/u.test(name))||/^(?:a|an|the|not|here|in|on|at|from|working|building|running|o|um|uma)$/i.test(name))return null;
 return name;
}

export function greetingOptions(now = new Date()) {
 const hour = now.getHours();
 return [...ANY, ...(hour >= 5 && hour < 12 ? MORNING : hour >= 12 && hour < 17 ? AFTERNOON : hour >= 17 || hour < 2 ? EVENING : [])];
}

let last = null;
export function pickGreeting({name = null, now = new Date(), random = Math.random, previous = last} = {}) {
 const options = greetingOptions(now), suffix = name ? `, ${name}` : '';
 const lines = options.map(make => make(suffix));
 const fresh = lines.filter(line => line !== previous);
 const line = fresh[Math.min(fresh.length - 1, Math.floor(random() * fresh.length))];
 last = line;
 return line;
}

// What the bridge sends into the call. GPT-Live never speaks first on its own, and a bare line
// pushed in with no delegation made it invent a user question and answer it ("So, how does
// photosynthesis work?…", the Riemann monologues, 2026-11-22). Worded as a cue, it says the line
// and then waits: 3 of 3 silent test calls, against 2 of 2 invented turns for the bare line.
export function greetingCue(line) {
 return `A chamada acabou de conectar e a pessoa ainda não falou. Diga exatamente ${JSON.stringify(line)} Depois, espere a pessoa falar. Não acrescente perguntas ou respostas.`;
}

export function liveGreeting(root, options = {}) {
 let name = null;
 try {name = userName(readAboutMe(root)?.text)} catch {}
 return pickGreeting({...options, name});
}
