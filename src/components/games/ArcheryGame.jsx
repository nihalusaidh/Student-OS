import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

/**
 * ArcheryGame ULTIMATE - Student OS Study Archery
 * Path: src/components/games/ArcheryGame.jsx
 *
 * Built for Student OS:
 * 1. Mobile is landscape only. Portrait shows rotate-phone screen.
 * 2. Angry Birds style drag power.
 * 3. Trajectory dots, power meter, wind indicator.
 * 4. 5 maps with different difficulty, wind, target speed, obstacles.
 * 5. Moving targets, rare golden/diamond/mystery targets.
 * 6. Powerups: Precision, Triple Arrow, Explosive Arrow, Shield.
 * 7. Boss target on final question with HP bar.
 * 8. Perfect bullseye rewards, combo system, accuracy reward.
 * 9. No EXIT button here. GameRoom should handle EXIT.
 */

const ARCHERY_MAPS = [
  {
    name: "Forest Range",
    emoji: "🌲",
    subtitle: "Beginner · apples + light obstacles",
    skyTop: 0x38bdf8,
    skyBottom: 0x86efac,
    ground: 0x166534,
    decor: ["🌲", "🌳", "🌿", "🍃", "🍎"],
    speed: 1,
    wind: 3,
    obstacle: "log",
    rewardBoost: 1,
    bossHp: 2,
  },
  {
    name: "Mountain Pass",
    emoji: "⛰️",
    subtitle: "Medium · moving targets + crosswind",
    skyTop: 0x7dd3fc,
    skyBottom: 0x64748b,
    ground: 0x475569,
    decor: ["⛰️", "🪨", "🌲", "☁️"],
    speed: 1.16,
    wind: 8,
    obstacle: "stone",
    rewardBoost: 1.18,
    bossHp: 3,
  },
  {
    name: "Desert Arena",
    emoji: "🏜️",
    subtitle: "Hard · sand wind + moving wall",
    skyTop: 0xfacc15,
    skyBottom: 0xf97316,
    ground: 0x78350f,
    decor: ["🏜️", "🌵", "🪨", "🔥"],
    speed: 1.28,
    wind: 13,
    obstacle: "wall",
    rewardBoost: 1.35,
    bossHp: 3,
  },
  {
    name: "Snow Valley",
    emoji: "❄️",
    subtitle: "Hard · fast targets + bird flock",
    skyTop: 0xe0f2fe,
    skyBottom: 0x38bdf8,
    ground: 0x0f172a,
    decor: ["❄️", "🧊", "⛄", "🪨"],
    speed: 1.42,
    wind: 11,
    obstacle: "birds",
    rewardBoost: 1.5,
    bossHp: 4,
  },
  {
    name: "Dragon Fortress",
    emoji: "🏰",
    subtitle: "Boss · fire obstacles + strong wind",
    skyTop: 0x7f1d1d,
    skyBottom: 0x020617,
    ground: 0x451a03,
    decor: ["🏰", "🔥", "🌋", "💥"],
    speed: 1.6,
    wind: 16,
    obstacle: "fire",
    rewardBoost: 1.8,
    bossHp: 5,
  },
];

export default function ArcheryGame({ questions = [], topic = "Study Topic", onReward }) {
  const gameWrapRef = useRef(null);
  const gameRef = useRef(null);
  const latestRewardRef = useRef(onReward);
  const rewardSentRef = useRef(false);

  const [selectedMapIndex, setSelectedMapIndex] = useState(0);
  const [mapSelected, setMapSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Preparing archery arena...");
  const [device, setDevice] = useState(() => getDeviceInfo());
  const [hud, setHud] = useState({
    question: "Loading...",
    score: 0,
    combo: 0,
    arrows: 0,
    health: 100,
    current: 1,
    total: Math.max(questions.length, 1),
    mapName: ARCHERY_MAPS[0].name,
    message: "Choose a map to start.",
    bossHp: 0,
    bossMaxHp: 0,
    windText: "Wind 0 →",
    powerup: "Normal Arrow",
    ended: false,
  });

  function getDeviceInfo() {
    if (typeof window === "undefined") {
      return { isMobile: false, isPortrait: false, isLandscape: true };
    }
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
    const isPortrait = window.innerHeight > window.innerWidth;
    return { isMobile: Boolean(coarse), isPortrait, isLandscape: !isPortrait };
  }

  useEffect(() => {
    latestRewardRef.current = onReward;
  }, [onReward]);

  useEffect(() => {
    const onResize = () => setDevice(getDeviceInfo());
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  useEffect(() => {
    if (!mapSelected) return;
    if (device.isMobile && device.isPortrait) return;
    if (!gameWrapRef.current || gameRef.current) return;

    const fallbackQuestions = [
      { question: `Best way to master ${topic}?`, answer: "Practice", options: ["Practice", "Skip", "Guess", "Forget"] },
      { question: `After studying ${topic}, do a?`, answer: "Quiz", options: ["Quiz", "Nap", "Scroll", "Skip"] },
      { question: `Useful revision item for ${topic}?`, answer: "Notes", options: ["Notes", "Noise", "Delay", "Luck"] },
      { question: "Both inputs 1 gives output 1?", answer: "AND", options: ["AND", "OR", "XOR", "NOT"] },
      { question: "Address storing variable?", answer: "Pointer", options: ["Pointer", "Array", "Loop", "Struct"] },
      { question: "Stores charge?", answer: "Capacitor", options: ["Capacitor", "Resistor", "Diode", "Switch"] },
      { question: "Collection of same datatype?", answer: "Array", options: ["Array", "Loop", "Pointer", "If"] },
      { question: "Exam success needs?", answer: "Revision", options: ["Revision", "Panic", "Delay", "Guess"] },
    ];

    const safeQuestions = questions?.length ? questions : fallbackQuestions;
    const GAME_W = 1280;
    const GAME_H = 720;
    const map = ARCHERY_MAPS[selectedMapIndex] || ARCHERY_MAPS[0];

    let score = 0;
    let combo = 0;
    let arrows = 0;
    let health = 100;
    let current = 0;
    let ended = false;
    let ready = false;
    let bossHp = 0;
    let bossMaxHp = 0;
    let rareTarget = null;
    let wind = 0;
    let windChangeCount = 0;
    let activePowerup = "Normal Arrow";
    let shield = 0;
    let perfectShots = 0;
    let goldenHits = 0;
    let diamondHits = 0;
    let bossDefeated = false;

    const getWindText = () => {
      if (Math.abs(wind) < 1) return "🌬 Wind: Calm";
      return `🌬 Wind: ${Math.abs(Math.round(wind))} ${wind > 0 ? "→" : "←"}`;
    };

    const syncHud = (message = "") => {
      const q = safeQuestions[Math.min(current, safeQuestions.length - 1)];
      setHud({
        question: q?.question || "Game complete",
        score,
        combo,
        arrows,
        health: Math.round(health),
        current: Math.min(current + 1, safeQuestions.length),
        total: safeQuestions.length,
        mapName: map.name,
        message,
        bossHp,
        bossMaxHp,
        windText: getWindText(),
        powerup: shield > 0 ? `${activePowerup} · Shield ${shield}` : activePowerup,
        ended,
      });
    };

    const setLoadStep = (text, delay) => setTimeout(() => setLoadingText(text), delay);

    setLoading(true);
    setLoadingText("🏹 Preparing Archery Arena...");
    setLoadStep("🎯 Loading moving answer targets...", 180);
    setLoadStep("🌬 Loading wind physics...", 360);
    setLoadStep("🪵 Loading obstacles...", 540);
    setLoadStep("⭐ Loading rare targets...", 720);
    setLoadStep("👹 Loading boss battle...", 900);

    class ArcheryScene extends Phaser.Scene {
      constructor() {
        super("StudentOSArcheryUltimate");
        this.bow = null;
        this.arrow = null;
        this.extraArrows = [];
        this.targets = [];
        this.labels = [];
        this.trajectoryDots = [];
        this.obstacles = [];
        this.powerups = [];
        this.particles = [];
        this.powerText = null;
        this.windText = null;
        this.isDragging = false;
        this.dragPoint = new Phaser.Math.Vector2(190, GAME_H - 150);
        this.canShoot = true;
        this.lastHud = 0;
        this.sandOverlay = null;
        this.slowTargetsUntil = 0;
        this.explosiveReady = false;
        this.tripleReady = false;
        this.magnetReady = false;
      }

      create() {
        this.physics.world.setBounds(0, 0, GAME_W, GAME_H);
        this.createBackground();
        this.createBow();
        this.createTrajectoryDots();
        this.createWindSystem();
        this.createQuestionTargets();
        this.createObstacles();
        this.createRareTargetTimer();
        this.createPowerupTimer();

        this.input.on("pointerdown", (pointer) => this.startDrag(pointer));
        this.input.on("pointermove", (pointer) => this.updateDrag(pointer));
        this.input.on("pointerup", () => this.releaseArrow());

        this.time.delayedCall(device.isMobile ? 420 : 650, () => {
          ready = true;
          setLoading(false);
          syncHud("Pull back from the bow, aim with wind, release.");
        });
      }

      update(time) {
        if (!ready || ended) return;
        this.applyWindToArrows();
        this.moveTargets(time);
        this.moveObstacles(time);
        this.moveRareTarget(time);
        this.updateArrowRotation(this.arrow);
        this.extraArrows.forEach((a) => this.updateArrowRotation(a));
        this.checkTargetHits();
        this.checkRareHit();
        this.checkPowerupHit();
        this.checkObstacleHits();
        this.checkArrowOut();

        if (time - this.lastHud > 220) {
          syncHud(this.isDragging ? "Release to shoot." : "Drag backward like Angry Birds. Watch the wind.");
          this.lastHud = time;
        }
      }

      createBackground() {
        const g = this.add.graphics();
        g.fillGradientStyle(map.skyTop, map.skyTop, map.skyBottom, map.skyBottom, 1);
        g.fillRect(0, 0, GAME_W, GAME_H);

        for (let i = 0; i < 18; i++) {
          const cloud = this.add.ellipse(
            Phaser.Math.Between(80, GAME_W - 80),
            Phaser.Math.Between(42, 178),
            Phaser.Math.Between(70, 170),
            Phaser.Math.Between(20, 48),
            0xffffff,
            Phaser.Math.FloatBetween(0.12, 0.3)
          ).setDepth(1);
          this.tweens.add({
            targets: cloud,
            x: cloud.x + Phaser.Math.Between(-80, 80),
            duration: Phaser.Math.Between(4000, 7500),
            yoyo: true,
            repeat: -1,
          });
        }

        this.add.ellipse(GAME_W * 0.38, GAME_H - 36, GAME_W * 0.86, 130, map.ground, 0.9).setDepth(2);
        this.add.rectangle(GAME_W / 2, GAME_H - 42, GAME_W, 95, map.ground, 0.97).setDepth(3);

        for (let i = 0; i < 24; i++) {
          this.add.text(
            Phaser.Math.Between(24, GAME_W - 38),
            Phaser.Math.Between(GAME_H - 126, GAME_H - 54),
            map.decor[Phaser.Math.Between(0, map.decor.length - 1)],
            { fontSize: Phaser.Math.Between(24, 54) + "px" }
          ).setDepth(4);
        }

        if (map.name === "Desert Arena") this.createSandstormOverlay();
        if (map.name === "Dragon Fortress") this.createFireSky();
        if (map.name === "Snow Valley") this.createSnow();

        this.add.text(GAME_W - 28, 22, `${map.emoji} ${map.name}`, {
          fontSize: "24px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 5,
        }).setOrigin(1, 0).setDepth(20);
      }

      createSandstormOverlay() {
        this.sandOverlay = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0xf59e0b, 0.08).setDepth(12);
        this.tweens.add({ targets: this.sandOverlay, alpha: 0.24, duration: 1500, yoyo: true, repeat: -1 });
        for (let i = 0; i < 34; i++) {
          const dust = this.add.circle(Phaser.Math.Between(0, GAME_W), Phaser.Math.Between(0, GAME_H), Phaser.Math.Between(2, 6), 0xfbbf24, 0.24).setDepth(13);
          this.tweens.add({ targets: dust, x: dust.x + 420, y: dust.y + 40, duration: Phaser.Math.Between(2200, 4000), repeat: -1, onRepeat: () => { dust.x = -20; dust.y = Phaser.Math.Between(40, GAME_H - 80); } });
        }
      }

      createFireSky() {
        for (let i = 0; i < 16; i++) {
          const ember = this.add.circle(Phaser.Math.Between(0, GAME_W), Phaser.Math.Between(80, GAME_H - 100), Phaser.Math.Between(3, 8), 0xf97316, 0.48).setDepth(12);
          this.tweens.add({ targets: ember, y: ember.y - 140, alpha: 0, duration: Phaser.Math.Between(1300, 2600), repeat: -1, onRepeat: () => { ember.y = GAME_H - 90; ember.x = Phaser.Math.Between(0, GAME_W); ember.alpha = 0.48; } });
        }
      }

      createSnow() {
        for (let i = 0; i < 32; i++) {
          const snow = this.add.text(Phaser.Math.Between(0, GAME_W), Phaser.Math.Between(0, GAME_H), "❄", { fontSize: Phaser.Math.Between(12, 22) + "px" }).setDepth(12).setAlpha(0.65);
          this.tweens.add({ targets: snow, y: snow.y + GAME_H, x: snow.x + Phaser.Math.Between(-80, 80), duration: Phaser.Math.Between(4500, 8000), repeat: -1, onRepeat: () => { snow.y = -30; snow.x = Phaser.Math.Between(0, GAME_W); } });
        }
      }

      createBow() {
        this.bow = this.add.container(178, GAME_H - 150).setDepth(45);
        const arc = this.add.arc(0, 0, 85, -68, 68, false, 0x78350f, 1);
        arc.setStrokeStyle(13, 0x78350f, 1);
        const string = this.add.line(0, 0, 35, -78, 35, 78, 0xffffff, 0.95).setLineWidth(3);
        const grip = this.add.rectangle(35, 0, 22, 60, 0x92400e, 1);
        const glow = this.add.circle(24, 0, 70, 0xfacc15, 0.06);
        this.bow.add([glow, arc, string, grip]);

        this.arrow = this.createArrow(212, GAME_H - 150);
        this.arrow.setVisible(false);

        this.powerText = this.add.text(178, GAME_H - 255, "POWER 0%", {
          fontSize: "22px",
          color: "#facc15",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 5,
        }).setOrigin(0.5).setDepth(90).setVisible(false);
      }

      createArrow(x, y, tint = 0xf8fafc) {
        const arrow = this.add.container(x, y).setDepth(75);
        arrow.add(this.add.rectangle(0, 0, 86, 6, tint));
        arrow.add(this.add.triangle(48, 0, 0, -13, 0, 13, 28, 0, 0xf97316));
        arrow.add(this.add.triangle(-44, -8, 0, 0, 18, 8, 0, 16, 0x38bdf8));
        arrow.add(this.add.triangle(-44, 8, 0, 0, 18, -8, 0, -16, 0x38bdf8));
        this.physics.add.existing(arrow);
        arrow.body.setSize(90, 18);
        arrow.body.setAllowGravity(false);
        arrow.body.setCollideWorldBounds(false);
        arrow.hasHit = false;
        arrow.isExtra = false;
        return arrow;
      }

      createTrajectoryDots() {
        for (let i = 0; i < 10; i++) {
          const dot = this.add.circle(0, 0, 5, 0xffffff, 0.75).setDepth(66).setVisible(false);
          this.trajectoryDots.push(dot);
        }
      }

      createWindSystem() {
        this.changeWind();
        this.time.addEvent({ delay: 9000, loop: true, callback: () => this.changeWind() });
      }

      changeWind() {
        windChangeCount += 1;
        const strength = map.wind || 0;
        const direction = windChangeCount % 2 === 0 ? 1 : -1;
        wind = Phaser.Math.Between(Math.max(1, strength - 5), strength + 4) * direction;
        if (map.name === "Forest Range") wind = Phaser.Math.Between(-3, 3);
        this.centerMessage(getWindText(), "#38bdf8", 900);
        syncHud("Wind changed. Adjust your aim.");
      }

      shuffleOptions(options) {
        const arr = [...options];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Phaser.Math.Between(0, i);
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      }

      createQuestionTargets() {
        if (current >= safeQuestions.length) return this.endGame("Archery round complete!");

        this.targets.forEach((target) => target.destroy());
        this.labels.forEach((label) => label.destroy());
        this.targets = [];
        this.labels = [];

        const q = safeQuestions[current];
        const options = this.shuffleOptions([...new Set([...(q.options || []), q.answer])]).slice(0, 4);
        const finalRound = current === safeQuestions.length - 1;

        if (finalRound) {
          bossMaxHp = map.bossHp || 3;
          bossHp = bossMaxHp;
        } else {
          bossMaxHp = 0;
          bossHp = 0;
        }

        const ySlots = [140, 250, 365, 480];
        options.forEach((answer, index) => {
          const correct = String(answer).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
          const x = Phaser.Math.Between(GAME_W - 395, GAME_W - 155);
          const y = ySlots[index] || Phaser.Math.Between(130, GAME_H - 170);
          const target = this.createTarget(x, y, correct, finalRound && correct);
          target.answer = answer;
          target.correct = correct;
          target.isBoss = finalRound && correct;
          target.baseX = x;
          target.baseY = y;
          target.movePhase = Phaser.Math.FloatBetween(0, Math.PI * 2);
          target.moveSpeed = Phaser.Math.FloatBetween(0.85, 1.55) * map.speed;
          target.setDepth(correct ? 55 : 45);

          const label = this.add.text(x, y + (target.isBoss ? 86 : 62), answer, {
            fontSize: target.isBoss ? "25px" : "22px",
            color: "#ffffff",
            fontFamily: "Arial",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 5,
          }).setOrigin(0.5).setDepth(78);

          target.label = label;
          this.labels.push(label);
          this.targets.push(target);
        });

        syncHud(finalRound ? `Final question: Boss Target HP ${bossHp}/${bossMaxHp}` : "Hit the correct answer target.");
      }

      createTarget(x, y, correct, boss = false) {
        const target = this.add.container(x, y);
        const size = boss ? 1.38 : 1;
        const outerColor = boss ? 0x111827 : correct ? 0x22c55e : 0xef4444;
        const midColor = correct ? 0xfacc15 : 0xffffff;
        const centerColor = boss ? 0xf97316 : correct ? 0x22c55e : 0xef4444;

        target.add(this.add.circle(0, 0, 52 * size, outerColor, 0.95));
        target.add(this.add.circle(0, 0, 40 * size, 0xffffff, 1));
        target.add(this.add.circle(0, 0, 28 * size, midColor, 1));
        target.add(this.add.circle(0, 0, 14 * size, centerColor, 1));
        target.add(this.add.circle(0, 0, 5 * size, 0x020617, 1));

        if (correct) {
          target.add(this.add.text(0, -72 * size, boss ? "👹 BOSS" : "⭐", { fontSize: boss ? "25px" : "30px", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5));
        }

        if (boss) target.add(this.add.text(0, 0, "🛡️", { fontSize: "30px" }).setOrigin(0.5));

        target.setSize(104 * size, 104 * size);
        this.physics.add.existing(target);
        target.body.setCircle(52 * size);
        target.body.setAllowGravity(false);

        if (correct) {
          this.tweens.add({ targets: target, scaleX: 1.08, scaleY: 1.08, duration: 600, yoyo: true, repeat: -1 });
        }

        return target;
      }

      createObstacles() {
        this.obstacles.forEach((o) => o.destroy());
        this.obstacles = [];

        if (map.obstacle === "stone") {
          for (let i = 0; i < 2; i++) this.addObstacle("stone", 590 + i * 160, GAME_H - 170 - i * 110);
        } else if (map.obstacle === "wall") {
          this.addObstacle("wall", 700, 350);
        } else if (map.obstacle === "birds") {
          for (let i = 0; i < 3; i++) this.addObstacle("bird", 520 + i * 160, 150 + i * 90);
        } else if (map.obstacle === "fire") {
          this.addObstacle("fire", 650, 430);
          this.addObstacle("wall", 780, 240);
        } else {
          this.addObstacle("log", 650, GAME_H - 185);
        }
      }

      addObstacle(type, x, y) {
        const obstacle = this.add.container(x, y).setDepth(50);
        obstacle.kind = type;
        obstacle.baseX = x;
        obstacle.baseY = y;
        obstacle.phase = Phaser.Math.FloatBetween(0, Math.PI * 2);

        if (type === "stone") {
          obstacle.add(this.add.rectangle(0, 0, 65, 190, 0x475569, 0.96));
          obstacle.add(this.add.text(0, 0, "🪨", { fontSize: "58px" }).setOrigin(0.5));
          obstacle.hitRadius = 78;
        } else if (type === "wall") {
          obstacle.add(this.add.rectangle(0, 0, 80, 250, 0x78350f, 0.96));
          obstacle.add(this.add.text(0, -65, "🪵", { fontSize: "52px" }).setOrigin(0.5));
          obstacle.hitRadius = 95;
        } else if (type === "bird") {
          obstacle.add(this.add.text(0, 0, "🦅", { fontSize: "48px" }).setOrigin(0.5));
          obstacle.hitRadius = 42;
        } else if (type === "fire") {
          obstacle.add(this.add.circle(0, 0, 48, 0xef4444, 0.2));
          obstacle.add(this.add.text(0, 0, "🔥", { fontSize: "58px" }).setOrigin(0.5));
          obstacle.hitRadius = 58;
        } else {
          obstacle.add(this.add.rectangle(0, 0, 150, 36, 0x92400e, 0.96));
          obstacle.add(this.add.text(0, -6, "🪵", { fontSize: "48px" }).setOrigin(0.5));
          obstacle.hitRadius = 76;
        }

        this.physics.add.existing(obstacle);
        obstacle.body.setCircle(obstacle.hitRadius);
        obstacle.body.setAllowGravity(false);
        this.obstacles.push(obstacle);
      }

      moveObstacles(time) {
        this.obstacles.forEach((o) => {
          if (!o.active) return;
          if (o.kind === "log") o.angle = Math.sin(time / 500 + o.phase) * 18;
          if (o.kind === "wall") o.y = o.baseY + Math.sin(time / 720 + o.phase) * 92;
          if (o.kind === "bird") {
            o.x = o.baseX + Math.sin(time / 560 + o.phase) * 310;
            o.y = o.baseY + Math.sin(time / 370 + o.phase) * 34;
          }
          if (o.kind === "fire") o.y = o.baseY + Math.sin(time / 380 + o.phase) * 42;
        });
      }

      createRareTargetTimer() {
        this.time.addEvent({
          delay: 13000,
          loop: true,
          callback: () => {
            if (!ready || ended || rareTarget?.active) return;
            this.spawnRareTarget();
          },
        });
      }

      spawnRareTarget() {
        const roll = Phaser.Math.Between(1, 100);
        const type = roll > 84 ? "diamond" : roll > 62 ? "mystery" : "golden";
        const data = {
          golden: { emoji: "⭐", label: "Golden Target", color: 0xfacc15, score: 25, coins: 10 },
          diamond: { emoji: "💎", label: "Diamond Target", color: 0x60a5fa, score: 50, coins: 25 },
          mystery: { emoji: "🎁", label: "Mystery Target", color: 0xa855f7, score: 35, coins: 15 },
        }[type];

        rareTarget = this.add.container(Phaser.Math.Between(GAME_W - 500, GAME_W - 145), Phaser.Math.Between(105, GAME_H - 190)).setDepth(88);
        rareTarget.rare = data;
        rareTarget.baseY = rareTarget.y;
        rareTarget.phase = Phaser.Math.FloatBetween(0, Math.PI * 2);
        rareTarget.add(this.add.circle(0, 0, 44, data.color, 0.95));
        rareTarget.add(this.add.circle(0, 0, 30, 0xffffff, 1));
        rareTarget.add(this.add.circle(0, 0, 17, data.color, 1));
        rareTarget.add(this.add.text(0, -62, data.emoji, { fontSize: "32px" }).setOrigin(0.5));
        this.physics.add.existing(rareTarget);
        rareTarget.body.setCircle(46);
        rareTarget.body.setAllowGravity(false);
        this.centerMessage(`${data.emoji} ${data.label} appeared!`, "#facc15");
        this.tweens.add({ targets: rareTarget, scaleX: 1.18, scaleY: 1.18, duration: 450, yoyo: true, repeat: -1 });
        this.time.delayedCall(7200, () => {
          if (rareTarget?.active) {
            rareTarget.destroy();
            rareTarget = null;
          }
        });
      }

      moveRareTarget(time) {
        if (!rareTarget?.active) return;
        rareTarget.y = rareTarget.baseY + Math.sin(time / 410 + rareTarget.phase) * 78;
        rareTarget.x += Math.sin(time / 510 + rareTarget.phase) * 0.7;
      }

      createPowerupTimer() {
        this.time.addEvent({ delay: 15500, loop: true, callback: () => { if (!ready || ended) return; this.spawnPowerup(); } });
      }

      spawnPowerup() {
        if (this.powerups.length > 2) return;
        const types = [
          { name: "Precision Arrow", icon: "🎯", color: 0x22c55e },
          { name: "Triple Arrow", icon: "🏹", color: 0x38bdf8 },
          { name: "Explosive Arrow", icon: "💥", color: 0xf97316 },
          { name: "Shield", icon: "🛡️", color: 0xa855f7 },
        ];
        const data = types[Phaser.Math.Between(0, types.length - 1)];
        const p = this.add.container(Phaser.Math.Between(380, GAME_W - 330), Phaser.Math.Between(100, GAME_H - 210)).setDepth(82);
        p.power = data;
        p.baseY = p.y;
        p.phase = Phaser.Math.FloatBetween(0, Math.PI * 2);
        p.add(this.add.circle(0, 0, 34, data.color, 0.86));
        p.add(this.add.text(0, 0, data.icon, { fontSize: "28px" }).setOrigin(0.5));
        this.physics.add.existing(p);
        p.body.setCircle(36);
        p.body.setAllowGravity(false);
        this.powerups.push(p);
        this.tweens.add({ targets: p, scaleX: 1.18, scaleY: 1.18, duration: 600, yoyo: true, repeat: -1 });
        this.time.delayedCall(8500, () => { if (p.active) { p.destroy(); this.powerups = this.powerups.filter((x) => x !== p); } });
      }

      startDrag(pointer) {
        if (!ready || ended || !this.canShoot) return;
        const distanceFromBow = Phaser.Math.Distance.Between(pointer.x, pointer.y, 178, GAME_H - 150);
        if (distanceFromBow > 190 && !device.isMobile) return;
        this.isDragging = true;
        this.dragPoint.set(pointer.x, pointer.y);
        this.arrow.setPosition(212, GAME_H - 150);
        this.arrow.body.setVelocity(0, 0);
        this.arrow.setVisible(true);
        this.arrow.body.setEnable(false);
        this.powerText.setVisible(true);
        this.showTrajectory(pointer);
      }

      updateDrag(pointer) {
        if (!this.isDragging) return;
        this.dragPoint.set(pointer.x, pointer.y);
        this.showTrajectory(pointer);
      }

      getShotData(pointer = null) {
        const px = pointer ? pointer.x : this.dragPoint.x;
        const py = pointer ? pointer.y : this.dragPoint.y;
        const anchor = new Phaser.Math.Vector2(194, GAME_H - 150);
        const drag = new Phaser.Math.Vector2(px - anchor.x, py - anchor.y);
        const maxDrag = device.isMobile ? 210 : 235;
        const len = Phaser.Math.Clamp(drag.length(), 0, maxDrag);
        const angle = Math.atan2(drag.y, drag.x);
        const clamped = new Phaser.Math.Vector2(Math.cos(angle) * len, Math.sin(angle) * len);
        const power = len / maxDrag;
        const velocity = new Phaser.Math.Vector2(-clamped.x * 5.45, -clamped.y * 5.45);
        velocity.x = Phaser.Math.Clamp(velocity.x, 310, 1280);
        velocity.y = Phaser.Math.Clamp(velocity.y, -970, 640);
        return { anchor, clamped, power, velocity };
      }

      showTrajectory(pointer) {
        const { anchor, clamped, power, velocity } = this.getShotData(pointer);
        const pullX = anchor.x + clamped.x;
        const pullY = anchor.y + clamped.y;
        this.arrow.setPosition(pullX + 24, pullY);
        this.arrow.rotation = Math.atan2(velocity.y, velocity.x);
        this.powerText.setText(`${activePowerup.toUpperCase()} · POWER ${Math.round(power * 100)}%`);
        this.powerText.setColor(power > 0.72 ? "#22c55e" : power > 0.38 ? "#facc15" : "#f97316");

        const gravity = 520;
        const windAccel = wind * 18;
        this.trajectoryDots.forEach((dot, i) => {
          const t = (i + 1) * 0.13;
          const x = anchor.x + velocity.x * t + 0.5 * windAccel * t * t;
          const y = anchor.y + velocity.y * t + 0.5 * gravity * t * t;
          dot.setPosition(x, y).setVisible(x > 0 && x < GAME_W && y > 0 && y < GAME_H);
          dot.setAlpha(1 - i * 0.075);
          dot.setFillStyle(activePowerup === "Explosive Arrow" ? 0xf97316 : activePowerup === "Precision Arrow" ? 0x22c55e : 0xffffff, 0.75);
        });
      }

      releaseArrow() {
        if (!this.isDragging || !this.canShoot) return;
        const { anchor, power, velocity } = this.getShotData();
        if (power < 0.08) return this.resetArrow();

        this.isDragging = false;
        this.canShoot = false;
        arrows += 1;
        this.trajectoryDots.forEach((dot) => dot.setVisible(false));
        this.powerText.setVisible(false);

        const tint = activePowerup === "Explosive Arrow" ? 0xf97316 : activePowerup === "Precision Arrow" ? 0x22c55e : 0xf8fafc;
        this.prepareArrow(this.arrow, anchor.x + 24, anchor.y, velocity.x, velocity.y, tint);

        if (activePowerup === "Triple Arrow") {
          const a1 = this.createArrow(anchor.x + 24, anchor.y - 18, 0x38bdf8);
          const a2 = this.createArrow(anchor.x + 24, anchor.y + 18, 0x38bdf8);
          a1.isExtra = true;
          a2.isExtra = true;
          this.prepareArrow(a1, anchor.x + 24, anchor.y - 18, velocity.x, velocity.y - 85, 0x38bdf8);
          this.prepareArrow(a2, anchor.x + 24, anchor.y + 18, velocity.x, velocity.y + 85, 0x38bdf8);
          this.extraArrows.push(a1, a2);
        }

        if (activePowerup === "Precision Arrow") this.slowTargetsUntil = this.time.now + 5200;
        this.explosiveReady = activePowerup === "Explosive Arrow";
        this.tripleReady = activePowerup === "Triple Arrow";
        this.magnetReady = activePowerup === "Precision Arrow";
        activePowerup = "Normal Arrow";
        syncHud("Arrow released!");
      }

      prepareArrow(arrow, x, y, vx, vy, tint) {
        arrow.setPosition(x, y);
        arrow.setVisible(true);
        arrow.body.setEnable(true);
        arrow.body.setAllowGravity(true);
        arrow.body.setGravityY(520);
        arrow.body.setVelocity(vx, vy);
        arrow.rotation = Math.atan2(vy, vx);
        arrow.hasHit = false;
        arrow.list?.forEach((child) => child.setFillStyle?.(tint));
      }

      resetArrow() {
        this.isDragging = false;
        this.canShoot = true;
        this.arrow.setVisible(false);
        this.arrow.body.setEnable(false);
        this.arrow.body.setVelocity(0, 0);
        this.arrow.body.setAllowGravity(false);
        this.extraArrows.forEach((a) => a.destroy());
        this.extraArrows = [];
        this.trajectoryDots.forEach((dot) => dot.setVisible(false));
        this.powerText.setVisible(false);
      }

      applyWindToArrows() {
        const arrowsList = [this.arrow, ...this.extraArrows].filter((a) => a?.visible && a?.body?.enable);
        arrowsList.forEach((a) => {
          a.body.velocity.x += wind * 0.06;
          if (this.magnetReady) this.applyMagnet(a);
        });
      }

      applyMagnet(arrow) {
        const correct = this.targets.find((t) => t.active && t.correct);
        if (!correct) return;
        const d = Phaser.Math.Distance.Between(arrow.x, arrow.y, correct.x, correct.y);
        if (d > 250) return;
        const angle = Phaser.Math.Angle.Between(arrow.x, arrow.y, correct.x, correct.y);
        arrow.body.velocity.x += Math.cos(angle) * 4;
        arrow.body.velocity.y += Math.sin(angle) * 4;
      }

      updateArrowRotation(arrow) {
        if (!arrow?.visible || !arrow.body?.enable) return;
        const vx = arrow.body.velocity.x;
        const vy = arrow.body.velocity.y;
        arrow.rotation = Math.atan2(vy, vx);
      }

      moveTargets(time) {
        const slow = time < this.slowTargetsUntil ? 0.45 : 1;
        this.targets.forEach((target) => {
          if (!target.active) return;
          const ampY = target.isBoss ? 86 : 52;
          const ampX = target.isBoss ? 22 : 12;
          target.y = target.baseY + Math.sin(time / 690 * target.moveSpeed * slow + target.movePhase) * ampY;
          target.x = target.baseX + Math.sin(time / 900 * target.moveSpeed * slow + target.movePhase) * ampX;
          if (target.label) {
            target.label.x = target.x;
            target.label.y = target.y + (target.isBoss ? 86 : 62);
          }
        });
      }

      checkTargetHits() {
        const arrowsList = [this.arrow, ...this.extraArrows].filter((a) => a?.visible && a?.body?.enable && !a.hasHit);
        arrowsList.forEach((arrow) => {
          this.targets.forEach((target) => {
            if (!target.active || arrow.hasHit) return;
            const d = Phaser.Math.Distance.Between(arrow.x, arrow.y, target.x, target.y);
            if (d < (target.isBoss ? 76 : 58)) {
              arrow.hasHit = true;
              target.correct ? this.hitCorrect(target, d, arrow) : this.hitWrong(target, arrow);
            }
          });
        });
      }

      checkRareHit() {
        if (!rareTarget?.active) return;
        const arrowsList = [this.arrow, ...this.extraArrows].filter((a) => a?.visible && a?.body?.enable && !a.hasHit);
        arrowsList.forEach((arrow) => {
          const d = Phaser.Math.Distance.Between(arrow.x, arrow.y, rareTarget.x, rareTarget.y);
          if (d < 56) {
            arrow.hasHit = true;
            const data = rareTarget.rare;
            score += data.score;
            combo += 1;
            if (data.label.includes("Golden")) goldenHits += 1;
            if (data.label.includes("Diamond")) diamondHits += 1;
            if (data.label.includes("Mystery")) {
              const prizes = ["Precision Arrow", "Triple Arrow", "Explosive Arrow", "Shield"];
              const prize = prizes[Phaser.Math.Between(0, prizes.length - 1)];
              this.activatePowerup(prize);
            }
            this.centerMessage(`${data.emoji} ${data.label}! +${data.score}`, "#facc15");
            this.floatText(rareTarget.x, rareTarget.y - 55, `+${data.score}`, "#facc15");
            rareTarget.destroy();
            rareTarget = null;
            this.resetArrow();
            syncHud("Rare target collected. Continue question.");
          }
        });
      }

      checkPowerupHit() {
        const arrowsList = [this.arrow, ...this.extraArrows].filter((a) => a?.visible && a?.body?.enable && !a.hasHit);
        arrowsList.forEach((arrow) => {
          this.powerups.forEach((p) => {
            if (!p.active || arrow.hasHit) return;
            const d = Phaser.Math.Distance.Between(arrow.x, arrow.y, p.x, p.y);
            if (d < 48) {
              arrow.hasHit = true;
              this.activatePowerup(p.power.name);
              this.centerMessage(`${p.power.icon} ${p.power.name} ready!`, "#38bdf8");
              p.destroy();
              this.powerups = this.powerups.filter((x) => x !== p);
              this.resetArrow();
              syncHud(`${p.power.name} activated for your next shot.`);
            }
          });
        });
      }

      activatePowerup(name) {
        if (name === "Shield") shield = Math.min(3, shield + 1);
        else activePowerup = name;
      }

      checkObstacleHits() {
        const arrowsList = [this.arrow, ...this.extraArrows].filter((a) => a?.visible && a?.body?.enable && !a.hasHit);
        arrowsList.forEach((arrow) => {
          this.obstacles.forEach((o) => {
            if (!o.active || arrow.hasHit) return;
            const d = Phaser.Math.Distance.Between(arrow.x, arrow.y, o.x, o.y);
            if (d < o.hitRadius) {
              arrow.hasHit = true;
              if (shield > 0) {
                shield -= 1;
                this.centerMessage("SHIELD BLOCKED OBSTACLE!", "#38bdf8");
                this.resetArrow();
                return;
              }
              health = Math.max(0, health - 12);
              combo = 0;
              this.centerMessage("OBSTACLE HIT!", "#ef4444");
              this.cameras.main.shake(120, 0.004);
              this.resetArrow();
              if (health <= 0) this.endGame("Obstacles ended your archery run.");
            }
          });
        });
      }

      hitCorrect(target, distance, arrow) {
        const boost = map.rewardBoost || 1;
        const bullseye = distance < (target.isBoss ? 20 : 16);
        const nearCenter = distance < (target.isBoss ? 38 : 30);

        if (target.isBoss && bossHp > 1) {
          bossHp -= 1;
          const bossChip = Math.round((bullseye ? 18 : 10) * boost);
          score += bossChip;
          this.centerMessage(bullseye ? "PERFECT BOSS HIT!" : "BOSS HIT!", bullseye ? "#facc15" : "#f97316", 1000);
          this.floatText(target.x, target.y - 64, `-${1} HP +${bossChip}`, "#f97316");
          this.makeHitBurst(target.x, target.y, 0xf97316);
          this.resetArrow();
          syncHud(`Boss HP ${bossHp}/${bossMaxHp}. Keep shooting.`);
          return;
        }

        let gained = Math.round((16 + combo * 4 + (target.isBoss ? 45 : 0)) * boost);
        if (nearCenter) gained += 8;
        if (bullseye) {
          gained += 18;
          perfectShots += 1;
        }
        if (this.explosiveReady) {
          gained += 16;
          this.explodeAt(target.x, target.y);
        }

        score += gained;
        combo += 1;
        if (target.isBoss) bossDefeated = true;

        const msg = target.isBoss ? "👹 BOSS DEFEATED!" : bullseye ? "🎯 PERFECT SHOT!" : combo >= 3 ? `COMBO x${combo}!` : "CORRECT HIT!";
        this.centerMessage(msg, bullseye || target.isBoss ? "#facc15" : "#22c55e");
        this.floatText(target.x, target.y - 60, `+${gained}`, "#22c55e");
        this.makeHitBurst(target.x, target.y, bullseye ? 0xfacc15 : 0x22c55e);

        target.label?.destroy();
        target.destroy();
        current += 1;
        this.resetArrow();
        this.explosiveReady = false;
        this.magnetReady = false;

        this.time.delayedCall(500, () => {
          current >= safeQuestions.length ? this.endGame("Archery round complete!") : this.createQuestionTargets();
        });
      }

      hitWrong(target, arrow) {
        if (this.explosiveReady) {
          this.explodeAt(target.x, target.y);
        }
        score = Math.max(0, score - 6);
        health = Math.max(0, health - 10);
        combo = 0;
        this.centerMessage("WRONG TARGET!", "#ef4444");
        this.floatText(target.x, target.y - 55, "-6", "#ef4444");
        this.cameras.main.shake(130, 0.004);
        target.label?.destroy();
        target.destroy();
        this.resetArrow();
        this.explosiveReady = false;
        this.magnetReady = false;
        syncHud("Wrong answer. Aim for the correct option.");
        if (health <= 0) this.endGame("Too many wrong targets.");
      }

      explodeAt(x, y) {
        this.centerMessage("💥 EXPLOSIVE SHOT!", "#f97316", 900);
        const ring = this.add.circle(x, y, 20, 0xf97316, 0.24).setDepth(140);
        this.tweens.add({ targets: ring, radius: 120, alpha: 0, duration: 450, onComplete: () => ring.destroy() });
        this.makeHitBurst(x, y, 0xf97316);
      }

      makeHitBurst(x, y, color) {
        for (let i = 0; i < 14; i++) {
          const p = this.add.circle(x, y, Phaser.Math.Between(3, 7), color, 0.9).setDepth(145);
          this.tweens.add({ targets: p, x: x + Phaser.Math.Between(-75, 75), y: y + Phaser.Math.Between(-75, 75), alpha: 0, duration: Phaser.Math.Between(350, 720), onComplete: () => p.destroy() });
        }
      }

      checkArrowOut() {
        const arrowsList = [this.arrow, ...this.extraArrows].filter((a) => a?.visible && a?.body?.enable);
        if (!arrowsList.length) return;
        const allOut = arrowsList.every((a) => a.x > GAME_W + 90 || a.y > GAME_H + 90 || a.y < -130 || a.x < -100);
        if (allOut) {
          combo = 0;
          this.centerMessage("MISSED!", "#f97316");
          this.resetArrow();
          this.explosiveReady = false;
          this.magnetReady = false;
          syncHud("Missed shot. Pull stronger or adjust for wind.");
        }
      }

      floatText(x, y, text, color) {
        const item = this.add.text(x, y, text, {
          fontSize: "28px",
          color,
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 5,
        }).setOrigin(0.5).setDepth(160);
        this.tweens.add({ targets: item, y: y - 50, alpha: 0, duration: 780, onComplete: () => item.destroy() });
      }

      centerMessage(text, color, duration = 920) {
        const item = this.add.text(GAME_W / 2, 88, text, {
          fontSize: device.isMobile ? "30px" : "36px",
          color,
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 6,
        }).setOrigin(0.5).setDepth(180);
        this.tweens.add({ targets: item, y: 46, alpha: 0, duration, onComplete: () => item.destroy() });
      }

      endGame(reason = "Game complete!") {
        if (ended) return;
        ended = true;
        const accuracy = arrows > 0 ? Math.round((current / arrows) * 100) : 0;
        const accuracyBonus = arrows > 0 ? Math.round((current / arrows) * 25) : 0;
        const xp = Math.max(35, Math.round(score * 0.72 + accuracyBonus + perfectShots * 8 + goldenHits * 8 + diamondHits * 15 + (bossDefeated ? 30 : 0)));
        const coins = Math.max(12, Math.round(score / 8 + goldenHits * 10 + diamondHits * 25 + (bossDefeated ? 18 : 0)));

        const panel = this.add.container(GAME_W / 2, GAME_H / 2).setDepth(500);
        const bg = this.add.rectangle(0, 0, 710, 360, 0x0f172a, 0.97);
        bg.setStrokeStyle(3, 0xfacc15, 0.8);
        const title = this.add.text(0, -132, "🏹 ARCHERY COMPLETE", { fontSize: "36px", color: "#ffffff", fontFamily: "Arial", fontStyle: "bold", stroke: "#000000", strokeThickness: 6 }).setOrigin(0.5);
        const reasonText = this.add.text(0, -72, reason, { fontSize: "20px", color: "#facc15", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5);
        const scoreText = this.add.text(0, -12, `Score: ${score} · Accuracy: ${accuracy}% · Combo: ${combo}`, { fontSize: "20px", color: "#38bdf8", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5);
        const bonusText = this.add.text(0, 50, `Perfect: ${perfectShots} · Golden: ${goldenHits} · Diamond: ${diamondHits} · Boss: ${bossDefeated ? "Defeated" : "No"}`, { fontSize: "18px", color: "#cbd5e1", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5);
        const rewardText = this.add.text(0, 112, `Reward: +${xp} XP · +${coins} Coins`, { fontSize: "22px", color: "#22c55e", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5);
        panel.add([bg, title, reasonText, scoreText, bonusText, rewardText]);

        syncHud("Game complete. Tap EXIT in GameRoom.");

        if (!rewardSentRef.current && typeof latestRewardRef.current === "function") {
          rewardSentRef.current = true;
          latestRewardRef.current({
            xp,
            coins,
            score: current,
            total: safeQuestions.length,
            gameName: "Archery Ultimate",
            mode: "archery-ultimate-landscape",
          });
        }
      }
    }

    const config = {
      type: device.isMobile ? Phaser.CANVAS : Phaser.AUTO,
      parent: gameWrapRef.current,
      width: GAME_W,
      height: GAME_H,
      backgroundColor: "#0f172a",
      scene: ArcheryScene,
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
        antialias: !device.isMobile,
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
  }, [mapSelected, selectedMapIndex, questions, topic, device.isMobile, device.isPortrait]);

  const startMap = (index) => {
    const map = ARCHERY_MAPS[index] || ARCHERY_MAPS[0];
    setSelectedMapIndex(index);
    setLoading(true);
    setLoadingText(`${map.emoji} Loading ${map.name}...`);
    setMapSelected(true);
  };

  const LoadingOverlay = () => (
    <div className="absolute inset-0 z-[100000] flex flex-col items-center justify-center bg-slate-950 text-white">
      <div className="text-7xl animate-bounce">🏹</div>
      <div className="mt-5 text-2xl font-black">Loading Archery Arena</div>
      <div className="mt-2 text-sm font-bold text-yellow-200">{loadingText}</div>
      <div className="mt-6 h-3 w-72 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full w-2/3 animate-pulse rounded-full bg-yellow-400" />
      </div>
      <div className="mt-4 text-xs font-semibold text-slate-400">Loading wind, obstacles, rare targets, powerups and boss battle.</div>
    </div>
  );

  const RotatePhoneScreen = () => (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
      <div className="text-7xl">📱↔️</div>
      <div className="mt-5 text-3xl font-black">Rotate Your Phone</div>
      <div className="mt-3 max-w-sm text-sm font-bold text-yellow-200">
        Archery is landscape-only on mobile for better aiming, drag power, and target visibility.
      </div>
    </div>
  );

  const MapSelectScreen = () => (
    <div
      className="fixed inset-0 z-[99999] bg-slate-950 text-white"
      style={{ width: "100dvw", height: "100dvh", overflow: "hidden" }}
    >
      {device.isMobile && device.isPortrait ? (
        <RotatePhoneScreen />
      ) : (
        <div className="flex h-full flex-col px-4 py-4">
          <div className="text-center">
            <div className="text-2xl font-black sm:text-4xl">🏹 Choose Archery Arena</div>
            <div className="mx-auto mt-1 max-w-3xl text-xs font-bold text-yellow-200 sm:text-sm">
              Drag power, wind, obstacles, rare targets, powerups, boss battle. Mobile works only in landscape.
            </div>
          </div>

          <div className="mt-4 grid flex-1 grid-cols-5 gap-3">
            {ARCHERY_MAPS.map((map, index) => (
              <button
                key={map.name}
                onClick={() => startMap(index)}
                className="rounded-3xl border border-white/10 bg-white/5 p-3 text-left shadow-2xl transition hover:bg-white/10 active:scale-[0.98]"
              >
                <div className="text-4xl sm:text-5xl">{map.emoji}</div>
                <div className="mt-2 text-base font-black sm:text-xl">{map.name}</div>
                <div className="mt-1 text-[11px] font-bold text-slate-300 sm:text-xs">{map.subtitle}</div>
                <div className="mt-2 text-[11px] font-bold text-yellow-200 sm:text-xs">
                  Speed x{map.speed} · Wind {map.wind} · Reward x{map.rewardBoost}
                </div>
                <div className="mt-3 inline-flex rounded-full bg-yellow-400 px-3 py-2 text-xs font-black text-slate-950 sm:text-sm">
                  Start
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const healthRatio = Math.max(0, Math.min(1, hud.health / 100));
  const bossRatio = hud.bossMaxHp > 0 ? Math.max(0, Math.min(1, hud.bossHp / hud.bossMaxHp)) : 0;

  const HudCard = ({ mobile = false }) => (
    <div
      className={
        mobile
          ? "pointer-events-none fixed left-3 top-3 z-[10000] w-[430px] rounded-2xl border border-yellow-400/40 bg-slate-950/80 p-3 text-white shadow-2xl backdrop-blur-md"
          : "pointer-events-none fixed left-5 top-5 z-[10000] w-[455px] rounded-2xl border border-yellow-400/40 bg-slate-950/75 p-4 text-white shadow-2xl backdrop-blur-md"
      }
    >
      <div className={mobile ? "text-xs font-black leading-tight" : "text-sm font-black leading-tight"}>
        Q{hud.current}/{hud.total}. {hud.question}
      </div>
      <div className="mt-2 grid grid-cols-5 gap-2 text-[11px] font-black sm:text-xs">
        <div>Score {hud.score}</div>
        <div className="text-yellow-300">Combo {hud.combo}</div>
        <div className="text-cyan-300">Arrows {hud.arrows}</div>
        <div className="text-green-300">HP {hud.health}</div>
        <div className="text-red-300">Boss {hud.bossHp}</div>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-800">
        <div className="h-2 rounded-full bg-green-500" style={{ width: `${healthRatio * 100}%` }} />
      </div>
      {hud.bossMaxHp > 0 && (
        <div className="mt-2 h-2 rounded-full bg-slate-800">
          <div className="h-2 rounded-full bg-red-500" style={{ width: `${bossRatio * 100}%` }} />
        </div>
      )}
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-black sm:text-xs">
        <span className="text-yellow-200">{hud.mapName}</span>
        <span className="text-cyan-200">{hud.windText}</span>
      </div>
      <div className="mt-1 text-[11px] font-bold text-purple-200 sm:text-xs">Powerup: {hud.powerup}</div>
      <div className="mt-1 text-[11px] font-bold leading-snug text-slate-200 sm:text-xs">{hud.message}</div>
    </div>
  );

  if (!mapSelected) return <MapSelectScreen />;
  if (device.isMobile && device.isPortrait) return <RotatePhoneScreen />;

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-hidden bg-slate-950 text-white"
      style={{ width: "100dvw", height: "100dvh", margin: 0, padding: 0, touchAction: "none", overscrollBehavior: "none" }}
    >
      {loading && <LoadingOverlay />}
      <HudCard mobile={device.isMobile} />
      <div ref={gameWrapRef} className="h-full w-full bg-slate-950" />
    </div>
  );
}
