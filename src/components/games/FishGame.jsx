import { useEffect, useMemo, useRef, useState } from "react";
import Phaser from "phaser";

/**
 * FishGame PRO - Student OS Ocean Study Game
 * Path: src/components/games/FishGame.jsx
 *
 * Features:
 * 1. Mobile portrait layout: top HUD, middle real 16:9 ocean strip, bottom joystick.
 * 2. No zoomed mobile canvas. Phaser uses a fixed 1280x720 game viewport with FIT scaling.
 * 3. No EXIT button inside FishGame. Keep only GameRoom EXIT to avoid duplicate buttons.
 * 4. Desktop HUD + minimap added without hiding the game screen.
 * 5. Loading screen before Phaser starts.
 * 6. Multiple maps: Coral Reef, Deep Ocean, Shipwreck Bay, Ice Ocean, Volcano Sea.
 * 7. Realer vector fish graphics: layered bodies, fins, tail, eye, highlights.
 * 8. Rare fish system: Golden Fish, Diamond Fish, Dolphin Bonus. No King Fish.
 * 9. Correct answer fish color changes every question.
 * 10. Growth system: Tiny Fish -> Small Fish -> Medium Fish -> Big Fish -> Giant Fish -> Ocean Legend.
 */

export default function FishGame({
  questions = [],
  topic = "Study Topic",
  onReward,
}) {
  const gameWrapRef = useRef(null);
  const gameRef = useRef(null);
  const rewardSentRef = useRef(false);
  const latestRewardRef = useRef(onReward);
  const joystickRef = useRef({ x: 0, y: 0, active: false });
  const miniMapRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("Loading ocean...");
  const [hud, setHud] = useState({
    question: "Loading...",
    score: 0,
    health: 100,
    combo: 0,
    level: 1,
    growthName: "Tiny Fish",
    shield: 0,
    mapName: "Coral Reef",
    current: 1,
    total: Math.max(questions.length, 1),
    message: "Preparing ocean...",
    ended: false,
  });

  const [isPortraitMobile, setIsPortraitMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
    return Boolean(coarse && window.innerHeight > window.innerWidth);
  });

  useEffect(() => {
    const onResize = () => {
      const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
      setIsPortraitMobile(Boolean(coarse && window.innerHeight > window.innerWidth));
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  useEffect(() => {
    latestRewardRef.current = onReward;
  }, [onReward]);

  useEffect(() => {
    const fallbackQuestions = [
      { question: `Best action to master ${topic}?`, answer: "Practice", options: ["Practice", "Skip", "Guess", "Forget"] },
      { question: `After studying ${topic}, do a?`, answer: "Quiz", options: ["Quiz", "Nap", "Scroll", "Skip"] },
      { question: `Useful revision item for ${topic}?`, answer: "Notes", options: ["Notes", "Noise", "Delay", "Luck"] },
      { question: "Both inputs 1 gives output 1?", answer: "AND", options: ["AND", "OR", "XOR", "NOT"] },
      { question: "Address storing variable?", answer: "Pointer", options: ["Pointer", "Array", "Loop", "Struct"] },
      { question: "Stores charge?", answer: "Capacitor", options: ["Capacitor", "Resistor", "Diode", "Switch"] },
      { question: "Collection of same datatype?", answer: "Array", options: ["Array", "Loop", "Pointer", "If"] },
      { question: "Exam success needs?", answer: "Revision", options: ["Revision", "Panic", "Delay", "Guess"] },
    ];

    const safeQuestions = questions?.length ? questions : fallbackQuestions;

    if (!gameWrapRef.current || gameRef.current) return;

    const GAME_W = 1280;
    const GAME_H = 720;
    const WORLD_W = 3400;
    const WORLD_H = 1900;

    const maps = [
      {
        name: "Coral Reef",
        emoji: "🪸",
        top: 0x0891b2,
        mid: 0x0e7490,
        bottom: 0x164e63,
        sand: 0xc08457,
        decor: ["🪸", "🐚", "🌿", "🪨"],
        predatorCount: 5,
        rewardBoost: 1,
      },
      {
        name: "Deep Ocean",
        emoji: "🌌",
        top: 0x0f172a,
        mid: 0x164e63,
        bottom: 0x020617,
        sand: 0x334155,
        decor: ["🪼", "🫧", "🪨", "🐚"],
        predatorCount: 7,
        rewardBoost: 1.15,
      },
      {
        name: "Shipwreck Bay",
        emoji: "⚓",
        top: 0x0369a1,
        mid: 0x0f766e,
        bottom: 0x1e293b,
        sand: 0xa16207,
        decor: ["⚓", "🪙", "🪸", "🐚"],
        predatorCount: 7,
        rewardBoost: 1.25,
      },
      {
        name: "Ice Ocean",
        emoji: "❄️",
        top: 0x7dd3fc,
        mid: 0x0284c7,
        bottom: 0x0f172a,
        sand: 0xe0f2fe,
        decor: ["❄️", "🧊", "🫧", "🐚"],
        predatorCount: 8,
        rewardBoost: 1.35,
      },
      {
        name: "Volcano Sea",
        emoji: "🌋",
        top: 0x7f1d1d,
        mid: 0x0f172a,
        bottom: 0x020617,
        sand: 0x451a03,
        decor: ["🌋", "🔥", "🪨", "🫧"],
        predatorCount: 9,
        rewardBoost: 1.5,
      },
    ];

    const correctColors = [0xfacc15, 0x22c55e, 0xef4444, 0xa855f7, 0xf97316, 0x06b6d4, 0xec4899, 0x84cc16];
    const wrongColors = [0x38bdf8, 0x22c55e, 0xa855f7, 0xf97316, 0xec4899, 0x14b8a6, 0x818cf8];

    let score = 0;
    let health = 100;
    let combo = 0;
    let level = 1;
    let shield = 0;
    let current = 0;
    let ended = false;
    let ready = false;
    let invincible = false;
    let speedBoostUntil = 0;
    let currentMapIndex = 0;
    let rareSpawnCount = 0;

    const getGrowthName = () => {
      if (level >= 11) return "Ocean Legend";
      if (level >= 9) return "Giant Fish";
      if (level >= 6) return "Big Fish";
      if (level >= 4) return "Medium Fish";
      if (level >= 2) return "Small Fish";
      return "Tiny Fish";
    };

    const syncHud = (message = "") => {
      const q = safeQuestions[Math.min(current, safeQuestions.length - 1)];
      setHud({
        question: q?.question || "Game complete",
        score,
        health: Math.round(health),
        combo,
        level,
        growthName: getGrowthName(),
        shield,
        mapName: maps[currentMapIndex]?.name || "Ocean",
        current: Math.min(current + 1, safeQuestions.length),
        total: safeQuestions.length,
        message,
        ended,
      });
    };

    const setLoadStep = (text, delay) => {
      setTimeout(() => setLoadingText(text), delay);
    };

    setLoading(true);
    setLoadingText("🌊 Entering ocean...");
    setLoadStep("🐟 Loading real fish movement...", 220);
    setLoadStep("🦈 Loading predators...", 440);
    setLoadStep("💎 Loading rare fish...", 660);
    setLoadStep("🎯 Loading study questions...", 880);

    class OceanScene extends Phaser.Scene {
      constructor() {
        super("StudentOSFishGamePRO");
        this.player = null;
        this.answerFish = [];
        this.predators = [];
        this.coins = [];
        this.powerups = [];
        this.rareFish = [];
        this.bgFish = [];
        this.labels = [];
        this.mapDecor = [];
        this.mapLayers = [];
        this.targetX = WORLD_W * 0.18;
        this.targetY = WORLD_H * 0.5;
        this.starPointer = null;
        this.lastHud = 0;
        this.lastMap = 0;
      }

      create() {
        this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
        this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

        this.createMap(currentMapIndex, true);
        this.createPlayer();
        this.createQuestion();
        this.createPointer();
        this.createRareFishTimer();

        this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
        this.cameras.main.setZoom(isPortraitMobile ? 0.95 : 1);

        if (!isPortraitMobile) {
          this.input.on("pointermove", (p) => this.setTargetFromPointer(p));
          this.input.on("pointerdown", (p) => this.setTargetFromPointer(p));
        }

        this.time.delayedCall(1100, () => {
          ready = true;
          setLoading(false);
          syncHud(isPortraitMobile ? "Joystick ready. Chase ⭐ answer fish." : "Move with mouse or touch. Chase ⭐ answer fish.");
        });

        this.time.addEvent({
          delay: 1000,
          loop: true,
          callback: () => {
            if (!ready || ended) return;
            health = Math.max(0, health - 0.22);
            if (health <= 0) return this.endGame("Your fish ran out of health!");
            syncHud("Find ⭐ answer fish. Avoid ☠ predators. Rare fish give bonus rewards.");
          },
        });
      }

      update(time) {
        if (!ready || ended || !this.player) return;

        this.movePlayer(time);
        this.moveAllFish();
        this.checkAnswerCollision();
        this.checkPredatorCollision();
        this.checkCoinCollision();
        this.checkPowerupCollision();
        this.checkRareFishCollision();
        this.updatePointer();

        if (time - this.lastHud > 180) {
          syncHud(hud.message || "Keep swimming.");
          this.lastHud = time;
        }

        if (time - this.lastMap > 240) {
          this.drawMiniMap();
          this.lastMap = time;
        }
      }

      createMap(index, first = false) {
        const map = maps[index] || maps[0];

        this.mapLayers.forEach((item) => item.destroy());
        this.mapDecor.forEach((item) => item.destroy());
        this.bgFish.forEach((item) => item.destroy());
        this.predators.forEach((item) => item.destroy());
        this.coins.forEach((item) => item.destroy());
        this.powerups.forEach((item) => item.destroy());
        this.rareFish.forEach((item) => item.destroy());
        this.mapLayers = [];
        this.mapDecor = [];
        this.bgFish = [];
        this.predators = [];
        this.coins = [];
        this.powerups = [];
        this.rareFish = [];

        const bg = this.add.graphics().setDepth(0);
        bg.fillGradientStyle(map.top, map.top, map.mid, map.bottom, 1);
        bg.fillRect(0, 0, WORLD_W, WORLD_H);
        this.mapLayers.push(bg);

        const floor = this.add.graphics().setDepth(2);
        for (let i = 0; i < 90; i++) {
          floor.fillStyle(i % 2 ? map.sand : 0x1f2937, Phaser.Math.FloatBetween(0.25, 0.65));
          floor.fillEllipse(
            Phaser.Math.Between(0, WORLD_W),
            WORLD_H - Phaser.Math.Between(20, 110),
            Phaser.Math.Between(70, 210),
            Phaser.Math.Between(20, 70)
          );
        }
        this.mapLayers.push(floor);

        for (let i = 0; i < 90; i++) {
          const b = this.add.circle(
            Phaser.Math.Between(0, WORLD_W),
            Phaser.Math.Between(0, WORLD_H),
            Phaser.Math.Between(2, 7),
            0xffffff,
            Phaser.Math.FloatBetween(0.05, 0.18)
          ).setDepth(3);
          this.mapLayers.push(b);
          this.tweens.add({
            targets: b,
            y: b.y - Phaser.Math.Between(180, 560),
            alpha: 0,
            duration: Phaser.Math.Between(4200, 9000),
            repeat: -1,
            onRepeat: () => {
              b.y = WORLD_H + Phaser.Math.Between(20, 140);
              b.x = Phaser.Math.Between(0, WORLD_W);
              b.alpha = Phaser.Math.FloatBetween(0.06, 0.2);
            },
          });
        }

        for (let i = 0; i < 52; i++) {
          const deco = this.add.text(
            Phaser.Math.Between(0, WORLD_W),
            Phaser.Math.Between(WORLD_H - 180, WORLD_H - 70),
            map.decor[Phaser.Math.Between(0, map.decor.length - 1)],
            { fontSize: Phaser.Math.Between(30, 62) + "px" }
          ).setDepth(5);
          this.mapDecor.push(deco);
          if (i < 18) {
            this.tweens.add({
              targets: deco,
              angle: Phaser.Math.Between(-8, 8),
              duration: Phaser.Math.Between(1200, 2300),
              yoyo: true,
              repeat: -1,
            });
          }
        }

        if (map.name === "Shipwreck Bay") {
          const wreck = this.add.text(WORLD_W * 0.68, WORLD_H - 240, "🚢", { fontSize: "140px" }).setDepth(6).setAngle(-12);
          this.mapDecor.push(wreck);
        }

        if (map.name === "Volcano Sea") {
          for (let i = 0; i < 8; i++) {
            const lava = this.add.circle(Phaser.Math.Between(120, WORLD_W - 120), WORLD_H - Phaser.Math.Between(60, 180), Phaser.Math.Between(16, 42), 0xef4444, 0.55).setDepth(4);
            this.mapDecor.push(lava);
            this.tweens.add({ targets: lava, alpha: 0.15, scaleX: 1.3, scaleY: 1.3, duration: 800, yoyo: true, repeat: -1 });
          }
        }

        this.createBackgroundFish();
        this.createPredators();
        this.createCoins();
        this.createPowerups();

        if (!first) {
          this.centerMessage(`${map.emoji} ${map.name}`, "#38bdf8", 1200);
          this.cameras.main.flash(450, 56, 189, 248, false);
        }
      }

      makeRealFish(x, y, cfg = {}) {
        const {
          color = 0xf97316,
          accent = 0xffffff,
          size = 1,
          icon = "",
          type = "fish",
          alpha = 1,
        } = cfg;

        const fish = this.add.container(x, y).setAlpha(alpha);

        const shadow = this.add.ellipse(2 * size, 20 * size, 112 * size, 60 * size, 0x000000, 0.12);
        const glow = this.add.circle(0, 0, 72 * size, color, 0.1);

        let tail;
        let body;
        let head;
        let topFin;
        let bottomFin;

        if (type === "shark") {
          tail = this.add.triangle(-74 * size, 0, 0, -34 * size, 0, 34 * size, -54 * size, 0, color);
          body = this.add.ellipse(0, 0, 128 * size, 62 * size, color);
          head = this.add.triangle(64 * size, 0, 0, -26 * size, 0, 26 * size, 40 * size, 0, color);
          topFin = this.add.triangle(-8 * size, -30 * size, 0, -54 * size, 28 * size, -22 * size, -14 * size, -22 * size, Phaser.Display.Color.ValueToColor(color).darken(18).color);
          bottomFin = this.add.triangle(-4 * size, 28 * size, 0, 44 * size, 34 * size, 22 * size, -8 * size, 22 * size, Phaser.Display.Color.ValueToColor(color).darken(22).color);
        } else if (type === "dolphin") {
          tail = this.add.triangle(-70 * size, 0, 0, -32 * size, 0, 32 * size, -52 * size, 0, color);
          body = this.add.ellipse(0, 0, 132 * size, 54 * size, color);
          head = this.add.ellipse(58 * size, -2 * size, 54 * size, 42 * size, color);
          topFin = this.add.triangle(-2 * size, -26 * size, 0, -58 * size, 25 * size, -20 * size, -12 * size, -20 * size, Phaser.Display.Color.ValueToColor(color).darken(12).color);
          bottomFin = this.add.triangle(12 * size, 22 * size, 0, 46 * size, 40 * size, 16 * size, 2 * size, 18 * size, Phaser.Display.Color.ValueToColor(color).darken(20).color);
        } else {
          tail = this.add.triangle(-64 * size, 0, 0, -34 * size, 0, 34 * size, -48 * size, 0, color);
          body = this.add.ellipse(0, 0, 112 * size, 64 * size, color);
          head = this.add.ellipse(34 * size, -2 * size, 58 * size, 56 * size, Phaser.Display.Color.ValueToColor(color).brighten(4).color);
          topFin = this.add.triangle(-8 * size, -34 * size, 0, -58 * size, 30 * size, -22 * size, -16 * size, -23 * size, Phaser.Display.Color.ValueToColor(color).darken(15).color);
          bottomFin = this.add.triangle(6 * size, 30 * size, 0, 50 * size, 38 * size, 22 * size, -6 * size, 22 * size, Phaser.Display.Color.ValueToColor(color).darken(20).color);
        }

        const belly = this.add.ellipse(12 * size, 15 * size, 64 * size, 26 * size, accent, 0.22);
        const stripe1 = this.add.rectangle(-10 * size, 0, 8 * size, 56 * size, accent, type === "shark" ? 0.05 : 0.18).setAngle(14);
        const stripe2 = this.add.rectangle(12 * size, 0, 7 * size, 52 * size, accent, type === "shark" ? 0.04 : 0.12).setAngle(14);
        const highlight = this.add.ellipse(18 * size, -14 * size, 54 * size, 18 * size, 0xffffff, 0.18);
        const eye = this.add.circle(42 * size, -15 * size, 8 * size, 0xffffff);
        const pupil = this.add.circle(45 * size, -15 * size, 3.5 * size, 0x020617);

        fish.add([shadow, glow, tail, bottomFin, body, head, topFin, belly, stripe1, stripe2, highlight, eye, pupil]);

        if (icon) {
          fish.add(this.add.text(0, -55 * size, icon, { fontSize: 26 * size + "px" }).setOrigin(0.5));
        }

        fish.tail = tail;
        fish.glow = glow;
        fish.setSize(130 * size, 72 * size);

        this.tweens.add({ targets: tail, scaleX: 1.34, duration: 145, yoyo: true, repeat: -1 });
        this.tweens.add({ targets: [topFin, bottomFin], angle: "+=5", duration: 520, yoyo: true, repeat: -1 });

        return fish;
      }

      createBackgroundFish() {
        for (let i = 0; i < 24; i++) {
          const c = wrongColors[Phaser.Math.Between(0, wrongColors.length - 1)];
          const f = this.makeRealFish(
            Phaser.Math.Between(160, WORLD_W - 160),
            Phaser.Math.Between(150, WORLD_H - 170),
            {
              color: c,
              size: Phaser.Math.FloatBetween(0.38, 0.68),
              alpha: Phaser.Math.FloatBetween(0.28, 0.55),
            }
          );
          f.speed = Phaser.Math.Between(30, 74);
          f.dir = new Phaser.Math.Vector2(Phaser.Math.FloatBetween(-1, 1), Phaser.Math.FloatBetween(-0.45, 0.45)).normalize();
          this.physics.add.existing(f);
          f.body.setCircle(26);
          f.body.setCollideWorldBounds(true);
          f.setDepth(14);
          this.bgFish.push(f);
        }
      }

      createPlayer() {
        this.player = this.makeRealFish(WORLD_W * 0.18, WORLD_H * 0.5, {
          color: 0xf97316,
          accent: 0xffffff,
          size: 1.05,
        });
        this.player.setDepth(90);
        this.physics.add.existing(this.player);
        this.player.body.setCircle(45);
        this.player.body.setCollideWorldBounds(true);
      }

      createPredators() {
        const map = maps[currentMapIndex] || maps[0];
        for (let i = 0; i < map.predatorCount; i++) {
          const p = this.makeRealFish(
            Phaser.Math.Between(560, WORLD_W - 150),
            Phaser.Math.Between(160, WORLD_H - 190),
            {
              color: 0x334155,
              accent: 0xffffff,
              icon: "☠",
              type: i % 3 === 0 ? "shark" : "fish",
              size: Phaser.Math.FloatBetween(1.0, 1.35),
            }
          );
          p.damage = Phaser.Math.Between(7, 14) + currentMapIndex;
          p.speed = Phaser.Math.Between(78, 122) + currentMapIndex * 4;
          p.dir = new Phaser.Math.Vector2(Phaser.Math.FloatBetween(-1, 1), Phaser.Math.FloatBetween(-1, 1)).normalize();
          this.physics.add.existing(p);
          p.body.setCircle(48);
          p.body.setCollideWorldBounds(true);
          p.setDepth(55);
          this.predators.push(p);
        }

        const bossShark = this.makeRealFish(WORLD_W * 0.78, WORLD_H * 0.25, {
          color: 0x111827,
          accent: 0xffffff,
          icon: "🦈",
          type: "shark",
          size: 1.55,
        });
        bossShark.damage = 18 + currentMapIndex * 2;
        bossShark.speed = 76 + currentMapIndex * 4;
        bossShark.dir = new Phaser.Math.Vector2(-1, 0.35).normalize();
        this.physics.add.existing(bossShark);
        bossShark.body.setCircle(60);
        bossShark.body.setCollideWorldBounds(true);
        bossShark.setDepth(58);
        this.predators.push(bossShark);
      }

      createCoins() {
        for (let i = 0; i < 22; i++) {
          const c = this.add.container(Phaser.Math.Between(260, WORLD_W - 170), Phaser.Math.Between(150, WORLD_H - 170)).setDepth(35);
          c.add(this.add.circle(0, 0, 34, 0xfacc15, 0.14));
          c.add(this.add.circle(0, 0, 18, 0xfacc15));
          c.add(this.add.text(0, 0, "$", { fontSize: "20px", color: "#78350f", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5));
          this.physics.add.existing(c);
          c.body.setCircle(22);
          this.coins.push(c);
          this.tweens.add({ targets: c, y: c.y - 12, duration: 900, yoyo: true, repeat: -1, delay: i * 40 });
        }
      }

      createPowerups() {
        const types = [
          { type: "health", icon: "❤️", color: 0xef4444 },
          { type: "shield", icon: "🛡️", color: 0x38bdf8 },
          { type: "speed", icon: "⚡", color: 0xfacc15 },
        ];

        for (let i = 0; i < 7; i++) {
          const item = types[i % types.length];
          const p = this.add.container(Phaser.Math.Between(340, WORLD_W - 210), Phaser.Math.Between(210, WORLD_H - 230)).setDepth(37);
          p.powerType = item.type;
          p.add(this.add.circle(0, 0, 38, item.color, 0.22));
          p.add(this.add.circle(0, 0, 24, item.color, 0.85));
          p.add(this.add.text(0, 0, item.icon, { fontSize: "22px" }).setOrigin(0.5));
          this.physics.add.existing(p);
          p.body.setCircle(26);
          this.powerups.push(p);
          this.tweens.add({ targets: p, scaleX: 1.18, scaleY: 1.18, duration: 700, yoyo: true, repeat: -1 });
        }
      }

      createRareFishTimer() {
        this.time.addEvent({
          delay: 18000,
          loop: true,
          callback: () => {
            if (!ready || ended) return;
            this.spawnRareFish();
          },
        });
      }

      spawnRareFish() {
        rareSpawnCount += 1;
        const variants = [
          { name: "Golden Fish", icon: "⭐", color: 0xfacc15, score: 25, xp: 25, coins: 10, size: 0.95, type: "fish" },
          { name: "Diamond Fish", icon: "💎", color: 0x60a5fa, score: 50, xp: 50, coins: 25, size: 0.95, type: "fish" },
          { name: "Dolphin Bonus", icon: "🐬", color: 0x38bdf8, score: 35, xp: 30, coins: 15, size: 1.05, type: "dolphin" },
        ];
        const data = variants[rareSpawnCount % variants.length];
        const x = Phaser.Math.Between(500, WORLD_W - 250);
        const y = Phaser.Math.Between(220, WORLD_H - 280);
        const f = this.makeRealFish(x, y, { color: data.color, icon: data.icon, size: data.size, type: data.type });
        f.rare = data;
        f.speed = Phaser.Math.Between(155, 220);
        f.dir = new Phaser.Math.Vector2(Phaser.Math.FloatBetween(-1, 1), Phaser.Math.FloatBetween(-0.7, 0.7)).normalize();
        this.physics.add.existing(f);
        f.body.setCircle(42);
        f.body.setCollideWorldBounds(true);
        f.setDepth(70);
        this.rareFish.push(f);
        this.centerMessage(`${data.icon} ${data.name} appeared!`, "#facc15", 1100);

        this.tweens.add({ targets: f.glow, alpha: 0.55, scaleX: 1.45, scaleY: 1.45, duration: 520, yoyo: true, repeat: -1 });
        this.time.delayedCall(9000, () => {
          if (f.active) {
            this.floatText(f.x, f.y, "escaped", "#cbd5e1");
            f.destroy();
          }
        });
      }

      shuffleOptions(options) {
        const arr = [...options];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Phaser.Math.Between(0, i);
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      }

      createQuestion() {
        if (current >= safeQuestions.length) return this.endGame("Ocean level complete!");

        const neededMap = Math.min(maps.length - 1, Math.floor(current / 2));
        if (neededMap !== currentMapIndex) {
          currentMapIndex = neededMap;
          this.createMap(currentMapIndex);
        }

        this.answerFish.forEach((f) => f.destroy());
        this.labels.forEach((l) => l.destroy());
        this.answerFish = [];
        this.labels = [];

        const q = safeQuestions[current];
        const options = this.shuffleOptions([...new Set([...(q.options || []), q.answer])]).slice(0, 4);
        const answerColor = correctColors[current % correctColors.length];

        const baseX = Phaser.Math.Between(880, WORLD_W - 760);
        const baseY = Phaser.Math.Between(250, WORLD_H - 580);
        const spots = [
          [baseX, baseY],
          [baseX + 460, baseY + 150],
          [baseX - 250, baseY + 390],
          [baseX + 540, baseY + 500],
        ];

        options.forEach((answer, i) => {
          const correct = String(answer).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
          const fishColor = correct ? answerColor : wrongColors[(current + i + 1) % wrongColors.length];
          const f = this.makeRealFish(
            Phaser.Math.Clamp(spots[i][0], 180, WORLD_W - 180),
            Phaser.Math.Clamp(spots[i][1], 160, WORLD_H - 170),
            {
              color: fishColor,
              accent: 0xffffff,
              icon: correct ? "⭐" : "",
              size: correct ? 1.14 : 0.98,
            }
          );

          f.answer = answer;
          f.correct = correct;
          f.speed = Phaser.Math.Between(86, 142) + currentMapIndex * 4;
          f.dir = new Phaser.Math.Vector2(Phaser.Math.FloatBetween(-1, 1), Phaser.Math.FloatBetween(-1, 1)).normalize();
          this.physics.add.existing(f);
          f.body.setCircle(43);
          f.body.setCollideWorldBounds(true);
          f.setDepth(correct ? 64 : 48);

          if (correct) {
            this.tweens.add({ targets: f.glow, alpha: 0.48, scaleX: 1.34, scaleY: 1.34, duration: 620, yoyo: true, repeat: -1 });
          }

          const label = this.add.text(f.x, f.y + 66, answer, {
            fontSize: "22px",
            color: "#ffffff",
            fontFamily: "Arial",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 5,
          }).setOrigin(0.5).setDepth(72);

          f.label = label;
          this.labels.push(label);
          this.answerFish.push(f);
        });

        syncHud(`${maps[currentMapIndex].emoji} ${maps[currentMapIndex].name}: find ⭐ answer fish.`);
      }

      createPointer() {
        this.starPointer = this.add.text(GAME_W / 2, 34, "⭐", { fontSize: "30px" }).setOrigin(0.5).setScrollFactor(0).setDepth(210);
      }

      setTargetFromPointer(pointer) {
        const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.targetX = Phaser.Math.Clamp(world.x, 80, WORLD_W - 80);
        this.targetY = Phaser.Math.Clamp(world.y, 100, WORLD_H - 90);
      }

      movePlayer(time) {
        const boost = time < speedBoostUntil ? 70 : 0;
        const speed = 330 + level * 18 + boost;
        const growthScale = Math.min(1.75, 1 + (level - 1) * 0.07);

        if (isPortraitMobile) {
          const joy = joystickRef.current;
          if (joy.active && Math.abs(joy.x) + Math.abs(joy.y) > 0.05) {
            const angle = Math.atan2(joy.y, joy.x);
            this.player.body.setVelocity(joy.x * speed, joy.y * speed);
            this.player.rotation = angle;
          } else {
            this.player.body.setVelocity(0, 0);
          }
        } else {
          const dx = this.targetX - this.player.x;
          const dy = this.targetY - this.player.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > 8) {
            const angle = Math.atan2(dy, dx);
            this.player.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            this.player.rotation = angle;
          } else {
            this.player.body.setVelocity(0, 0);
          }
        }

        this.player.scaleX = growthScale;
        this.player.scaleY = growthScale;
      }

      moveAllFish() {
        [...this.answerFish, ...this.predators, ...this.bgFish, ...this.rareFish].forEach((f) => {
          if (!f.active || !f.body) return;

          const isPredator = this.predators.includes(f);
          const isRare = this.rareFish.includes(f);
          const chaseDistance = f.scaleX > 1.45 ? 560 : 390;
          const chase = isPredator && Phaser.Math.Distance.Between(f.x, f.y, this.player.x, this.player.y) < chaseDistance;

          if (chase) {
            const a = Phaser.Math.Angle.Between(f.x, f.y, this.player.x, this.player.y);
            const multiplier = f.scaleX > 1.45 ? 1.08 : 1.25;
            f.body.setVelocity(Math.cos(a) * f.speed * multiplier, Math.sin(a) * f.speed * multiplier);
            f.rotation = a;
          } else {
            f.body.setVelocity(f.dir.x * f.speed, f.dir.y * f.speed);
            f.rotation = Math.atan2(f.dir.y, f.dir.x);
          }

          if (isRare) f.rotation += Math.sin(this.time.now / 160) * 0.03;
          if (f.x < 95 || f.x > WORLD_W - 95) f.dir.x *= -1;
          if (f.y < 105 || f.y > WORLD_H - 95) f.dir.y *= -1;

          if (f.label) {
            const d = Phaser.Math.Distance.Between(f.x, f.y, this.player.x, this.player.y);
            const show = d < 850 || f.correct;
            f.label.setVisible(show);
            if (show) {
              f.label.x = f.x;
              f.label.y = f.y + 68;
            }
          }
        });
      }

      checkAnswerCollision() {
        this.answerFish.forEach((f) => {
          if (!f.active) return;
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, f.x, f.y);
          if (dist < 66 * this.player.scaleX) {
            f.correct ? this.eatCorrect(f) : this.eatWrong(f);
          }
        });
      }

      checkPredatorCollision() {
        if (invincible) return;
        this.predators.forEach((p) => {
          if (!p.active) return;
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
          if (dist < 62 * this.player.scaleX + (p.scaleX > 1.45 ? 32 : 0)) {
            invincible = true;

            if (shield > 0) {
              shield -= 1;
              this.centerMessage("SHIELD BLOCKED!", "#38bdf8");
            } else {
              health = Math.max(0, health - p.damage);
              combo = 0;
              this.centerMessage(`PREDATOR HIT -${p.damage}`, "#ef4444");
              this.cameras.main.shake(140, 0.004);
            }

            this.tweens.add({
              targets: this.player,
              alpha: 0.35,
              duration: 90,
              yoyo: true,
              repeat: 5,
              onComplete: () => {
                this.player.alpha = 1;
                invincible = false;
              },
            });

            syncHud(shield > 0 ? "Shield protected you." : "Predator attacked. Avoid skull fish.");
            if (health <= 0) this.endGame("Predators defeated your fish!");
          }
        });
      }

      checkCoinCollision() {
        this.coins.forEach((c) => {
          if (!c.active) return;
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y);
          if (dist < 66 * this.player.scaleX) {
            score += 5;
            this.floatText(c.x, c.y - 40, "+5", "#facc15");
            c.destroy();
            syncHud("Treasure collected. +5 score.");
          }
        });
      }

      checkPowerupCollision() {
        this.powerups.forEach((p) => {
          if (!p.active) return;
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
          if (dist < 68 * this.player.scaleX) {
            if (p.powerType === "health") {
              health = Math.min(100, health + 18);
              this.centerMessage("+18 HEALTH", "#22c55e");
            }
            if (p.powerType === "shield") {
              shield = Math.min(3, shield + 1);
              this.centerMessage("SHIELD +1", "#38bdf8");
            }
            if (p.powerType === "speed") {
              speedBoostUntil = this.time.now + 7000;
              score += 8;
              this.centerMessage("SPEED BOOST!", "#facc15");
            }
            p.destroy();
            syncHud("Powerup collected.");
          }
        });
      }

      checkRareFishCollision() {
        this.rareFish.forEach((f) => {
          if (!f.active) return;
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, f.x, f.y);
          if (dist < 70 * this.player.scaleX) {
            const data = f.rare;
            score += data.score;
            health = Math.min(100, health + 10);
            combo += 1;
            this.centerMessage(`${data.icon} ${data.name}! +${data.score}`, "#facc15", 1000);
            this.floatText(f.x, f.y - 52, `+${data.score}`, "#facc15");
            f.destroy();
            syncHud(`${data.name} collected. Bonus reward added.`);
          }
        });
      }

      eatCorrect(f) {
        const mapBoost = maps[currentMapIndex]?.rewardBoost || 1;
        const gained = Math.round((10 + combo * 2) * mapBoost);
        score += gained;
        combo += 1;
        health = Math.min(100, health + 8);
        level = Math.min(12, level + 1);

        this.floatText(f.x, f.y - 60, `+${gained}`, "#22c55e");
        this.centerMessage(combo >= 5 ? `COMBO x${combo}!` : "CORRECT FISH!", combo >= 5 ? "#facc15" : "#22c55e");

        f.label?.destroy();
        f.destroy();
        current += 1;

        this.time.delayedCall(520, () => {
          current >= safeQuestions.length ? this.endGame("Ocean level complete!") : this.createQuestion();
        });
        syncHud("Correct. Fish grew bigger.");
      }

      eatWrong(f) {
        health = Math.max(0, health - 15);
        score = Math.max(0, score - 4);
        combo = 0;

        this.floatText(f.x, f.y - 60, "-15 HP", "#ef4444");
        this.centerMessage("WRONG FISH!", "#ef4444");
        this.cameras.main.shake(120, 0.004);

        f.label?.destroy();
        f.destroy();
        current += 1;

        if (health <= 0) {
          this.time.delayedCall(520, () => this.endGame("Wrong fish made you lose health!"));
          return;
        }

        this.time.delayedCall(520, () => {
          current >= safeQuestions.length ? this.endGame("Ocean level complete!") : this.createQuestion();
        });
        syncHud("Wrong fish. Health decreased.");
      }

      updatePointer() {
        const correct = this.answerFish.find((f) => f.active && f.correct);
        if (!correct || !this.starPointer) return;
        const cam = this.cameras.main;
        const sx = correct.x - cam.scrollX;
        const sy = correct.y - cam.scrollY;
        this.starPointer.x = Phaser.Math.Clamp(sx, 38, GAME_W - 38);
        this.starPointer.y = Phaser.Math.Clamp(sy, 28, GAME_H - 30);
      }

      drawMiniMap() {
        if (!miniMapRef.current || !this.player) return;
        const canvas = miniMapRef.current;
        const ctx = canvas.getContext("2d");
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "rgba(2, 6, 23, 0.88)";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(34, 211, 238, 0.8)";
        ctx.strokeRect(1, 1, w - 2, h - 2);

        const dot = (x, y, color, r = 3) => {
          ctx.beginPath();
          ctx.fillStyle = color;
          ctx.arc((x / WORLD_W) * w, (y / WORLD_H) * h, r, 0, Math.PI * 2);
          ctx.fill();
        };

        dot(this.player.x, this.player.y, "#fb923c", 5);
        const correct = this.answerFish.find((f) => f.active && f.correct);
        if (correct) dot(correct.x, correct.y, "#facc15", 5);
        this.answerFish.filter((f) => f.active && !f.correct).forEach((f) => dot(f.x, f.y, "#93c5fd", 2));
        this.predators.filter((p) => p.active).forEach((p) => dot(p.x, p.y, "#ef4444", p.scaleX > 1.45 ? 4 : 3));
        this.coins.filter((c) => c.active).forEach((c) => dot(c.x, c.y, "#facc15", 2));
        this.powerups.filter((p) => p.active).forEach((p) => dot(p.x, p.y, "#22c55e", 2));
        this.rareFish.filter((f) => f.active).forEach((f) => dot(f.x, f.y, "#a78bfa", 4));
      }

      floatText(x, y, text, color) {
        const item = this.add.text(x, y, text, {
          fontSize: "26px",
          color,
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 5,
        }).setOrigin(0.5).setDepth(150);
        this.tweens.add({ targets: item, y: y - 46, alpha: 0, duration: 760, onComplete: () => item.destroy() });
      }

      centerMessage(text, color, duration = 820) {
        const item = this.add.text(GAME_W / 2, 54, text, {
          fontSize: "30px",
          color,
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 6,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(230);
        this.tweens.add({ targets: item, y: 24, alpha: 0, duration, onComplete: () => item.destroy() });
      }

      endGame(reason = "Game complete!") {
        if (ended) return;
        ended = true;
        const xp = Math.max(25, Math.round(score / 2));
        const coins = Math.max(12, Math.round(score / 8));

        const panel = this.add.container(GAME_W / 2, GAME_H / 2).setScrollFactor(0).setDepth(500);
        const bg = this.add.rectangle(0, 0, 620, 300, 0x0f172a, 0.97);
        bg.setStrokeStyle(3, 0x38bdf8, 0.75);
        const title = this.add.text(0, -100, "🐟 OCEAN COMPLETE", {
          fontSize: "34px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 6,
        }).setOrigin(0.5);
        const reasonText = this.add.text(0, -34, reason, { fontSize: "20px", color: "#38bdf8", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5);
        const scoreText = this.add.text(0, 36, `Score: ${score} · Level: ${level} · ${getGrowthName()}`, { fontSize: "20px", color: "#facc15", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5);
        const rewardText = this.add.text(0, 94, `Reward: +${xp} XP · +${coins} Coins`, { fontSize: "20px", color: "#22c55e", fontFamily: "Arial" }).setOrigin(0.5);
        panel.add([bg, title, reasonText, scoreText, rewardText]);

        syncHud("Game complete. Tap EXIT in GameRoom.");

        if (!rewardSentRef.current && typeof latestRewardRef.current === "function") {
          rewardSentRef.current = true;
          latestRewardRef.current({
            xp,
            coins,
            score,
            total: safeQuestions.length,
            gameName: "Fish Game PRO",
            mode: "fish-pro-maps-rare-fish",
          });
        }
      }
    }

    const config = {
      type: Phaser.AUTO,
      parent: gameWrapRef.current,
      width: GAME_W,
      height: GAME_H,
      backgroundColor: "#020617",
      scene: OceanScene,
      physics: {
        default: "arcade",
        arcade: { gravity: { y: 0 }, debug: false },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_W,
        height: GAME_H,
      },
      render: {
        antialias: true,
        pixelArt: false,
        powerPreference: "high-performance",
      },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      setLoading(false);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [questions, topic, isPortraitMobile]);

  const healthRatio = Math.max(0, Math.min(1, hud.health / 100));

  const updateJoystick = (clientX, clientY, rect) => {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const len = Math.sqrt(dx * dx + dy * dy);
    const max = Math.min(rect.width, rect.height) * 0.34;
    const clamped = Math.min(len, max);
    const angle = Math.atan2(dy, dx);

    joystickRef.current = {
      x: len > 8 ? Math.cos(angle) : 0,
      y: len > 8 ? Math.sin(angle) : 0,
      active: len > 8,
    };

    return { x: Math.cos(angle) * clamped, y: Math.sin(angle) * clamped };
  };

  const handleJoyMove = (e) => {
    if (!isPortraitMobile) return;
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const touch = e.touches?.[0];
    const x = touch ? touch.clientX : e.clientX;
    const y = touch ? touch.clientY : e.clientY;
    const pos = updateJoystick(x, y, rect);
    const knob = target.querySelector("[data-joy-knob]");
    if (knob) knob.style.transform = `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`;
  };

  const stopJoystick = (e) => {
    joystickRef.current = { x: 0, y: 0, active: false };
    const knob = e.currentTarget.querySelector("[data-joy-knob]");
    if (knob) knob.style.transform = "translate(-50%, -50%)";
  };

  const LoadingOverlay = () => (
    <div className="absolute inset-0 z-[100000] flex flex-col items-center justify-center bg-slate-950 text-white">
      <div className="text-7xl animate-bounce">🐟</div>
      <div className="mt-5 text-2xl font-black">Loading Ocean Adventure</div>
      <div className="mt-2 text-sm font-bold text-cyan-200">{loadingText}</div>
      <div className="mt-6 h-3 w-64 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full w-2/3 animate-pulse rounded-full bg-cyan-400" />
      </div>
      <div className="mt-4 text-xs font-semibold text-slate-400">Student OS is preparing your map, fish, questions, and rewards.</div>
    </div>
  );

  const HudCard = ({ mobile = false }) => (
    <div
      className={
        mobile
          ? "relative rounded-3xl border border-cyan-400/35 bg-slate-950/95 p-4 shadow-2xl"
          : "pointer-events-none fixed left-5 top-5 z-[10000] w-[420px] rounded-2xl border border-cyan-400/35 bg-slate-950/75 p-4 text-white shadow-2xl backdrop-blur-md"
      }
    >
      <div className={mobile ? "pr-24 text-lg font-black leading-tight" : "text-sm font-black leading-tight"}>
        Q{hud.current}/{hud.total}. {hud.question}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-xs font-black">
        <div>Score {hud.score}</div>
        <div className="text-green-300">HP {hud.health}</div>
        <div className="text-blue-300">Combo {hud.combo}</div>
        <div className="text-purple-300">Lv {hud.level}{hud.shield > 0 ? ` 🛡${hud.shield}` : ""}</div>
      </div>
      <div className="mt-3 h-2.5 rounded-full bg-slate-800">
        <div className="h-2.5 rounded-full bg-green-500" style={{ width: `${healthRatio * 100}%` }} />
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-black text-cyan-200">{hud.mapName} · {hud.growthName}</div>
          <div className="mt-1 text-xs font-bold leading-snug text-slate-200">{hud.message}</div>
        </div>
        <canvas
          ref={miniMapRef}
          width={170}
          height={92}
          className={mobile ? "h-[78px] w-[132px] shrink-0 rounded border border-cyan-400/60 bg-slate-950" : "h-[70px] w-[130px] shrink-0 rounded border border-cyan-400/60 bg-slate-950"}
        />
      </div>
    </div>
  );

  if (isPortraitMobile) {
    return (
      <div
        className="fixed inset-0 z-[99999] grid bg-slate-950 text-white"
        style={{
          gridTemplateRows: "31dvh minmax(200px, 38dvh) 31dvh",
          width: "100dvw",
          height: "100dvh",
          overflow: "hidden",
          touchAction: "none",
          overscrollBehavior: "none",
        }}
      >
        {loading && <LoadingOverlay />}

        <div className="relative border-b border-cyan-400/30 bg-slate-950 px-3 pt-5">
          <HudCard mobile />
        </div>

        <div className="relative flex items-center justify-center overflow-hidden border-y border-cyan-400/20 bg-slate-900">
          <div ref={gameWrapRef} className="relative h-full w-full overflow-hidden rounded-2xl bg-slate-900" />
        </div>

        <div
          className="relative flex flex-col items-center justify-center bg-slate-950"
          onTouchStart={handleJoyMove}
          onTouchMove={handleJoyMove}
          onTouchEnd={stopJoystick}
          onMouseDown={handleJoyMove}
          onMouseMove={(e) => {
            if (e.buttons === 1) handleJoyMove(e);
          }}
          onMouseUp={stopJoystick}
          style={{ touchAction: "none" }}
        >
          <div className="mb-2 text-sm font-black text-cyan-200">Joystick · Chase ⭐ answer fish</div>
          <div className="relative h-36 w-36 rounded-full border-4 border-cyan-400/70 bg-cyan-300/10 shadow-[0_0_35px_rgba(34,211,238,0.35)]">
            <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30 bg-white/10" />
            <div data-joy-knob className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-cyan-300 bg-white/40 shadow-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-hidden bg-slate-950 text-white"
      style={{
        width: "100dvw",
        height: "100dvh",
        margin: 0,
        padding: 0,
        touchAction: "none",
        overscrollBehavior: "none",
      }}
    >
      {loading && <LoadingOverlay />}
      <HudCard />
      <div ref={gameWrapRef} className="h-full w-full bg-slate-950" />
    </div>
  );
}
