import { App, PluginSettingTab, Setting } from 'obsidian';
import type ChaseCommandCenter from './main';
export type CockpitTheme = 'terminal' | 'glass';
export interface ChaseSettings { vaultSystemPath:string; claudeTokenBudget5h:number; metricsPullCadenceHours:number; dismissedRunIds:string[]; orbEnabled:boolean; orbBloom:boolean; orbRight:number; orbBottom:number; cockpitIntroduced:boolean; jarvisHudUrl:string; jarvisEventsUrl:string; theme:CockpitTheme; reduceBlur:boolean; pauseMotion:boolean }
// A new vault starts the orb at the bottom-left, over the lower part of the file sidebar, where the
// starter layout has nothing to click. At the old bottom-right default it sat on the dashboard's button
// grid. OrbFloat clamps this to the window's left edge. A vault that already saved settings keeps its
// position, so nobody's orb moves on an update.
export const ORB_START_LEFT=100000;
export const DEFAULT_SETTINGS:ChaseSettings={vaultSystemPath:'system/v2',claudeTokenBudget5h:2000000,metricsPullCadenceHours:6,dismissedRunIds:[],orbEnabled:true,orbBloom:false,orbRight:ORB_START_LEFT,orbBottom:48,cockpitIntroduced:false,jarvisHudUrl:'',jarvisEventsUrl:'',theme:'terminal',reduceBlur:false,pauseMotion:false};
export class ChaseSettingTab extends PluginSettingTab {
 constructor(app:App,public plugin:ChaseCommandCenter){super(app,plugin)}
 display(){const el=this.containerEl;el.empty();
 el.createEl('p',{text:'O V2 usa este cofre para tarefas compartilhadas e processa o áudio localmente. Pedidos rápidos por voz usam Haiku ou Luna. Tarefas complexas abrem a CLI selecionada. As transcrições vão para o provedor selecionado. O acesso ao Google usa os conectores da CLI.'});
 new Setting(el).setName('Mostrar botão flutuante do agente').setDesc('Mostra o provedor selecionado e o estado da tarefa. Clique para falar e clique de novo para enviar. Use os controles de voz para digitar ou abrir o painel.').addToggle(t=>t.setValue(this.plugin.settings.orbEnabled).onChange(async v=>{this.plugin.settings.orbEnabled=v;await this.plugin.saveSettings();this.plugin.remountOrb()}));
 new Setting(el).setName('Pausar animações').setDesc('Pausa a galáxia, os efeitos dos medidores e as animações decorativas do painel.').addToggle(t=>t.setValue(this.plugin.settings.pauseMotion).onChange(async v=>{this.plugin.settings.pauseMotion=v;await this.plugin.saveSettings();this.plugin.applyTheme();window.dispatchEvent(new Event('aos-v2-settings'));}));
 new Setting(el).setName('Reduzir desfoque').setDesc('Troca o vidro por painéis sólidos para reduzir o processamento gráfico.').addToggle(t=>t.setValue(this.plugin.settings.reduceBlur).onChange(async v=>{this.plugin.settings.reduceBlur=v;await this.plugin.saveSettings();this.plugin.applyTheme();window.dispatchEvent(new Event('aos-v2-settings'));}));
 new Setting(el).setName('Tema do painel').addDropdown(d=>d.addOption('terminal','Terminal').addOption('glass','Vidro').setValue(this.plugin.settings.theme).onChange(async v=>{this.plugin.settings.theme=v==='glass'?'glass':'terminal';await this.plugin.saveSettings();this.plugin.applyTheme();window.dispatchEvent(new Event('aos-v2-cc-theme'))}));
 }
}
