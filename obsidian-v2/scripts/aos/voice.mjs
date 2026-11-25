// `node aos.mjs voice ...`: how voice sounds, how fast it answers, and which words it listens for.
// Everything here is also in the voice menu on both screens; the command exists for the setup agent and
// for members who prefer a terminal. It only edits small settings files, so no service has to be running.
import path from 'node:path';
import {layout, configuredVaultPath} from './services.mjs';
import {readVoicePrefs, saveVoicePrefs, voiceLabel, VOICE_RATE} from '../../runner/voice-prefs.mjs';
import {voiceSpeed, saveVoiceSpeed, voiceSpeedFile} from '../../runner/voice-speed.mjs';
import {voiceWordList, saveVoiceWords, writeVoiceWords, voiceWordsFile} from '../../runner/voice-words.mjs';
import {speechLanguage, SPEECH_LANGUAGES} from '../../shared/speech-language.mjs';

export const VOICE_HELP = `Configurações de voz

  voice                       mostrar as configurações abaixo
  voice mute | unmute         desativar ou ativar as respostas faladas
                              (a voz continua ouvindo você, e as respostas por escrito continuam disponíveis)
  voice use <nome>            escolher a voz (por exemplo, voice use af_heart ou voice use default)
  voice speed <0.8-1.4>        ajustar a velocidade da fala (1 é a velocidade normal)
  voice live-idle open|muted  definir se o microfone da voz ao vivo fica aberto em espera
  voice teach "<palavra>" ... ensinar nomes ou palavras com a grafia que você usa
  voice forget "<palavra>" ... deixar de reconhecer palavras ensinadas ou aprendidas
  voice learn on | off        aprender nomes pelos títulos das suas notas (ativado por padrão)
  voice fast on | off         controlar duas opções ativadas por padrão: receber a resposta conforme chega
                              e falar após a primeira frase (off também desativa a terceira opção)
  voice fast --early on|off --stream on|off     controlar cada uma dessas opções separadamente
  voice fast --prestart on|off                  iniciar o programa do modelo assim que chega um pedido por voz
                              (desativado por padrão, só no Claude). Economiza cerca de um quarto de segundo
                              quando a transcrição fica pronta em até dois segundos.
`;

const onOff = (value, name) => { if (value === 'on') return true; if (value === 'off') return false; throw new Error(`${name} aceita on ou off.`); };
const state = enabled => enabled ? 'ativado' : 'desativado';

export async function voiceCommand({words = [], flags = {}, log = console.log, root, at = layout(root), vault = configuredVaultPath(at)} = {}) {
  if (!vault) throw new Error('Ainda não há uma instalação aqui. Primeiro, rode `node aos.mjs setup --vault "<caminho>"`.');
  const speedFile = voiceSpeedFile(at.root), wordsFile = voiceWordsFile(at.root);
  const [action, ...rest] = words;
  const refreshWords = () => writeVoiceWords(vault, {file: wordsFile});
  switch (action) {
    case undefined: case 'show': case 'status': break;
    case 'mute': saveVoicePrefs(vault, {spokenReplies: false}); log('Respostas faladas desativadas. A voz continua ouvindo você e as respostas ainda aparecem por escrito.'); return 0;
    case 'unmute': saveVoicePrefs(vault, {spokenReplies: true}); log('Respostas faladas ativadas.'); return 0;
    case 'use': {
      if (rest.length !== 1) throw new Error('Use o comando voice use <nome> (por exemplo, af_heart ou default).');
      saveVoicePrefs(vault, {voice: rest[0] === 'default' ? null : rest[0]});
      log(rest[0] === 'default' ? 'Voz padrão restaurada.' : `A voz escolhida é ${voiceLabel(rest[0])}. Se ela estiver indisponível no seu idioma, será usada a voz padrão.`);
      return 0;
    }
    case 'speed': {
      const rate = Number(rest[0]);
      if (rest.length !== 1 || !Number.isFinite(rate)) throw new Error(`Use o comando voice speed <número entre ${VOICE_RATE.min} e ${VOICE_RATE.max}> (1 é a velocidade normal).`);
      log(`Velocidade da fala ajustada para ${saveVoicePrefs(vault, {rate}).rate}.`); return 0;
    }
    case 'live-idle':
      if(rest.length!==1||!['open','muted'].includes(rest[0]))throw new Error('Use o comando voice live-idle open|muted.');
      saveVoicePrefs(vault,{liveIdleMic:rest[0]});log(`O microfone da voz ao vivo ficará ${rest[0] === 'open' ? 'aberto' : 'silenciado'} em espera.`);return 0;
    case 'teach': if (!rest.length) throw new Error('Use o comando voice teach "<palavra>" ...'); saveVoiceWords(vault, {add: rest}); refreshWords(); log(`A voz agora reconhece: ${rest.join(', ')}.`); return 0;
    case 'forget': if (!rest.length) throw new Error('Use o comando voice forget "<palavra>" ...'); saveVoiceWords(vault, {forget: rest}); refreshWords(); log(`A voz deixou de reconhecer: ${rest.join(', ')}.`); return 0;
    case 'learn': saveVoiceWords(vault, {learn: onOff(rest[0], 'voice learn')}); refreshWords(); log(rest[0] === 'on' ? 'A voz aprende nomes pelos títulos das suas notas.' : 'A voz reconhece apenas as palavras que você ensina.'); return 0;
    case 'fast': {
      const changes = {};
      if (rest.length) { const value = onOff(rest[0], 'voice fast'); changes.earlyAnswer = value; changes.streamSpeech = value; if (!value) changes.prestart = false; }
      if (flags.prestart !== undefined) changes.prestart = onOff(flags.prestart, '--prestart');
      if (flags.early !== undefined) changes.earlyAnswer = onOff(flags.early, '--early');
      if (flags.stream !== undefined) changes.streamSpeech = onOff(flags.stream, '--stream');
      if (!Object.keys(changes).length) throw new Error('Use voice fast on|off ou voice fast --prestart on|off --early on|off --stream on|off.');
      const now = saveVoiceSpeed(changes, {file: speedFile});
      log(`Iniciar o programa do modelo antes: ${state(now.prestart)}. Receber a resposta conforme chega: ${state(now.earlyAnswer)}. Falar após a primeira frase: ${state(now.streamSpeech)}. A mudança vale para o próximo pedido por voz.`);
      return 0;
    }
    case 'help': log(VOICE_HELP); return 0;
    default: log(VOICE_HELP); return 1;
  }
  const prefs = readVoicePrefs(vault), speed = voiceSpeed({file: speedFile, fresh: true}), list = voiceWordList(vault), language = speechLanguage(vault);
  log(`Respostas faladas:   ${prefs.spokenReplies ? 'ativadas' : 'desativadas'}`);
  log(`Voz:                 ${prefs.voice ? voiceLabel(prefs.voice) : 'padrão'}`);
  log(`Velocidade da fala:  ${prefs.rate === 1 ? 'normal' : prefs.rate}`);
  log(`Idioma:              ${SPEECH_LANGUAGES[language.code].name}${language.known ? '' : ` (idioma "${language.asked}" indisponível)`}`);
  log(`Antecipar respostas: iniciar o programa do modelo antes (${state(speed.prestart)}), receber a resposta conforme chega (${state(speed.earlyAnswer)}), falar após a primeira frase (${state(speed.streamSpeech)})`);
  log(`Vocabulário:         ${list.words.length} ${list.words.length === 1 ? 'palavra' : 'palavras'}${list.learn ? '' : ' (aprendizado pelos títulos das notas desativado)'}`);
  if (list.yours.length) log(`  ensinadas: ${list.yours.join(', ')}`);
  if (list.learned.length) log(`  aprendidas: ${list.learned.join(', ')}`);
  if (list.ignored.length) log(`  esquecidas: ${list.ignored.join(', ')}`);
  log('\nRode `node aos.mjs voice help` para ver o que você pode alterar.');
  return 0;
}
