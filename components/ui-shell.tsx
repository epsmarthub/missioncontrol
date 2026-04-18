"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  Castle,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  Swords,
} from "lucide-react";
import { AgentClassId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMissionControl } from "@/components/mission-control-provider";
import { RetroAudioToggle } from "@/components/retro-audio-toggle";

export type SectionId =
  | "hq"
  | "task-board"
  | "agents"
  | "meeting-summaries"
  | "supervisor";

const navItems: Array<{
  id: SectionId;
  href: string;
  label: string;
  icon: typeof Castle;
}> = [
  { id: "hq", href: "/", label: "Centro HQ", icon: Castle },
  { id: "task-board", href: "/task-board", label: "Tablero", icon: ClipboardList },
  { id: "agents", href: "/agents", label: "Agentes", icon: Swords },
  {
    id: "meeting-summaries",
    href: "/meeting-summaries",
    label: "Resumenes",
    icon: Sparkles,
  },
  { id: "supervisor", href: "/supervisor", label: "Supervision", icon: ShieldCheck },
];

export function MissionShell({
  title,
  children,
  wide = true,
}: Readonly<{
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}>) {
  const pathname = usePathname();
  const { snapshot } = useMissionControl();

  return (
    <div className="forest-scene relative min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,_#11303a_0%,_#12263f_24%,_#14212d_52%,_#0b1118_100%)] text-slate-50">
      <div className="forest-backdrop pointer-events-none absolute inset-0">
        <div className="forest-sky" />
        <div className="forest-moon" />
        <div className="forest-stars" />
        <div className="forest-layer forest-layer-back" />
        <div className="forest-layer forest-layer-mid" />
        <div className="forest-layer forest-layer-front" />
        <div className="forest-ground" />
      </div>
      <div
        className={cn(
          "mx-auto grid min-h-screen w-full grid-cols-1 gap-3 px-3 py-3 lg:grid-cols-[auto_minmax(0,1fr)] lg:px-6 xl:px-8",
          wide ? "max-w-[1660px]" : "max-w-[1320px]",
        )}
      >
        <aside className="min-w-0 rounded-[18px] border-4 border-[#facc15] bg-[#120d24]/90 p-3 shadow-[0_0_0_4px_#392a63,inset_0_0_0_2px_rgba(255,255,255,0.08)] lg:w-fit lg:min-w-[236px] lg:max-w-[292px]">
          <div className="mb-4 overflow-hidden rounded-[18px] border-2 border-[#61dafb] bg-[#0f1a2f] p-3">
            <p className="text-[9px] uppercase tracking-[0.16em] text-cyan-300 sm:text-[10px] sm:tracking-[0.2em]">
              MissionControl
            </p>
            <h1 className="mt-2 text-base uppercase leading-[0.95] text-[#fef08a] sm:text-lg">
              HQ 16-bit
            </h1>
            <p className="mt-2 max-w-[18ch] font-mono text-xs leading-5 text-slate-300 sm:max-w-none sm:text-sm">
              Centro tactico para agentes, tareas y reuniones.
            </p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-w-0 items-center gap-2 rounded-2xl border-2 px-2.5 py-2 text-[9px] uppercase tracking-[0.07em] transition-all sm:text-[10px] sm:tracking-[0.1em]",
                    active
                      ? "border-[#facc15] bg-[#261a46] text-[#fde68a]"
                      : "border-[#3b2e65] bg-[#150f2b] text-slate-200 hover:border-cyan-400",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="min-w-0 leading-[1.15]">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <Panel className="mt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5 text-cyan-200">
                <Bot className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="break-words text-[10px] uppercase leading-[1.15] tracking-[0.08em] text-white sm:text-xs sm:tracking-[0.12em]">
                  Comandante {snapshot.currentUser.name.replace("Commander ", "")}
                </p>
                <p className="font-mono text-[11px] text-slate-300">Supervisor activo</p>
              </div>
            </div>
          </Panel>
        </aside>

        <main className="space-y-3">
          <header className="rounded-[18px] border-4 border-cyan-300 bg-[#0b1328]/88 p-3 shadow-[0_0_0_4px_#1c356b,inset_0_0_0_2px_rgba(255,255,255,0.08)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-[0.22em] text-cyan-300 sm:text-[10px]">
                  Proactivo, retro y en control
                </p>
                <h2 className="mt-2 text-xl uppercase leading-none text-white sm:text-2xl lg:text-[2rem]">
                  {title}
                </h2>
                <p className="mt-2 max-w-3xl font-mono text-sm text-slate-300">
                  MVP listo para demo local y preparado para conectar Supabase, Prisma y OpenAI.
                </p>
              </div>
              <div className="shrink-0">
                <RetroAudioToggle />
              </div>
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}

export function Panel({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <section
      className={cn(
        "rounded-[18px] border-4 border-[#3b2e65] bg-[#120d24]/92 p-3 shadow-[0_0_0_4px_#22153f,inset_0_0_0_2px_rgba(255,255,255,0.06)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionTitle({
  title,
  subtitle,
}: Readonly<{ title: string; subtitle: string }>) {
  return (
    <div>
      <h3 className="text-sm uppercase tracking-[0.12em] text-white sm:text-base">{title}</h3>
      <p className="font-mono text-xs text-slate-300 sm:text-sm">{subtitle}</p>
    </div>
  );
}

export function Avatar({
  label,
  accent,
  size = "md",
}: Readonly<{
  label: string;
  accent: AgentClassId | "user";
  size?: "sm" | "md" | "lg" | "xl";
}>) {
  const avatarClassByAccent: Record<AgentClassId | "user", string> = {
    mage: "avatar-mage",
    hunter: "avatar-hunter",
    warrior: "avatar-warrior",
    paladin: "avatar-paladin",
    rogue: "avatar-rogue",
    bard: "avatar-bard",
    engineer: "avatar-engineer",
    summoner: "avatar-summoner",
    user: "avatar-user",
  };
  const sizeClass =
    size === "sm"
      ? "size-[46px] text-[10px]"
      : size === "xl"
        ? "aspect-square w-[80%] max-w-[224px] text-[18px]"
      : size === "lg"
        ? "size-[88px] text-base"
        : "size-[56px] text-sm";
  const config = getAvatarConfig(accent);

  return (
    <div
      className={cn(
        "avatar-sprite relative overflow-hidden rounded-[10px] border-2 border-white/20 bg-[#091120] text-[#081122] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.08)]",
        sizeClass,
        avatarClassByAccent[accent],
      )}
    >
      <svg viewBox="0 0 64 64" className="avatar-svg" aria-hidden="true">
        <defs>
          <linearGradient id={`avatar-bg-${accent}`} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={config.bgTop} />
            <stop offset="100%" stopColor={config.bgBottom} />
          </linearGradient>
          <linearGradient id={`avatar-floor-${accent}`} x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor={config.floor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={config.floor} stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="64" height="64" rx="10" fill={`url(#avatar-bg-${accent})`} />
        <rect x="5" y="5" width="54" height="54" rx="8" className="avatar-frame" />
        <rect x="8" y="44" width="48" height="11" rx="4" fill={`url(#avatar-floor-${accent})`} />
        <ellipse cx="32" cy="50.5" rx="13" ry="4.5" className="avatar-shadow-shape" />

        <g className="avatar-aura">{renderAvatarAura(accent, config)}</g>

        <g className="avatar-figure">
          <rect x="28" y="41" width="4" height="10" rx="2" fill={config.boots} />
          <rect x="34" y="41" width="4" height="10" rx="2" fill={config.boots} />
          <rect x="24" y="23" width="16" height="20" rx="5" fill={config.outfit} />
          <rect x="21" y="26" width="5" height="15" rx="2" fill={config.gloves} />
          <rect x="38" y="26" width="5" height="15" rx="2" fill={config.gloves} />
          <rect x="26" y="19" width="12" height="6" rx="2" fill={config.trim} />
          <rect x="26" y="12" width="12" height="13" rx="5" fill={config.skin} />
          <rect x="24" y="10" width="16" height="7" rx="3" fill={config.hair} />
          <rect x="29" y="17" width="2" height="2" rx="1" fill="#0b1021" />
          <rect x="33" y="17" width="2" height="2" rx="1" fill="#0b1021" />
          <rect x="29" y="21" width="6" height="1.8" rx="0.9" fill="#825542" opacity="0.8" />
          {renderAvatarHeadgear(accent, config)}
          {renderAvatarBodyDetails(accent, config)}
        </g>

        <g className="avatar-prop">{renderAvatarProp(accent, config)}</g>

        <g className="avatar-emblem">
          <rect x="46" y="47" width="12" height="12" rx="3" fill="rgba(255,255,255,0.78)" />
          <text
            x="52"
            y="55.5"
            textAnchor="middle"
            className="avatar-emblem-letter"
            fill="#081122"
          >
            {label}
          </text>
        </g>
      </svg>
    </div>
  );
}

export function AgentPortrait({
  label,
  accent,
}: Readonly<{
  label: string;
  accent: AgentClassId;
}>) {
  const config = getAvatarConfig(accent);
  const portraitAssetMap: Partial<
    Record<
      AgentClassId,
      {
        src: string;
        alt: string;
        motionClass: string;
        glowClass: string;
      }
    >
  > = {
    mage: {
      src: "/agents/mage.png",
      alt: "Portrait de mago estilo pixel-art",
      motionClass: "portrait-image-mage",
      glowClass: "portrait-image-glow-mage",
    },
    hunter: {
      src: "/agents/hunter.png",
      alt: "Portrait de cazador estilo pixel-art",
      motionClass: "portrait-image-hunter",
      glowClass: "portrait-image-glow-hunter",
    },
    warrior: {
      src: "/agents/warrior.png",
      alt: "Portrait de guerrero estilo pixel-art",
      motionClass: "portrait-image-warrior",
      glowClass: "portrait-image-glow-warrior",
    },
    paladin: {
      src: "/agents/paladin.png",
      alt: "Portrait de paladin estilo pixel-art",
      motionClass: "portrait-image-paladin",
      glowClass: "portrait-image-glow-paladin",
    },
    rogue: {
      src: "/agents/rogue.png",
      alt: "Portrait de picara estilo pixel-art",
      motionClass: "portrait-image-rogue",
      glowClass: "portrait-image-glow-rogue",
    },
    bard: {
      src: "/agents/bard.png",
      alt: "Portrait de bardo estilo pixel-art",
      motionClass: "portrait-image-bard",
      glowClass: "portrait-image-glow-bard",
    },
    engineer: {
      src: "/agents/engineer.png",
      alt: "Portrait de ingeniero estilo pixel-art",
      motionClass: "portrait-image-engineer",
      glowClass: "portrait-image-glow-engineer",
    },
    summoner: {
      src: "/agents/summoner.png",
      alt: "Portrait de invocadora estilo pixel-art",
      motionClass: "portrait-image-summoner",
      glowClass: "portrait-image-glow-summoner",
    },
  };
  const portraitAsset = portraitAssetMap[accent];

  return (
    <div
        className={cn(
          "agent-portrait relative w-full overflow-hidden rounded-[18px] border-2 border-white/15 bg-[#0b1220]",
          portraitAsset
            ? "h-[198px] max-w-[122px] sm:h-[216px] sm:max-w-[130px]"
            : "h-[240px] max-w-[248px] sm:h-[264px] sm:max-w-[260px]",
          `portrait-${accent}`,
        )}
    >
      {portraitAsset ? (
        <>
          <Image
            src={portraitAsset.src}
            alt={portraitAsset.alt}
            fill
            sizes="(max-width: 640px) 220px, 236px"
            className={cn("portrait-image object-cover object-center", portraitAsset.motionClass)}
            priority={false}
          />
          <div className="portrait-image-overlay" />
          <div className={cn("portrait-image-glow", portraitAsset.glowClass)} />
          <div className="portrait-image-badge">{label}</div>
        </>
      ) : (
      <svg viewBox="0 0 160 176" className="portrait-svg" aria-hidden="true">
        <defs>
          <linearGradient id={`portrait-sky-${accent}`} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={mixColor(config.bgTop, "#ffffff", 0.65)} />
            <stop offset="65%" stopColor={mixColor(config.bgBottom, "#ffffff", 0.25)} />
            <stop offset="100%" stopColor={mixColor(config.bgBottom, "#0b1220", 0.28)} />
          </linearGradient>
          <linearGradient id={`portrait-road-${accent}`} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#c7b9a0" />
            <stop offset="100%" stopColor="#eadcc7" />
          </linearGradient>
        </defs>

        <rect width="160" height="176" rx="18" fill={`url(#portrait-sky-${accent})`} />
        {renderPortraitScene(accent, config)}
        <ellipse cx="82" cy="144" rx="24" ry="8" className="portrait-shadow" />

        <g className="portrait-aura">{renderPortraitAura(accent, config)}</g>
        <g className="portrait-character">{renderPortraitCharacter(accent, config)}</g>
        <g className="portrait-prop">{renderPortraitProp(accent, config)}</g>

        <g className="portrait-badge">
          <rect x="122" y="138" width="24" height="24" rx="6" fill="rgba(255,255,255,0.82)" />
          <text x="134" y="153" textAnchor="middle" className="portrait-badge-letter" fill="#081122">
            {label}
          </text>
        </g>
      </svg>
      )}
    </div>
  );
}

interface AvatarConfig {
  bgTop: string;
  bgBottom: string;
  floor: string;
  skin: string;
  hair: string;
  outfit: string;
  trim: string;
  gloves: string;
  boots: string;
  prop: string;
  aura: string;
}

function getAvatarConfig(accent: AgentClassId | "user"): AvatarConfig {
  const sharedSkin = "#f3c6a6";

  const map: Record<AgentClassId | "user", AvatarConfig> = {
    mage: {
      bgTop: "#86e7ff",
      bgBottom: "#4564ff",
      floor: "#c8f6ff",
      skin: sharedSkin,
      hair: "#d6eeff",
      outfit: "#315fc6",
      trim: "#bcefff",
      gloves: "#18347e",
      boots: "#17234c",
      prop: "#ebfbff",
      aura: "#79efff",
    },
    hunter: {
      bgTop: "#a0f47a",
      bgBottom: "#59b542",
      floor: "#d0ffaf",
      skin: "#d9b08c",
      hair: "#29441d",
      outfit: "#4c8b34",
      trim: "#d7f5a7",
      gloves: "#233d19",
      boots: "#1b2815",
      prop: "#1b2512",
      aura: "#d3ff8a",
    },
    warrior: {
      bgTop: "#ffd470",
      bgBottom: "#f89836",
      floor: "#ffe3a0",
      skin: "#d9ab7b",
      hair: "#7a4319",
      outfit: "#b46828",
      trim: "#ffd38a",
      gloves: "#723d16",
      boots: "#4d250e",
      prop: "#f4f8ff",
      aura: "#ffd08a",
    },
    paladin: {
      bgTop: "#fff0a8",
      bgBottom: "#e3b252",
      floor: "#fff1bf",
      skin: "#f0c9a8",
      hair: "#a67a34",
      outfit: "#d7b24e",
      trim: "#fff6db",
      gloves: "#8f6b22",
      boots: "#6b4918",
      prop: "#fff6d3",
      aura: "#fff0a7",
    },
    rogue: {
      bgTop: "#d5c4ff",
      bgBottom: "#654ecf",
      floor: "#e9deff",
      skin: "#d6ad93",
      hair: "#201639",
      outfit: "#5640b7",
      trim: "#cfc2ff",
      gloves: "#291d52",
      boots: "#1c1334",
      prop: "#f8f2ff",
      aura: "#c7b7ff",
    },
    bard: {
      bgTop: "#ffbddf",
      bgBottom: "#ff6d98",
      floor: "#ffd8ea",
      skin: "#f1c7a6",
      hair: "#8a284f",
      outfit: "#c24472",
      trim: "#ffe1ee",
      gloves: "#6f2343",
      boots: "#4a1830",
      prop: "#7a3a1d",
      aura: "#ffd2e8",
    },
    engineer: {
      bgTop: "#a8ebff",
      bgBottom: "#318ebf",
      floor: "#d2f6ff",
      skin: "#e2b590",
      hair: "#3a5668",
      outfit: "#3680a5",
      trim: "#d9fbff",
      gloves: "#1d516d",
      boots: "#16354a",
      prop: "#dcf7ff",
      aura: "#95ecff",
    },
    summoner: {
      bgTop: "#d8adff",
      bgBottom: "#824dff",
      floor: "#e7c9ff",
      skin: "#ecc0ab",
      hair: "#49206e",
      outfit: "#7230c7",
      trim: "#edd6ff",
      gloves: "#431a77",
      boots: "#2b114e",
      prop: "#f5dbff",
      aura: "#d7b0ff",
    },
    user: {
      bgTop: "#ffb1ea",
      bgBottom: "#ff6bc8",
      floor: "#ffd6f1",
      skin: "#f0c7af",
      hair: "#3f5173",
      outfit: "#546a91",
      trim: "#f7ebff",
      gloves: "#39425e",
      boots: "#23293c",
      prop: "#fff2ff",
      aura: "#ffccf4",
    },
  };

  return map[accent];
}

function renderAvatarHeadgear(accent: AgentClassId | "user", config: AvatarConfig) {
  switch (accent) {
    case "mage":
      return <polygon points="32,3 24,14 40,14" fill={config.trim} opacity="0.95" />;
    case "hunter":
      return <path d="M24 13 Q32 2 40 13 L40 18 L24 18 Z" fill={config.hair} opacity="0.95" />;
    case "warrior":
      return (
        <>
          <rect x="22" y="10" width="20" height="6" rx="2" fill={config.trim} />
          <rect x="20" y="12" width="4" height="8" rx="2" fill={config.trim} />
          <rect x="40" y="12" width="4" height="8" rx="2" fill={config.trim} />
        </>
      );
    case "paladin":
      return (
        <>
          <rect x="22" y="10" width="20" height="6" rx="3" fill={config.trim} />
          <rect x="30" y="7" width="4" height="10" rx="2" fill={config.trim} />
        </>
      );
    case "rogue":
      return <path d="M22 13 Q32 5 42 13 L38 21 L26 21 Z" fill={config.hair} />;
    case "bard":
      return (
        <>
          <rect x="23" y="11" width="18" height="4" rx="2" fill={config.trim} />
          <circle cx="41" cy="13" r="3" fill={config.trim} />
        </>
      );
    case "engineer":
      return (
        <>
          <rect x="22" y="11" width="20" height="5" rx="2" fill={config.trim} />
          <circle cx="27" cy="16" r="3" fill="#dffaff" opacity="0.9" />
          <circle cx="37" cy="16" r="3" fill="#dffaff" opacity="0.9" />
        </>
      );
    case "summoner":
      return (
        <>
          <polygon points="24,12 28,5 30,13" fill={config.trim} />
          <polygon points="40,12 36,5 34,13" fill={config.trim} />
        </>
      );
    case "user":
      return (
        <>
          <rect x="22" y="12" width="20" height="3.5" rx="1.75" fill={config.trim} opacity="0.95" />
          <rect x="20" y="13" width="3" height="8" rx="1.5" fill={config.trim} />
          <rect x="41" y="13" width="3" height="8" rx="1.5" fill={config.trim} />
        </>
      );
  }
}

function renderAvatarBodyDetails(accent: AgentClassId | "user", config: AvatarConfig) {
  switch (accent) {
    case "mage":
      return <rect x="30" y="25" width="4" height="18" rx="2" fill={config.trim} opacity="0.92" />;
    case "hunter":
      return (
        <>
          <path d="M24 28 L19 35 L24 36 Z" fill={config.trim} />
          <path d="M40 28 L45 35 L40 36 Z" fill={config.trim} />
        </>
      );
    case "warrior":
      return (
        <>
          <rect x="22" y="25" width="5" height="8" rx="2" fill={config.trim} />
          <rect x="37" y="25" width="5" height="8" rx="2" fill={config.trim} />
        </>
      );
    case "paladin":
      return <path d="M32 24 L38 28 L36 38 L28 38 L26 28 Z" fill={config.trim} />;
    case "rogue":
      return <path d="M24 25 Q32 32 40 25 L40 34 Q32 39 24 34 Z" fill={config.trim} opacity="0.8" />;
    case "bard":
      return (
        <>
          <rect x="23" y="26" width="18" height="3" rx="1.5" fill={config.trim} />
          <rect x="28" y="31" width="8" height="2" rx="1" fill={config.trim} />
        </>
      );
    case "engineer":
      return (
        <>
          <rect x="23" y="25" width="18" height="4" rx="2" fill={config.trim} />
          <circle cx="26" cy="35" r="2" fill={config.trim} />
          <circle cx="38" cy="35" r="2" fill={config.trim} />
        </>
      );
    case "summoner":
      return <path d="M24 25 Q32 20 40 25 L37 38 Q32 40 27 38 Z" fill={config.trim} opacity="0.92" />;
    case "user":
      return <rect x="26" y="25" width="12" height="3.5" rx="1.75" fill={config.trim} opacity="0.9" />;
  }
}

function renderAvatarProp(accent: AgentClassId | "user", config: AvatarConfig) {
  switch (accent) {
    case "mage":
      return (
        <>
          <rect x="43" y="18" width="3" height="26" rx="1.5" fill="#3050a8" />
          <circle cx="44.5" cy="16" r="4" fill={config.prop} />
        </>
      );
    case "hunter":
      return (
        <>
          <path d="M43 21 Q51 31 43 42" fill="none" stroke={config.prop} strokeWidth="2.5" strokeLinecap="round" />
          <line x1="39" y1="31" x2="49" y2="31" stroke={config.trim} strokeWidth="1.8" />
        </>
      );
    case "warrior":
      return (
        <>
          <rect x="45" y="16" width="3" height="28" rx="1.5" fill="#7a4019" />
          <polygon points="46.5,11 42,18 51,18" fill={config.prop} />
        </>
      );
    case "paladin":
      return (
        <>
          <path d="M45 22 L52 26 L50 37 L40 37 L38 26 Z" fill={config.prop} />
          <rect x="31" y="6" width="2.5" height="9" rx="1.25" fill={config.prop} />
          <rect x="28" y="9" width="8" height="2.5" rx="1.25" fill={config.prop} />
        </>
      );
    case "rogue":
      return <polygon points="45,23 51,31 45,39 41,31" fill={config.prop} opacity="0.95" />;
    case "bard":
      return (
        <>
          <ellipse cx="46" cy="33" rx="5" ry="7" fill={config.prop} />
          <rect x="40" y="26" width="3" height="16" rx="1.5" fill={config.trim} />
          <line x1="44" y1="29" x2="48" y2="37" stroke={config.trim} strokeWidth="1.2" />
        </>
      );
    case "engineer":
      return (
        <>
          <circle cx="45" cy="21" r="4" fill={config.prop} />
          <circle cx="45" cy="21" r="1.8" fill={config.bgBottom} />
          <rect x="43.5" y="24" width="3" height="18" rx="1.5" fill={config.prop} />
        </>
      );
    case "summoner":
      return (
        <>
          <rect x="44" y="18" width="3" height="26" rx="1.5" fill="#5824a5" />
          <polygon points="45.5,12 40,18 51,18" fill={config.prop} />
        </>
      );
    case "user":
      return (
        <>
          <rect x="43" y="18" width="9" height="12" rx="2" fill={config.prop} opacity="0.9" />
          <rect x="45" y="21" width="5" height="1.5" rx="0.75" fill="#546a91" />
          <rect x="45" y="24" width="5" height="1.5" rx="0.75" fill="#546a91" />
        </>
      );
  }
}

function renderAvatarAura(accent: AgentClassId | "user", config: AvatarConfig) {
  switch (accent) {
    case "mage":
      return <circle cx="20" cy="18" r="5" fill={config.aura} opacity="0.28" />;
    case "hunter":
      return <path d="M13 18 L18 15 L16 21 Z" fill={config.aura} opacity="0.32" />;
    case "warrior":
      return <rect x="13" y="16" width="10" height="10" rx="2" fill={config.aura} opacity="0.25" />;
    case "paladin":
      return <ellipse cx="32" cy="8" rx="11" ry="4" fill={config.aura} opacity="0.28" />;
    case "rogue":
      return <circle cx="16" cy="18" r="7" fill={config.aura} opacity="0.18" />;
    case "bard":
      return (
        <>
          <circle cx="15" cy="17" r="2.2" fill={config.aura} opacity="0.35" />
          <circle cx="18" cy="13" r="1.5" fill={config.aura} opacity="0.35" />
        </>
      );
    case "engineer":
      return (
        <>
          <circle cx="16" cy="18" r="1.6" fill={config.aura} opacity="0.5" />
          <circle cx="20" cy="14" r="1.2" fill={config.aura} opacity="0.5" />
          <circle cx="23" cy="18" r="1.4" fill={config.aura} opacity="0.5" />
        </>
      );
    case "summoner":
      return <circle cx="18" cy="17" r="6" fill={config.aura} opacity="0.26" />;
    case "user":
      return <circle cx="50" cy="14" r="4.5" fill={config.aura} opacity="0.22" />;
  }
}

function renderPortraitScene(accent: AgentClassId, config: AvatarConfig) {
  return (
    <>
      <rect x="0" y="118" width="160" height="58" fill={`url(#portrait-road-${accent})`} />
      <path d="M0 128 L58 114 L58 38 L10 46 L10 118 Z" fill="#8b6449" />
      <path d="M58 38 L10 46 L22 24 L66 18 Z" fill="#6f8ba0" />
      <rect x="20" y="56" width="12" height="25" fill="#29435c" />
      <rect x="36" y="56" width="12" height="25" fill="#29435c" />
      <path d="M98 118 L150 112 L150 44 L110 34 L98 40 Z" fill="#9d6f50" />
      <path d="M110 34 L150 44 L138 24 L104 18 Z" fill="#c5875e" />
      <rect x="118" y="58" width="12" height="24" fill="#38546a" />
      <rect x="134" y="58" width="10" height="24" fill="#38546a" />
      <path d="M0 130 Q80 106 160 120 V176 H0 Z" fill="#f4ead9" opacity="0.98" />
      <path d="M42 54 Q58 18 84 18 Q108 18 122 54 Z" fill={mixColor(config.bgTop, "#3f7f3b", 0.28)} opacity="0.78" />
      <rect x="18" y="122" width="14" height="10" rx="2" fill="#8b6645" />
      <rect x="126" y="120" width="14" height="11" rx="2" fill="#8b6645" />
    </>
  );
}

function renderPortraitAura(accent: AgentClassId, config: AvatarConfig) {
  switch (accent) {
    case "mage":
      return <circle cx="112" cy="44" r="14" fill={config.aura} opacity="0.34" />;
    case "hunter":
      return <path d="M34 58 L48 48 L44 68 Z" fill={config.aura} opacity="0.28" />;
    case "warrior":
      return <rect x="114" y="52" width="18" height="18" rx="4" fill={config.aura} opacity="0.22" />;
    case "paladin":
      return <ellipse cx="80" cy="26" rx="24" ry="8" fill={config.aura} opacity="0.24" />;
    case "rogue":
      return <circle cx="44" cy="52" r="16" fill={config.aura} opacity="0.16" />;
    case "bard":
      return (
        <>
          <circle cx="116" cy="52" r="4" fill={config.aura} opacity="0.35" />
          <circle cx="122" cy="46" r="2.8" fill={config.aura} opacity="0.3" />
        </>
      );
    case "engineer":
      return (
        <>
          <circle cx="118" cy="42" r="2.5" fill={config.aura} opacity="0.5" />
          <circle cx="124" cy="48" r="2" fill={config.aura} opacity="0.5" />
          <circle cx="112" cy="50" r="2" fill={config.aura} opacity="0.5" />
        </>
      );
    case "summoner":
      return <circle cx="112" cy="44" r="16" fill={config.aura} opacity="0.24" />;
  }
}

function renderPortraitHeadgear(accent: AgentClassId, config: AvatarConfig) {
  switch (accent) {
    case "mage":
      return <path d="M80 16 L66 36 H94 Z" fill={config.trim} />;
    case "hunter":
      return <path d="M62 34 Q80 14 98 34 L94 42 H66 Z" fill={config.hair} opacity="0.95" />;
    case "warrior":
      return (
        <>
          <rect x="62" y="30" width="36" height="9" rx="4" fill={config.trim} />
          <rect x="58" y="34" width="6" height="12" rx="3" fill={config.trim} />
          <rect x="96" y="34" width="6" height="12" rx="3" fill={config.trim} />
        </>
      );
    case "paladin":
      return (
        <>
          <rect x="62" y="30" width="36" height="9" rx="4" fill={config.trim} />
          <rect x="77" y="20" width="6" height="18" rx="3" fill={config.trim} />
        </>
      );
    case "rogue":
      return <path d="M58 34 Q80 18 102 34 L94 48 H66 Z" fill={config.hair} />;
    case "bard":
      return (
        <>
          <rect x="62" y="31" width="34" height="6" rx="3" fill={config.trim} />
          <circle cx="98" cy="34" r="5" fill={config.trim} />
        </>
      );
    case "engineer":
      return (
        <>
          <rect x="60" y="31" width="38" height="7" rx="3" fill={config.trim} />
          <circle cx="68" cy="40" r="5" fill="#dffaff" opacity="0.92" />
          <circle cx="92" cy="40" r="5" fill="#dffaff" opacity="0.92" />
        </>
      );
    case "summoner":
      return (
        <>
          <polygon points="62,34 70,20 74,36" fill={config.trim} />
          <polygon points="98,34 90,20 86,36" fill={config.trim} />
        </>
      );
  }
}

function renderPortraitCharacter(accent: AgentClassId, config: AvatarConfig) {
  return (
    <>
      <rect x="70" y="112" width="10" height="28" rx="4" fill={config.boots} />
      <rect x="88" y="108" width="12" height="33" rx="4" fill={config.boots} />
      <path d="M72 88 L92 88 L96 114 L76 114 Z" fill={mixColor(config.boots, "#ffffff", 0.08)} />
      <path d="M62 58 Q86 42 108 58 L100 124 Q82 136 62 122 Z" fill={config.outfit} />
      <path d="M58 60 Q82 104 70 128 L52 124 Q60 100 52 74 Z" fill={mixColor(config.outfit, "#0b1220", 0.25)} opacity="0.72" />
      <path d="M90 54 Q110 54 114 74 L112 112 Q106 124 88 126 Z" fill={mixColor(config.outfit, "#ffffff", 0.04)} />
      <path d="M76 48 Q92 44 106 54 L102 62 Q88 56 76 62 Z" fill={config.trim} />
      <path d="M92 58 L100 58 L101 120 L95 126 L92 118 Z" fill={config.trim} opacity="0.88" />
      <path d="M58 72 Q48 90 60 106 L66 102 L70 76 Z" fill={config.gloves} />
      <path d="M104 74 Q116 88 104 106 L96 102 L96 76 Z" fill={config.gloves} />
      <path d="M76 34 Q90 26 102 34 L106 52 Q92 60 76 54 Z" fill={config.skin} />
      <path d="M74 28 Q86 12 104 24 L106 40 Q96 30 74 36 Z" fill={config.hair} />
      <circle cx="85" cy="42" r="1.8" fill="#0f172a" />
      <path d="M95 42 Q98 41 100 43" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M88 50 Q93 53 99 49" stroke="#825542" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M80 70 Q72 84 80 102" stroke={config.trim} strokeWidth="4" strokeLinecap="round" opacity="0.9" />
      <path d="M64 62 L56 116" stroke="#6b442e" strokeWidth="4" strokeLinecap="round" opacity="0.72" />
      <rect x="54" y="84" width="12" height="18" rx="2" fill="#7e5533" opacity="0.82" />
      {renderPortraitHeadgear(accent, config)}
      {renderPortraitBodyDetails(accent, config)}
    </>
  );
}

function renderPortraitBodyDetails(accent: AgentClassId, config: AvatarConfig) {
  switch (accent) {
    case "mage":
      return (
        <>
          <path d="M80 58 L90 60 L84 126 L74 122 Z" fill={config.trim} opacity="0.92" />
          <path d="M52 84 L66 92 L62 104 L48 96 Z" fill="#a67c52" />
        </>
      );
    case "hunter":
      return (
        <>
          <path d="M60 74 L46 90 L60 96 Z" fill={config.trim} />
          <path d="M106 74 L116 90 L104 96 Z" fill={config.trim} />
          <rect x="104" y="80" width="10" height="22" rx="4" fill="#7a5536" />
        </>
      );
    case "warrior":
      return (
        <>
          <rect x="56" y="72" width="12" height="18" rx="4" fill={config.trim} />
          <rect x="96" y="72" width="12" height="18" rx="4" fill={config.trim} />
          <rect x="84" y="88" width="18" height="18" rx="4" fill={mixColor(config.trim, "#ffffff", 0.18)} />
        </>
      );
    case "paladin":
      return (
        <>
          <path d="M82 66 L98 78 L92 108 L72 108 L66 78 Z" fill={config.trim} />
          <path d="M82 72 L82 100" stroke={mixColor(config.trim, "#b48a37", 0.45)} strokeWidth="3" />
          <path d="M72 86 H92" stroke={mixColor(config.trim, "#b48a37", 0.45)} strokeWidth="3" />
        </>
      );
    case "rogue":
      return (
        <>
          <path d="M58 68 Q80 84 102 68 L100 94 Q80 108 60 94 Z" fill={config.trim} opacity="0.85" />
          <path d="M72 64 Q64 82 70 102" stroke={mixColor(config.trim, "#201639", 0.3)} strokeWidth="4" opacity="0.7" />
        </>
      );
    case "bard":
      return (
        <>
          <rect x="58" y="70" width="44" height="6" rx="3" fill={config.trim} />
          <rect x="70" y="82" width="20" height="4" rx="2" fill={config.trim} />
          <path d="M62 58 Q70 46 80 52" stroke={config.trim} strokeWidth="3" />
        </>
      );
    case "engineer":
      return (
        <>
          <rect x="58" y="69" width="44" height="8" rx="4" fill={config.trim} />
          <circle cx="64" cy="92" r="4" fill={config.trim} />
          <circle cx="96" cy="92" r="4" fill={config.trim} />
          <rect x="58" y="82" width="8" height="18" rx="3" fill="#dffaff" opacity="0.7" />
        </>
      );
    case "summoner":
      return (
        <>
          <path d="M58 68 Q80 56 102 68 L96 102 Q80 112 64 102 Z" fill={config.trim} opacity="0.92" />
          <circle cx="112" cy="56" r="6" fill={config.prop} opacity="0.45" />
        </>
      );
  }
}

function renderPortraitProp(accent: AgentClassId, config: AvatarConfig) {
  switch (accent) {
    case "mage":
      return (
        <>
          <rect x="110" y="42" width="6" height="98" rx="3" fill="#6c4a33" />
          <path d="M113 34 Q124 18 136 34 Q128 52 113 46 Z" fill={config.prop} />
          <circle cx="124" cy="32" r="10" fill={config.prop} opacity="0.88" />
        </>
      );
    case "hunter":
      return (
        <>
          <path d="M112 56 Q132 84 112 114" fill="none" stroke={config.prop} strokeWidth="5" strokeLinecap="round" />
          <line x1="100" y1="84" x2="124" y2="84" stroke={config.trim} strokeWidth="2.4" />
        </>
      );
    case "warrior":
      return (
        <>
          <rect x="112" y="38" width="6" height="102" rx="3" fill="#7a4019" />
          <polygon points="115,20 104,44 126,44" fill={config.prop} />
        </>
      );
    case "paladin":
      return (
        <>
          <path d="M116 62 L132 70 L128 98 L104 98 L100 70 Z" fill={config.prop} />
          <rect x="79" y="18" width="4" height="18" rx="2" fill={config.prop} />
          <rect x="72" y="24" width="18" height="4" rx="2" fill={config.prop} />
        </>
      );
    case "rogue":
      return <polygon points="116,62 128,84 116,106 108,84" fill={config.prop} opacity="0.95" />;
    case "bard":
      return (
        <>
          <ellipse cx="118" cy="90" rx="12" ry="18" fill={config.prop} />
          <rect x="104" y="72" width="6" height="42" rx="3" fill={config.trim} />
          <line x1="114" y1="80" x2="124" y2="100" stroke={config.trim} strokeWidth="2" />
        </>
      );
    case "engineer":
      return (
        <>
          <circle cx="118" cy="56" r="10" fill={config.prop} />
          <circle cx="118" cy="56" r="4.2" fill={config.bgBottom} />
          <rect x="114" y="66" width="8" height="54" rx="4" fill={config.prop} />
        </>
      );
    case "summoner":
      return (
        <>
          <rect x="110" y="40" width="6" height="96" rx="3" fill="#5824a5" />
          <polygon points="113,20 101,42 125,42" fill={config.prop} />
          <circle cx="124" cy="34" r="10" fill={config.prop} opacity="0.55" />
        </>
      );
  }
}

function mixColor(base: string, mixWith: string, amount: number) {
  const [r1, g1, b1] = hexToRgb(base);
  const [r2, g2, b2] = hexToRgb(mixWith);

  const mix = (first: number, second: number) => Math.round(first + (second - first) * amount);

  return `rgb(${mix(r1, r2)}, ${mix(g1, g2)}, ${mix(b1, b2)})`;
}

function hexToRgb(hex: string) {
  const cleaned = hex.replace("#", "");
  const normalized =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : cleaned;

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ] as const;
}

export function ExpBar({
  current,
  max,
  className,
}: Readonly<{ current: number; max: number; className?: string }>) {
  const percent = Math.max(6, Math.min(100, (current / max) * 100));

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between font-mono text-xs text-slate-300">
        <span>EXP</span>
        <span>
          {current}/{max}
        </span>
      </div>
      <div className="h-3 rounded-full border border-white/10 bg-[#080c17] p-0.5">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,_#67e8f9_0%,_#facc15_45%,_#fb7185_100%)]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
