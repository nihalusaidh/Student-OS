import { useEffect, useMemo, useRef, useState } from "react";
import Phaser from "phaser";

/**
 * FishGame PNG Sprite Version - Student OS
 * Path: src/components/games/FishGame.jsx
 *
 * What this version adds:
 * 1. Real PNG fish sprites from /public/fish/ instead of circle/ellipse fish.
 * 2. Compact no-scroll mobile map selection.
 * 3. Five maps: Coral Reef, Deep Ocean, Shipwreck Bay, Ice Ocean, Volcano Sea.
 * 4. Golden Fish bonus.
 * 5. Boss Shark near final question.
 * 6. Balanced difficulty: readable question time, but not too easy.
 * 7. Mobile optimized world size and object count.
 * 8. Laptop HUD + minimap.
 *
 * Required files in public/fish/:
 * - player-fish.png
 * - blue-fish.png
 * - green-fish.png
 * - purple-fish.png
 * - red-fish.png
 * - gold-fish.png
 * - shark.png
 * - boss-shark.png
 * - dolphin.png
 *
 * If images are missing, this file falls back to emoji/procedural fish so it still runs.
 */

const MAPS = [
  {
    id: "coral",
    name: "Coral Reef",
    emoji: "🌊",
    difficulty: "Easy",
    desc: "Bright reef, balanced predators, good for practice.",
    bgTop: 0x0891b2,
    bgMid: 0x0e7490,
    bgBottom: 0x164e63,
    deco: ["🪸", "🐚", "🌿"],
    predators: 5,
    predatorSpeed: 0.92,
    predatorDamage: 0.9,
    coins: 16,
    powerups: 4,
    xpMultiplier: 1,
  },
  {
    id: "deep",
    name: "Deep Ocean",
    emoji: "🌑",
    difficulty: "Medium",
    desc: "Dark ocean, faster sharks, better rewards.",
    bgTop: 0x0f172a,
    bgMid: 0x164e63,
    bgBottom: 0x020617,
    deco: ["✨", "🫧", "🐙"],
    predators: 6,
    predatorSpeed: 1.05,
    predatorDamage: 1,
    coins: 18,
    powerups: 4,
    xpMultiplier: 1.15,
  },
  {
    id: "shipwreck",
    name: "Shipwreck Bay",
    emoji: "⚓",
    difficulty: "Treasure",
    desc: "More coins, hidden treasures, medium danger.",
    bgTop: 0x155e75,
    bgMid: 0x0f766e,
    bgBottom: 0x1f2937,
    deco: ["⚓", "💰", "🪵"],
    predators: 6,
    predatorSpeed: 1,
    predatorDamage: 1,
    coins: 24,
    powerups: 5,
    xpMultiplier: 1.25,
  },
  {
    id: "ice",
    name: "Ice Ocean",
    emoji: "❄️",
    difficulty: "Hard",
    desc: "Cold water, slippery movement, strong rewards.",
    bgTop: 0x93c5fd,
    bgMid: 0x0284c7,
    bgBottom: 0x0f172a,
    deco: ["❄️", "🧊", "🐋"],
    predators: 7,
    predatorSpeed: 1.06,
    predatorDamage: 1.05,
    coins: 18,
    powerups: 5,
    xpMultiplier: 1.35,
  },
  {
    id: "volcano",
    name: "Volcano Sea",
    emoji: "🌋",
    difficulty: "Extreme",
    desc: "Lava bubbles, aggressive sharks, highest rewards.",
    bgTop: 0x7f1d1d,
    bgMid: 0x991b1b,
    bgBottom: 0x020617,
    deco: ["🌋", "🔥", "🪨"],
    predators: 8,
    predatorSpeed: 1.16,
    predatorDamage: 1.15,
    coins: 22,
    powerups: 5,
    xpMultiplier: 1.5,
  },
];

const SPRITE_PATHS = {
  player: "/fish/player-fish.png",
  blue: "/fish/blue-fish.png",
  green: "/fish/green-fish.png",
  purple: "/fish/purple-fish.png",
  red: "/fish/red-fish.png",
  gold: "/fish/gold-fish.png",
  shark: "/fish/shark.png",
  boss: "/fish/boss-shark.png",
  dolphin: "/fish/dolphin.png",
};

export default function FishGame({
  questions = [],
  topic = "Study Topic",
  onExit,
  onReward,
}) {
  const gameWrapRef = useRef(null);
  const gameRef = useRef(null);
  const rewardSentRef = useRef(false);
  const joystickRef = useRef({ x: 0, y: 0, active: false });
  const miniMapRef = useRef(null);
  const latestRewardRef = useRef(onReward);
  const selectedMapRef = useRef(MAPS[0]);

  const [selectedMap, setSelectedMap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState("Preparing ocean...");
  const [hud, setHud] = useState({
    question: "Select a map to start",
    score: 0,
    health: 100,
    combo: 0,
    level: 1,
    shield: 0,
    current: 1,
    total: Math.max(questions.length, 1),
    message: "Choose your ocean map.",
    ended: false,
  });

  const isPortraitMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
    return Boolean(coarse && window.innerHeight > window.innerWidth);
  }, []);

  useEffect(() => {
    latestRewardRef.current = onReward;
  }, [onReward]);

  const fallbackQuestions = useMemo(
    () => [
      { question: "Both inputs 1 gives output 1?", answer: "AND", options: ["AND", "OR", "XOR", "NOT"] },
      { question: "Either input 1 gives output 1?", answer: "OR", options: ["AND", "OR", "NAND", "NOR"] },
      { question: "Opposite output gate?", answer: "NOT", options: ["NOT", "AND", "OR", "XOR"] },
      { question: "Universal gate?", answer: "NAND", options: ["NAND", "NOR", "XOR", "AND"] },
      { question: "Exclusive OR short form?", answer: "XOR", options: ["XOR", "AND", "OR", "NOT"] },
      { question: "Collection of same datatype?", answer: "Array", options: ["Array", "Loop", "Pointer", "If"] },
      { question: "Address storing variable?", answer: "Pointer", options: ["Pointer", "Array", "Loop", "Struct"] },
      { question: "Stores charge?", answer: "Capacitor", options: ["Capacitor", "Resistor", "Diode", "Switch"] },
    ],
    []
  );

  useEffect(() => {
    if (!selectedMap) return;
    if (!gameWrapRef.current || gameRef.current) return;

    selectedMapRef.current = selectedMap;
    setLoading(true);
    setLoadStep(`Entering ${selectedMap.name}...`);

    const safeQuestions = questions?.length ? questions : fallbackQuestions;
    const parent = gameWrapRef.current;

    const GAME_W = isPortraitMobile ? 960 : Math.max(960, Math.floor(window.innerWidth || 1280));
    const GAME_H = isPortraitMobile ? 540 : Math.max(540, Math.floor(window.innerHeight || 720));
    const WORLD_W = isPortraitMobile ? 3400 : 4300;
    const WORLD_H = isPortraitMobile ? 1900 : 2300;

    let score = 0;
    let health = 100;
    let combo = 0;
    let level = 1;
    let shield = 0;
    let current = 0;
    let ended = false;
    let invincible = false;
    let ready = false;
    let speedBoostUntil = 0;
    let safeUntil = 0;
    let bossSpawned = false;
    let goldenFish = null;

    const map = selectedMapRef.current;
    const mobileMultiplier = isPortraitMobile ? 0.72 : 1;

    const syncHud = (message = "") => {
      const q = safeQuestions[Math.min(current, safeQuestions.length - 1)];
      setHud({
        question: q?.question || "Game complete",
        score,
        health: Math.round(health),
        combo,
        level,
        shield,
        current: Math.min(current + 1, safeQuestions.length),
        total: safeQuestions.length,
        message,
        ended,
      });
    };

    class OceanScene extends Phaser.Scene {
      constructor() {
        super("FishGamePNGSprites");
        this.player = null;
        this.answerFish = [];
        this.predators = [];
        this.coins = [];
        this.powerups = [];
        this.bgFish = [];
        this.labels = [];
        this.targetX = WORLD_W * 0.18;
        this.targetY = WORLD_H * 0.5;
        this.starPointer = null;
        this.lastHud = 0;
        this.lastMap = 0;
        this.spriteReady = false;
      }

      preload() {
        setLoadStep("Loading fish sprites...");
        Object.entries(SPRITE_PATHS).forEach(([key, path]) => {
          this.load.image(key, path);
        });

        this.load.on("complete", () => {
          this.spriteReady = true;
        });
      }

      create() {
        setLoadStep("Building ocean world...");
        this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
        this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

        this.createOcean();
        this.createBackgroundFish();
        this.createPlayer();
        this.createPredators();
        this.createCoins();
        this.createPowerups();
        this.createQuestion();
        this.createPointer();
        this.spawnGoldenFishLoop();

        this.cameras.main.startFollow(this.player, true, 0.09, 0.09);

        if (!isPortraitMobile) {
          this.input.on("pointermove", (p) => this.setTargetFromPointer(p));
          this.input.on("pointerdown", (p) => this.setTargetFromPointer(p));
        }

        safeUntil = this.time.now + 4500;
        this.time.delayedCall(500, () => setLoadStep("Almost ready..."));
        this.time.delayedCall(900, () => {
          ready = true;
          setLoading(false);
          syncHud(isPortraitMobile ? "Use joystick. Read first, then chase ⭐ answer fish." : "Move with mouse/touch. Read first, then chase ⭐ answer fish.");
        });

        this.time.addEvent({
          delay: 1000,
          loop: true,
          callback: () => {
            if (!ready || ended) return;
            health = Math.max(0, health - (isPortraitMobile ? 0.18 : 0.22));
            if (health <= 0) {
              this.endGame("Your fish ran out of health!");
              return;
            }
            syncHud("Find ⭐ answer fish. Avoid sharks. Collect coins.");
          },
        });
      }

      update(time) {
        if (!ready || ended || !this.player) return;

        this.movePlayer(time);
        this.moveAllFish(time);
        this.checkAnswerCollision();
        this.checkPredatorCollision(time);
        this.checkCoinCollision();
        this.checkPowerupCollision();
        this.checkGoldenFishCollision();
        this.updatePointer();

        if (!bossSpawned && current >= safeQuestions.length - 2) {
          this.spawnBossShark();
        }

        if (time - this.lastHud > 200) {
          const protectedText = time < safeUntil ? "Safe time active. Read the question now." : "Keep swimming.";
          syncHud(protectedText);
          this.lastHud = time;
        }

        if (time - this.lastMap > 250) {
          this.drawMiniMap();
          this.lastMap = time;
        }
      }

      createOcean() {
        const bg = this.add.graphics();
        bg.fillGradientStyle(map.bgTop, map.bgMid, map.bgMid, map.bgBottom, 1);
        bg.fillRect(0, 0, WORLD_W, WORLD_H);

        const staticLayer = this.add.graphics().setDepth(1);
        const rockCount = isPortraitMobile ? 35 : 80;
        for (let i = 0; i < rockCount; i++) {
          staticLayer.fillStyle(0x1f2937, Phaser.Math.FloatBetween(0.22, 0.6));
          staticLayer.fillEllipse(
            Phaser.Math.Between(0, WORLD_W),
            WORLD_H - Phaser.Math.Between(20, 110),
            Phaser.Math.Between(60, 180),
            Phaser.Math.Between(22, 65)
          );
        }

        const bubbleCount = isPortraitMobile ? 22 : 70;
        for (let i = 0; i < bubbleCount; i++) {
          const b = this.add.circle(
            Phaser.Math.Between(0, WORLD_W),
            Phaser.Math.Between(0, WORLD_H),
            Phaser.Math.Between(2, 6),
            0xffffff,
            Phaser.Math.FloatBetween(0.06, 0.18)
          ).setDepth(3);
          this.tweens.add({
            targets: b,
            y: b.y - Phaser.Math.Between(200, 520),
            alpha: 0,
            duration: Phaser.Math.Between(3800, 8500),
            repeat: -1,
            onRepeat: () => {
              b.y = WORLD_H + Phaser.Math.Between(20, 130);
              b.x = Phaser.Math.Between(0, WORLD_W);
              b.alpha = Phaser.Math.FloatBetween(0.06, 0.18);
            },
          });
        }

        const decoCount = isPortraitMobile ? 16 : 45;
        for (let i = 0; i < decoCount; i++) {
          const icon = map.deco[Phaser.Math.Between(0, map.deco.length - 1)];
          const deco = this.add.text(
            Phaser.Math.Between(0, WORLD_W),
            Phaser.Math.Between(WORLD_H - 155, WORLD_H - 76),
            icon,
            { fontSize: Phaser.Math.Between(30, 58) + "px" }
          ).setDepth(4);

          if (i < 10) {
            this.tweens.add({
              targets: deco,
              angle: Phaser.Math.Between(-5, 5),
              duration: Phaser.Math.Between(1200, 2400),
              yoyo: true,
              repeat: -1,
            });
          }
        }
      }

      hasTexture(key) {
        return this.textures.exists(key) && key !== "__MISSING";
      }

      makeSpriteFish(x, y, key, options = {}) {
        const {
          size = 1,
          depth = 50,
          label = "",
          tint = null,
          fallbackEmoji = "🐟",
          isPlayer = false,
        } = options;

        const fish = this.add.container(x, y).setDepth(depth);
        fish.spriteKey = key;
        fish.isSpriteFish = true;

        if (this.hasTexture(key)) {
          const glow = this.add.circle(0, 0, 74 * size, 0x38bdf8, isPlayer ? 0.13 : 0.08);
          const img = this.add.image(0, 0, key);
          img.setOrigin(0.5);
          img.setDisplaySize(130 * size, 82 * size);
          if (tint) img.setTint(tint);
          fish.add([glow, img]);
          fish.mainImage = img;
          fish.glow = glow;
        } else {
          const glow = this.add.circle(0, 0, 62 * size, 0x38bdf8, isPlayer ? 0.13 : 0.08);
          const body = this.add.text(0, 0, fallbackEmoji, {
            fontSize: Math.round(74 * size) + "px",
          }).setOrigin(0.5);
          fish.add([glow, body]);
          fish.mainImage = body;
          fish.glow = glow;
        }

        if (label) {
          const icon = this.add.text(0, -62 * size, label, {
            fontSize: Math.round(28 * size) + "px",
          }).setOrigin(0.5);
          fish.add(icon);
        }

        this.physics.add.existing(fish);
        fish.body.setCircle(42 * size);
        fish.body.setCollideWorldBounds(true);

        this.tweens.add({
          targets: fish,
          scaleY: 1.06,
          duration: 360,
          yoyo: true,
          repeat: -1,
        });

        return fish;
      }

      createBackgroundFish() {
        const count = isPortraitMobile ? 5 : 14;
        const keys = ["blue", "green", "purple", "red"];
        for (let i = 0; i < count; i++) {
          const key = keys[Phaser.Math.Between(0, keys.length - 1)];
          const f = this.makeSpriteFish(
            Phaser.Math.Between(180, WORLD_W - 180),
            Phaser.Math.Between(180, WORLD_H - 200),
            key,
            {
              size: Phaser.Math.FloatBetween(0.55, 0.72),
              depth: 12,
              fallbackEmoji: ["🐠", "🐟", "🐡"][Phaser.Math.Between(0, 2)],
            }
          );
          f.speed = Phaser.Math.Between(35, 70);
          f.dir = new Phaser.Math.Vector2(Phaser.Math.FloatBetween(-1, 1), Phaser.Math.FloatBetween(-0.4, 0.4)).normalize();
          f.setAlpha(0.58);
          this.bgFish.push(f);
        }
      }

      createPlayer() {
        this.player = this.makeSpriteFish(WORLD_W * 0.18, WORLD_H * 0.5, "player", {
          size: 1.05,
          depth: 80,
          fallbackEmoji: "🐠",
          isPlayer: true,
        });
      }

      createPredators() {
        const count = Math.max(4, Math.round(map.predators * mobileMultiplier));
        for (let i = 0; i < count; i++) {
          const p = this.makeSpriteFish(
            Phaser.Math.Between(650, WORLD_W - 180),
            Phaser.Math.Between(180, WORLD_H - 180),
            "shark",
            {
              size: Phaser.Math.FloatBetween(1.0, 1.25),
              depth: 52,
              fallbackEmoji: "🦈",
            }
          );
          p.damage = Phaser.Math.Between(7, 11) * map.predatorDamage;
          p.speed = Phaser.Math.Between(78, 115) * map.predatorSpeed * (isPortraitMobile ? 0.9 : 1);
          p.dir = new Phaser.Math.Vector2(Phaser.Math.FloatBetween(-1, 1), Phaser.Math.FloatBetween(-1, 1)).normalize();
          this.predators.push(p);
        }
      }

      spawnBossShark() {
        bossSpawned = true;
        const boss = this.makeSpriteFish(WORLD_W * 0.78, WORLD_H * 0.26, "boss", {
          size: 1.65,
          depth: 55,
          label: "🦈",
          fallbackEmoji: "🦈",
        });
        boss.isBoss = true;
        boss.damage = 16 * map.predatorDamage;
        boss.speed = 85 * map.predatorSpeed;
        boss.dir = new Phaser.Math.Vector2(-1, 0.25).normalize();
        this.predators.push(boss);
        this.centerMessage("BOSS SHARK APPEARS!", "#ef4444");
        syncHud("Boss Shark appeared. Finish the final answers!");
      }

      createCoins() {
        const count = Math.round(map.coins * mobileMultiplier);
        for (let i = 0; i < count; i++) {
          const c = this.add.container(
            Phaser.Math.Between(280, WORLD_W - 180),
            Phaser.Math.Between(170, WORLD_H - 190)
          ).setDepth(34);
          c.add(this.add.circle(0, 0, 32, 0xfacc15, 0.16));
          c.add(this.add.circle(0, 0, 17, 0xfacc15));
          c.add(this.add.text(0, 0, "$", {
            fontSize: "20px",
            color: "#78350f",
            fontFamily: "Arial",
            fontStyle: "bold",
          }).setOrigin(0.5));
          this.physics.add.existing(c);
          c.body.setCircle(22);
          this.coins.push(c);
        }
      }

      createPowerups() {
        const types = [
          { type: "health", icon: "❤️", color: 0xef4444 },
          { type: "shield", icon: "🛡️", color: 0x38bdf8 },
          { type: "speed", icon: "⚡", color: 0xfacc15 },
        ];

        const count = Math.round(map.powerups * mobileMultiplier);
        for (let i = 0; i < count; i++) {
          const item = types[i % types.length];
          const p = this.add.container(
            Phaser.Math.Between(380, WORLD_W - 220),
            Phaser.Math.Between(230, WORLD_H - 230)
          ).setDepth(36);
          p.powerType = item.type;
          p.add(this.add.circle(0, 0, 38, item.color, 0.22));
          p.add(this.add.circle(0, 0, 24, item.color, 0.85));
          p.add(this.add.text(0, 0, item.icon, { fontSize: "22px" }).setOrigin(0.5));
          this.physics.add.existing(p);
          p.body.setCircle(26);
          this.powerups.push(p);
        }
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
        if (current >= safeQuestions.length) {
          this.endGame("Ocean level complete!");
          return;
        }

        this.answerFish.forEach((f) => f.destroy());
        this.labels.forEach((l) => l.destroy());
        this.answerFish = [];
        this.labels = [];

        safeUntil = this.time.now + 2800;

        const q = safeQuestions[current];
        const options = this.shuffleOptions([...new Set([...(q.options || []), q.answer])]).slice(0, 4);
        const answerKeys = ["blue", "green", "purple", "red"];
        const correctKeyCycle = ["gold", "green", "blue", "purple", "red"];
        const correctKey = correctKeyCycle[current % correctKeyCycle.length];

        const baseX = Phaser.Math.Between(1050, WORLD_W - 900);
        const baseY = Phaser.Math.Between(300, WORLD_H - 680);
        const spots = [
          [baseX, baseY],
          [baseX + 520, baseY + 190],
          [baseX - 280, baseY + 430],
          [baseX + 620, baseY + 560],
        ];

        options.forEach((answer, i) => {
          const correct = String(answer).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
          const key = correct ? correctKey : answerKeys[i % answerKeys.length];
          const f = this.makeSpriteFish(
            Phaser.Math.Clamp(spots[i][0], 180, WORLD_W - 180),
            Phaser.Math.Clamp(spots[i][1], 170, WORLD_H - 180),
            key,
            {
              size: correct ? 1.13 : 1,
              depth: correct ? 60 : 45,
              label: correct ? "⭐" : "",
              fallbackEmoji: correct ? "🐠" : ["🐟", "🐡", "🐠", "🐬"][i % 4],
            }
          );
          f.answer = answer;
          f.correct = correct;
          f.speed = Phaser.Math.Between(82, 130) * (isPortraitMobile ? 0.92 : 1);
          f.dir = new Phaser.Math.Vector2(Phaser.Math.FloatBetween(-1, 1), Phaser.Math.FloatBetween(-1, 1)).normalize();

          if (correct && f.glow) {
            this.tweens.add({
              targets: f.glow,
              alpha: 0.45,
              scaleX: 1.3,
              scaleY: 1.3,
              duration: 620,
              yoyo: true,
              repeat: -1,
            });
          }

          const label = this.add.text(f.x, f.y + 70, answer, {
            fontSize: isPortraitMobile ? "24px" : "22px",
            color: "#ffffff",
            fontFamily: "Arial",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 5,
          }).setOrigin(0.5).setDepth(61);

          f.label = label;
          this.labels.push(label);
          this.answerFish.push(f);
        });

        syncHud("Read the question, then find ⭐ answer fish.");
      }

      createPointer() {
        this.starPointer = this.add.text(GAME_W / 2, 32, "⭐", {
          fontSize: "30px",
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
      }

      spawnGoldenFishLoop() {
        this.time.addEvent({
          delay: isPortraitMobile ? 32000 : 26000,
          loop: true,
          callback: () => {
            if (!ready || ended || goldenFish?.active) return;
            goldenFish = this.makeSpriteFish(
              Phaser.Math.Between(420, WORLD_W - 220),
              Phaser.Math.Between(220, WORLD_H - 240),
              "gold",
              {
                size: 0.95,
                depth: 70,
                label: "⭐",
                fallbackEmoji: "🐠",
              }
            );
            goldenFish.isGolden = true;
            goldenFish.speed = 155;
            goldenFish.dir = new Phaser.Math.Vector2(Phaser.Math.FloatBetween(-1, 1), Phaser.Math.FloatBetween(-1, 1)).normalize();
            this.centerMessage("GOLDEN FISH APPEARED!", "#facc15");
            this.time.delayedCall(9000, () => {
              if (goldenFish?.active) {
                goldenFish.destroy();
                goldenFish = null;
              }
            });
          },
        });
      }

      setTargetFromPointer(pointer) {
        const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.targetX = Phaser.Math.Clamp(world.x, 80, WORLD_W - 80);
        this.targetY = Phaser.Math.Clamp(world.y, 100, WORLD_H - 90);
      }

      movePlayer(time) {
        const boost = time < speedBoostUntil ? 55 : 0;
        const speed = 315 + level * 15 + boost;

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

        const size = Math.min(1.7, 1 + (level - 1) * 0.055);
        this.player.scaleX = size;
        this.player.scaleY = size;
      }

      moveAllFish(time) {
        const all = [...this.answerFish, ...this.predators, ...this.bgFish];
        if (goldenFish?.active) all.push(goldenFish);

        all.forEach((f) => {
          if (!f.active || !f.body) return;

          const isPredator = this.predators.includes(f);
          const chaseDistance = f.isBoss ? 610 : 390;
          const canChase = time > safeUntil;
          const chase = canChase && isPredator && Phaser.Math.Distance.Between(f.x, f.y, this.player.x, this.player.y) < chaseDistance;

          if (chase) {
            const a = Phaser.Math.Angle.Between(f.x, f.y, this.player.x, this.player.y);
            const multiplier = f.isBoss ? 1.05 : 1.18;
            f.body.setVelocity(Math.cos(a) * f.speed * multiplier, Math.sin(a) * f.speed * multiplier);
            f.rotation = a;
          } else {
            f.body.setVelocity(f.dir.x * f.speed, f.dir.y * f.speed);
            f.rotation = Math.atan2(f.dir.y, f.dir.x);
          }

          if (f.x < 95 || f.x > WORLD_W - 95) f.dir.x *= -1;
          if (f.y < 110 || f.y > WORLD_H - 100) f.dir.y *= -1;

          if (f.label) {
            const d = Phaser.Math.Distance.Between(f.x, f.y, this.player.x, this.player.y);
            const show = d < 950 || f.correct;
            f.label.setVisible(show);
            if (show) {
              f.label.x = f.x;
              f.label.y = f.y + 74;
            }
          }
        });
      }

      checkAnswerCollision() {
        this.answerFish.forEach((f) => {
          if (!f.active) return;
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, f.x, f.y);
          if (dist < 70 * this.player.scaleX) {
            f.correct ? this.eatCorrect(f) : this.eatWrong(f);
          }
        });
      }

      checkPredatorCollision(time) {
        if (invincible || time < safeUntil) return;

        this.predators.forEach((p) => {
          if (!p.active) return;
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
          const hitRange = (p.isBoss ? 95 : 65) * this.player.scaleX;
          if (dist < hitRange) {
            invincible = true;

            if (shield > 0) {
              shield -= 1;
              this.centerMessage("SHIELD BLOCKED!", "#38bdf8");
            } else {
              health = Math.max(0, health - p.damage);
              combo = 0;
              this.centerMessage(`${p.isBoss ? "BOSS" : "SHARK"} HIT -${Math.round(p.damage)}`, "#ef4444");
              this.cameras.main.shake(130, 0.004);
            }

            this.tweens.add({
              targets: this.player,
              alpha: 0.35,
              duration: 100,
              yoyo: true,
              repeat: 5,
              onComplete: () => {
                this.player.alpha = 1;
                invincible = false;
              },
            });

            syncHud(shield > 0 ? "Shield protected you." : "Shark attacked. Avoid predators.");
            if (health <= 0) this.endGame("Predators defeated your fish!");
          }
        });
      }

      checkCoinCollision() {
        this.coins.forEach((c) => {
          if (!c.active) return;
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y);
          if (dist < 68 * this.player.scaleX) {
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
          if (dist < 70 * this.player.scaleX) {
            if (p.powerType === "health") {
              health = Math.min(100, health + 16);
              this.centerMessage("+16 HEALTH", "#22c55e");
            }
            if (p.powerType === "shield") {
              shield = Math.min(3, shield + 1);
              this.centerMessage("SHIELD +1", "#38bdf8");
            }
            if (p.powerType === "speed") {
              speedBoostUntil = this.time.now + 6500;
              score += 8;
              this.centerMessage("SPEED BOOST!", "#facc15");
            }
            p.destroy();
            syncHud("Powerup collected.");
          }
        });
      }

      checkGoldenFishCollision() {
        if (!goldenFish?.active) return;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, goldenFish.x, goldenFish.y);
        if (dist < 78 * this.player.scaleX) {
          score += 25;
          health = Math.min(100, health + 10);
          combo += 1;
          this.centerMessage("GOLDEN FISH +25!", "#facc15");
          this.floatText(goldenFish.x, goldenFish.y - 55, "+25", "#facc15");
          goldenFish.destroy();
          goldenFish = null;
          syncHud("Golden Fish collected. Bonus score and health.");
        }
      }

      eatCorrect(f) {
        const bossBonus = bossSpawned && current >= safeQuestions.length - 2 ? 12 : 0;
        const gained = 10 + combo * 2 + bossBonus;
        score += gained;
        combo += 1;
        health = Math.min(100, health + 7);
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
        health = Math.max(0, health - 13);
        score = Math.max(0, score - 4);
        combo = 0;

        this.floatText(f.x, f.y - 60, "-13 HP", "#ef4444");
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
        this.starPointer.y = Phaser.Math.Clamp(sy, 30, GAME_H - 32);
      }

      drawMiniMap() {
        if (!miniMapRef.current || !this.player) return;

        const canvas = miniMapRef.current;
        const ctx = canvas.getContext("2d");
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "rgba(2, 6, 23, 0.86)";
        ctx.fillRect(0, 0, w, h);

        const dot = (x, y, color, r = 3) => {
          ctx.beginPath();
          ctx.fillStyle = color;
          ctx.arc((x / WORLD_W) * w, (y / WORLD_H) * h, r, 0, Math.PI * 2);
          ctx.fill();
        };

        dot(this.player.x, this.player.y, "#fb923c", 4);
        const correct = this.answerFish.find((f) => f.active && f.correct);
        if (correct) dot(correct.x, correct.y, "#facc15", 5);
        this.answerFish.filter((f) => f.active && !f.correct).forEach((f) => dot(f.x, f.y, "#93c5fd", 2));
        this.predators.forEach((p) => dot(p.x, p.y, p.isBoss ? "#f97316" : "#ef4444", p.isBoss ? 5 : 3));
        this.coins.filter((c) => c.active).forEach((c) => dot(c.x, c.y, "#facc15", 2));
        this.powerups.filter((p) => p.active).forEach((p) => dot(p.x, p.y, "#22c55e", 2));
        if (goldenFish?.active) dot(goldenFish.x, goldenFish.y, "#fde047", 5);
      }

      floatText(x, y, text, color) {
        const item = this.add.text(x, y, text, {
          fontSize: "25px",
          color,
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 5,
        }).setOrigin(0.5).setDepth(140);

        this.tweens.add({
          targets: item,
          y: y - 44,
          alpha: 0,
          duration: 720,
          onComplete: () => item.destroy(),
        });
      }

      centerMessage(text, color) {
        const item = this.add.text(GAME_W / 2, 46, text, {
          fontSize: Math.max(20, GAME_W * 0.026) + "px",
          color,
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 5,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(220);

        this.tweens.add({
          targets: item,
          y: 18,
          alpha: 0,
          duration: 820,
          onComplete: () => item.destroy(),
        });
      }

      endGame(reason = "Game complete!") {
        if (ended) return;
        ended = true;

        const xp = Math.max(25, Math.round((score / 2) * map.xpMultiplier));
        const coins = Math.max(10, Math.round(score / 8));

        const panel = this.add.container(GAME_W / 2, GAME_H / 2).setScrollFactor(0).setDepth(500);
        const panelW = Math.min(650, GAME_W * 0.88);
        const panelH = Math.min(320, GAME_H * 0.76);
        const bg = this.add.rectangle(0, 0, panelW, panelH, 0x0f172a, 0.97);
        bg.setStrokeStyle(3, 0x38bdf8, 0.7);

        const title = this.add.text(0, -panelH * 0.34, `${map.emoji} OCEAN COMPLETE`, {
          fontSize: Math.max(23, GAME_W * 0.038) + "px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 6,
        }).setOrigin(0.5);

        const reasonText = this.add.text(0, -panelH * 0.12, reason, {
          fontSize: Math.max(15, GAME_W * 0.024) + "px",
          color: "#38bdf8",
          fontFamily: "Arial",
          fontStyle: "bold",
        }).setOrigin(0.5);

        const scoreText = this.add.text(0, panelH * 0.08, `Score: ${score} · Level: ${level} · Combo: ${combo}`, {
          fontSize: Math.max(15, GAME_W * 0.026) + "px",
          color: "#facc15",
          fontFamily: "Arial",
          fontStyle: "bold",
        }).setOrigin(0.5);

        const rewardText = this.add.text(0, panelH * 0.27, `Reward: +${xp} XP · +${coins} Coins`, {
          fontSize: Math.max(15, GAME_W * 0.025) + "px",
          color: "#22c55e",
          fontFamily: "Arial",
        }).setOrigin(0.5);

        panel.add([bg, title, reasonText, scoreText, rewardText]);
        syncHud("Game complete. Tap EXIT.");

        if (!rewardSentRef.current && typeof latestRewardRef.current === "function") {
          rewardSentRef.current = true;
          latestRewardRef.current({
            xp,
            coins,
            score,
            total: safeQuestions.length,
            gameName: `Fish Game - ${map.name}`,
            mode: "fish-png-sprites-balanced",
          });
        }
      }
    }

    const config = {
      type: Phaser.WEBGL,
      parent,
      width: GAME_W,
      height: GAME_H,
      backgroundColor: "#020617",
      scene: OceanScene,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 0 },
          debug: false,
        },
      },
      scale: {
        mode: isPortraitMobile ? Phaser.Scale.FIT : Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias: true,
        pixelArt: false,
        powerPreference: "high-performance",
      },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [selectedMap, questions, fallbackQuestions, isPortraitMobile]);

  const healthRatio = Math.max(0, Math.min(1, hud.health / 100));

  const startMap = (map) => {
    rewardSentRef.current = false;
    setSelectedMap(map);
  };

  const updateJoystick = (clientX, clientY, rect) => {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const len = Math.sqrt(dx * dx + dy * dy);
    const max = Math.min(rect.width, rect.height) * 0.36;
    const clamped = Math.min(len, max);
    const angle = Math.atan2(dy, dx);

    joystickRef.current = {
      x: len > 8 ? Math.cos(angle) : 0,
      y: len > 8 ? Math.sin(angle) : 0,
      active: len > 8,
    };

    return {
      x: Math.cos(angle) * clamped,
      y: Math.sin(angle) * clamped,
    };
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
    if (knob) {
      knob.style.transform = `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`;
    }
  };

  const stopJoystick = (e) => {
    joystickRef.current = { x: 0, y: 0, active: false };
    const knob = e.currentTarget.querySelector("[data-joy-knob]");
    if (knob) {
      knob.style.transform = "translate(-50%, -50%)";
    }
  };

  if (!selectedMap) {
    return (
      <div className="fixed inset-0 z-[99999] overflow-hidden bg-slate-950 text-white">
        <div className="flex h-full w-full flex-col px-4 py-4 sm:px-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-2xl font-black sm:text-4xl">🐟 Select Ocean Map</div>
              <div className="mt-1 text-xs font-bold text-slate-300 sm:text-sm">
                Topic: {topic || "Study Topic"} · Choose a map to start
              </div>
            </div>
            <button
              onClick={onExit}
              className="rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white active:scale-95"
            >
              EXIT
            </button>
          </div>

          <div className="mt-4 grid flex-1 grid-cols-2 gap-3 overflow-hidden sm:grid-cols-5 sm:gap-4">
            {MAPS.map((map) => (
              <button
                key={map.id}
                onClick={() => startMap(map)}
                className="group flex min-h-0 flex-col justify-between rounded-2xl border border-cyan-300/30 bg-white/10 p-3 text-left shadow-xl transition active:scale-[0.98] sm:p-4"
              >
                <div>
                  <div className="text-3xl sm:text-5xl">{map.emoji}</div>
                  <div className="mt-2 text-base font-black sm:text-xl">{map.name}</div>
                  <div className="mt-1 inline-flex rounded-full bg-cyan-300/15 px-2 py-1 text-[10px] font-black text-cyan-200 sm:text-xs">
                    {map.difficulty}
                  </div>
                  <p className="mt-2 line-clamp-3 text-[11px] font-semibold leading-snug text-slate-300 sm:text-sm">
                    {map.desc}
                  </p>
                </div>
                <div className="mt-2 rounded-xl bg-cyan-400 px-3 py-2 text-center text-xs font-black text-slate-950 sm:text-sm">
                  START
                </div>
              </button>
            ))}
          </div>

          <div className="mt-3 text-center text-[11px] font-bold text-slate-400 sm:text-sm">
            Add PNG assets in <span className="text-cyan-300">public/fish/</span> for real fish graphics.
          </div>
        </div>
      </div>
    );
  }

  if (isPortraitMobile) {
    return (
      <div
        className="fixed inset-0 z-[99999] grid bg-slate-950 text-white"
        style={{
          gridTemplateRows: "27dvh auto 27dvh",
          width: "100dvw",
          height: "100dvh",
          overflow: "hidden",
          touchAction: "none",
          overscrollBehavior: "none",
        }}
      >
        {loading && (
          <div className="fixed inset-0 z-[100002] flex flex-col items-center justify-center bg-slate-950 text-white">
            <div className="text-6xl animate-bounce">{selectedMap.emoji}</div>
            <div className="mt-4 text-2xl font-black">Loading {selectedMap.name}...</div>
            <div className="mt-2 text-sm font-bold text-cyan-200">{loadStep}</div>
            <div className="mt-5 h-2 w-56 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-cyan-400" />
            </div>
          </div>
        )}

        <div className="relative border-b border-cyan-400/30 bg-slate-950 px-4 pt-5">
          <div className="pr-1 text-base font-black leading-tight drop-shadow">
            Q{hud.current}/{hud.total}. {hud.question}
          </div>

          <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] font-black">
            <div>Score: {hud.score}</div>
            <div className="text-green-300">HP: {hud.health}</div>
            <div className="text-blue-300">Combo: {hud.combo}</div>
            <div className="text-purple-300">Lv: {hud.level}{hud.shield > 0 ? ` 🛡${hud.shield}` : ""}</div>
          </div>

          <div className="mt-2 h-2 rounded-full bg-slate-800">
            <div className="h-2 rounded-full bg-green-500" style={{ width: `${healthRatio * 100}%` }} />
          </div>

          <div className="mt-2 flex items-start justify-between gap-2">
            <div className="text-[11px] font-bold leading-snug text-slate-200">
              {selectedMap.emoji} {selectedMap.name} · {hud.message}
            </div>
            <canvas
              ref={miniMapRef}
              width={150}
              height={86}
              className="h-[66px] w-[116px] shrink-0 rounded border border-cyan-400/60 bg-slate-950"
            />
          </div>
        </div>

        <div ref={gameWrapRef} className="relative w-full overflow-hidden bg-slate-900" />

        <div
          className="relative flex flex-col items-center justify-center border-t border-cyan-400/30 bg-slate-950"
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
          <div className="mb-2 text-xs font-black text-cyan-200">Joystick • Chase ⭐ answer fish</div>
          <div className="relative h-32 w-32 rounded-full border-4 border-cyan-400/60 bg-cyan-300/10 shadow-[0_0_35px_rgba(34,211,238,0.25)]">
            <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30 bg-white/10" />
            <div data-joy-knob className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-cyan-300 bg-white/40 shadow-xl" />
          </div>
          <div className="mt-2 text-xs font-black text-slate-300">JOYSTICK</div>
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
      {loading && (
        <div className="fixed inset-0 z-[100002] flex flex-col items-center justify-center bg-slate-950 text-white">
          <div className="text-7xl animate-bounce">{selectedMap.emoji}</div>
          <div className="mt-4 text-3xl font-black">Loading {selectedMap.name}...</div>
          <div className="mt-2 text-sm font-bold text-cyan-200">{loadStep}</div>
          <div className="mt-5 h-2 w-72 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-cyan-400" />
          </div>
        </div>
      )}

      <div className="fixed left-5 top-5 z-[100001] max-w-[440px] rounded-2xl border border-cyan-300/30 bg-slate-950/75 p-4 shadow-2xl backdrop-blur-md">
        <div className="text-sm font-black text-cyan-200">
          {selectedMap.emoji} {selectedMap.name} · Q{hud.current}/{hud.total}
        </div>
        <div className="mt-1 text-lg font-black leading-tight">{hud.question}</div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-xs font-black">
          <div>Score {hud.score}</div>
          <div className="text-green-300">HP {hud.health}</div>
          <div className="text-blue-300">Combo {hud.combo}</div>
          <div className="text-purple-300">Lv {hud.level}</div>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-800">
          <div className="h-2 rounded-full bg-green-500" style={{ width: `${healthRatio * 100}%` }} />
        </div>
        <div className="mt-2 text-xs font-bold text-slate-300">{hud.message}</div>
      </div>

      <canvas
        ref={miniMapRef}
        width={220}
        height={130}
        className="fixed bottom-5 right-5 z-[100001] h-[130px] w-[220px] rounded-xl border border-cyan-400/60 bg-slate-950/80 shadow-2xl"
      />

      <div ref={gameWrapRef} className="h-full w-full bg-slate-950" />
    </div>
  );
}
