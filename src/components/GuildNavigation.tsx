'use client';
import { useState } from 'react';
import { Home, Gamepad2, Library, Music2, Image as ImageIcon, Settings, Newspaper, Search, MessageSquare, CalendarDays, CalendarCheck, UserRound, Bell, Clapperboard, Map, Wallet, ShoppingBag, HeartHandshake, ShieldCheck, ChevronRight, Menu, X, LogOut } from 'lucide-react';
import type { NavigationState } from '@/context/AppContext';
import { canAccessSanctuaryFeature } from '@/lib/sanctuaryFeatureGates';
import styles from './GuildNavigation.module.css';
export type GuildPage = 'home' | 'arcade' | 'library' | 'music' | 'photos' | 'tools' | NavigationState;
type Item = { id: GuildPage; label: string; icon: typeof Home; description?: string };
const guildItems: Item[] = [
 {id:'home',label:'Guild Home',icon:Home},{id:'arcade',label:'Arcade',icon:Gamepad2,description:'Play Guild worlds'},
 {id:'library',label:'Game Library',icon:Library,description:'The 5 Sleeves and saved games'},
 {id:'music',label:'Music Player',icon:Music2,description:'Audio selected from this device'},
 {id:'photos',label:'Photo Slideshow',icon:ImageIcon,description:'Private local gallery'},
 {id:'tools',label:'Guild Tools',icon:Settings,description:'Gaming links and Cloud Lab status'}
];
const sanctuaryItems: Item[] = [
 {id:'today',label:'Today',icon:Home},{id:'feed',label:'Community',icon:Newspaper},{id:'discover',label:'Discover',icon:Search},
 {id:'messages',label:'Messages',icon:MessageSquare},{id:'events',label:'Events',icon:CalendarDays},{id:'shorts',label:'Shorts',icon:Clapperboard},
 {id:'planner',label:'Daily Planner',icon:CalendarCheck},{id:'profile',label:'My Profile',icon:UserRound},{id:'notifications',label:'Notifications',icon:Bell},
 {id:'games',label:'Cosmic Arcade',icon:Gamepad2},{id:'roadmap',label:'Sanctuary Roadmap',icon:Map},{id:'guild-roadmap',label:'Guild Roadmap',icon:Gamepad2},
 {id:'wallet',label:'Wallet',icon:Wallet},{id:'shop',label:'Token Shop',icon:ShoppingBag},{id:'support',label:'Support the community',icon:HeartHandshake},
 {id:'settings',label:'Settings',icon:Settings},{id:'admin',label:'Admin & Moderation',icon:ShieldCheck}
];
export function GuildNavigation({selectedPage,role,onSelect,onExit}:{selectedPage:GuildPage;role:string;onSelect:(page:GuildPage)=>void;onExit:()=>void}) {
 const [open,setOpen]=useState(false);
 const allowed=sanctuaryItems.filter(i=>i.id==='admin'?['moderator','admin','developer','owner'].includes(role):i.id==='wallet'?canAccessSanctuaryFeature('wallet',role):i.id==='shop'?canAccessSanctuaryFeature('tokenShop',role):true);
 const label=[...guildItems,...allowed].find(i=>i.id===selectedPage)?.label??'Sanctuary';
 const choose=(id:GuildPage)=>{onSelect(id);setOpen(false);};
 const render=(item:Item)=><button type="button" key={item.id} className={styles.item} data-active={selectedPage===item.id} onClick={()=>choose(item.id)}><item.icon size={19}/><span><strong>{item.label}</strong>{item.description&&<small>{item.description}</small>}</span><ChevronRight size={16}/></button>;
 return <header className={styles.header}>
  <button type="button" className={styles.menu} aria-label={open?'Close Guild navigation':'Open Guild navigation'} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?<X size={22}/>:<Menu size={22}/>}<span>MENU</span></button>
  <button type="button" className={styles.brand} onClick={()=>choose('home')}><span className={styles.mark}><Gamepad2 size={21}/></span><span><small>CONSOLE MODE</small><strong>THE GUILD</strong></span></button>
  <div className={styles.current}>{label}</div>
  <button type="button" className={styles.exit} onClick={onExit}><LogOut size={17}/><span>Sanctuary</span></button>
  {open&&<button type="button" className={styles.scrim} aria-label="Close navigation" onClick={()=>setOpen(false)}/>}
  <nav className={styles.drawer} data-open={open} aria-label="Guild and Sanctuary pages" aria-hidden={!open}>
   <div className={styles.drawerHead}><div><small>YOUR CONSOLE</small><h2>Navigation</h2></div><button type="button" aria-label="Close navigation" onClick={()=>setOpen(false)}><X size={20}/></button></div>
   <p className={styles.group}>THE GUILD</p>{guildItems.map(render)}
   <p className={styles.group}>SANCTUARY PAGES</p>{allowed.map(render)}
   <button type="button" className={styles.return} onClick={onExit}><LogOut size={17}/> Exit Guild · Return to Sanctuary</button>
  </nav>
 </header>;
}
