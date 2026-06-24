import { useEffect, useMemo, useRef, useState } from "react";
import Phaser from "phaser";

/**
 * FishGame.jsx - Student OS Fixed Edition
 *
 * Real fixes:
 * 1. Mobile is NOT zoomed: Phaser always renders at 960x540 and FIT scales into a 16:9 strip.
 * 2. FishGame does NOT render its own EXIT button, so GameRoom remains the only exit button.
 * 3. Laptop/Desktop has HUD + minimap.
 * 4. Canvas is clipped inside its game area, never stretched to portrait fullscreen.
 *
 * Put this file at: src/components/games/FishGame.jsx
 */

const GAME_W = 960;
const GAME_H = 540;
const WORLD_W = 2600;
const WORLD_H = 1450;

const fallbackQuestions = [
  { question: "Both inputs 1 gives output 1?", answer: "AND", options: ["AND", "OR", "XOR", "NOT"] },
  { question: "Either input 1 gives output 1?", answer: "OR", options: ["AND", "OR", "NAND", "NOR"] },
  { question: "Opposite output gate?", answer: "NOT", options: ["NOT", "AND", "OR", "XOR"] },
  { question: "Universal gate?", answer: "NAND", options: ["NAND", "NOR", "XOR", "AND"] },
  { question: "Exclusive OR short form?", answer: "XOR", options: ["XOR", "AND", "OR", "NOT"] },
  { question: "Collection of same datatype?", answer: "Array", options: ["Array", "Loop", "Pointer", "If"] },
  { question: "Address storing variable?", answer: "Pointer", options: ["Pointer", "Array", "Loop", "Struct"] },
  { question: "Stores charge?", answer: "Capacitor", options: ["Capacitor", "Resistor", "Diode", "Switch"] },
];

export default function FishGame({ questions = [], topic = "Study Topic", onReward }) {
  const gameWrapRef = useRef(null);
  const gameRef = useRef(null);
  const miniMapRef = useRef(null);
  const rewardSentRef = useRef(false);
  const latestRewardRef = useRef(onReward);
  const joystickRef = useRef({ x: 0, y: 0, active: false });

  const [hud, setHud] = useState({
    question: "Loading ocean...",
    score: 0,
    health: 100,
    combo: 0,
    level: 1,
    shield: 0,
    current: 1,
    total: Math.max(questions.length, 1),
    message: "Loading ocean...",
    ended: false,
  });

  const isMobilePortrait = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(pointer: coarse)")?.matches && window.innerHeight > window.innerWidth;
  }, []);

  useEffect(() => {
    latestRewardRef.current = onReward;
  }, [onReward]);

  useEffect(() => {
    const safeQuestions = questions?.length ? questions : fallbackQuestions;
    if (!gameWrapRef.current || gameRef.current) return;

    let score = 0;
    let health = 100;
    let combo = 0;
    let level = 1;
    let shield = 0;
    let current = 0;
    let ended = false;
    let invincible = false;
    let speedBoostUntil = 0;

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
        super("StudentOSFishGameFixed");
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
        this.lastMap = 0;
      }

      create() {
        this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
        this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
        this.createOcean();
        this.createBackgroundFish();
        this.createPlayer();
        this.createPredators();
        this.createCoins();
        this.createPowerups();
        this.createQuestion();
        this.starPointer = this.add.text(GAME_W / 2, 30, "⭐", { fontSize: "28px" }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
        this.cameras.main.startFollow(this.player, true, 0.09, 0.09);

        if (!isMobilePortrait) {
          this.input.on("pointermove", (p) => this.setTargetFromPointer(p));
          this.input.on("pointerdown", (p) => this.setTargetFromPointer(p));
        }

        syncHud(isMobilePortrait ? "Use joystick. Chase the ⭐ correct fish." : "Move with mouse/touch. Chase the ⭐ correct fish.");

        this.time.addEvent({
          delay: 1000,
          loop: true,
          callback: () => {
            if (ended) return;
            health = Math.max(0, health - 0.25);
            if (health <= 0) this.endGame("Your fish ran out of health!");
            else syncHud("Find ⭐ answer fish. Avoid ☠ predators. Collect coins.");
          },
        });
      }

      update(time) {
        if (ended || !this.player) return;
        this.movePlayer(time);
        this.moveFish();
        this.checkAnswerCollision();
        this.checkPredatorCollision();
        this.checkCoinCollision();
        this.checkPowerupCollision();
        this.updatePointer();

        if (time - this.lastMap > 200) {
          this.drawMiniMap();
          this.lastMap = time;
        }
      }

      createOcean() {
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0891b2, 0x0e7490, 0x164e63, 0x020617, 1);
        bg.fillRect(0, 0, WORLD_W, WORLD_H);

        for (let i = 0; i < 80; i++) {
          const bubble = this.add.circle(
            Phaser.Math.Between(0, WORLD_W),
            Phaser.Math.Between(0, WORLD_H),
            Phaser.Math.Between(2, 6),
            0xffffff,
            Phaser.Math.FloatBetween(0.06, 0.18)
          ).setDepth(3);
          this.tweens.add({
            targets: bubble,
            y: bubble.y - Phaser.Math.Between(180, 500),
            alpha: 0,
            duration: Phaser.Math.Between(3500, 8000),
            repeat: -1,
            onRepeat: () => {
              bubble.y = WORLD_H + Phaser.Math.Between(20, 120);
              bubble.x = Phaser.Math.Between(0, WORLD_W);
              bubble.alpha = Phaser.Math.FloatBetween(0.06, 0.18);
            },
          });
        }

        for (let i = 0; i < 40; i++) {
          this.add.text(
            Phaser.Math.Between(0, WORLD_W),
            Phaser.Math.Between(WORLD_H - 150, WORLD_H - 60),
            ["🌿", "🪸", "🐚", "🪨"][Phaser.Math.Between(0, 3)],
            { fontSize: Phaser.Math.Between(28, 52) + "px" }
          ).setDepth(4);
        }
      }

      makeFish(x, y, color, icon = "", size = 1) {
        const fish = this.add.container(x, y);
        const glow = this.add.circle(0, 0, 55 * size, color, 0.08);
        const tail = this.add.triangle(-56 * size, 0, 0, -30 * size, 0, 30 * size, -42 * size, 0, color);
        const body = this.add.ellipse(0, 0, 96 * size, 56 * size, color);
        const belly = this.add.ellipse(8 * size, 10 * size, 52 * size, 24 * size, 0xffffff, 0.2);
        const eye = this.add.circle(30 * size, -11 * size, 7 * size, 0xffffff);
        const pupil = this.add.circle(32 * size, -11 * size, 3 * size, 0x020617);
        fish.add([glow, tail, body, belly, eye, pupil]);
        if (icon) fish.add(this.add.text(0, -42 * size, icon, { fontSize: 24 * size + "px" }).setOrigin(0.5));
        fish.glow = glow;
        fish.setSize(100 * size, 60 * size);
        this.tweens.add({ targets: tail, scaleX: 1.28, duration: 150, yoyo: true, repeat: -1 });
        return fish;
      }

      createPlayer() {
        this.player = this.makeFish(WORLD_W * 0.18, WORLD_H * 0.5, 0xf97316, "", 1.12).setDepth(80);
        this.physics.add.existing(this.player);
        this.player.body.setCircle(44);
        this.player.body.setCollideWorldBounds(true);
      }

      createBackgroundFish() {
        for (let i = 0; i < 16; i++) {
          const fish = this.makeFish(
            Phaser.Math.Between(150, WORLD_W - 150),
            Phaser.Math.Between(150, WORLD_H - 150),
            [0x38bdf8, 0x22c55e, 0xa855f7, 0xf97316, 0xec4899][Phaser.Math.Between(0, 4)],
            "",
            Phaser.Math.FloatBetween(0.45, 0.7)
          ).setAlpha(0.5).setDepth(12);
          fish.speed = Phaser.Math.Between(30, 70);
          fish.dir = new Phaser.Math.Vector2(Phaser.Math.FloatBetween(-1, 1), Phaser.Math.FloatBetween(-0.5, 0.5)).normalize();
          this.physics.add.existing(fish);
          fish.body.setCircle(24);
          fish.body.setCollideWorldBounds(true);
          this.bgFish.push(fish);
        }
      }

      createPredators() {
        for (let i = 0; i < 7; i++) {
          const p = this.makeFish(
            Phaser.Math.Between(500, WORLD_W - 160),
            Phaser.Math.Between(150, WORLD_H - 170),
            0x334155,
            "☠",
            Phaser.Math.FloatBetween(1.02, 1.25)
          ).setDepth(52);
          p.damage = Phaser.Math.Between(7, 13);
          p.speed = Phaser.Math.Between(70, 112);
          p.dir = new Phaser.Math.Vector2(Phaser.Math.FloatBetween(-1, 1), Phaser.Math.FloatBetween(-1, 1)).normalize();
          this.physics.add.existing(p);
          p.body.setCircle(45);
          p.body.setCollideWorldBounds(true);
          this.predators.push(p);
        }
      }

      createCoins() {
        for (let i = 0; i < 18; i++) {
          const c = this.add.container(Phaser.Math.Between(260, WORLD_W - 160), Phaser.Math.Between(150, WORLD_H - 150)).setDepth(34);
          c.add(this.add.circle(0, 0, 18, 0xfacc15));
          c.add(this.add.text(0, 0, "$", { fontSize: "20px", color: "#78350f", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5));
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
        for (let i = 0; i < 6; i++) {
          const item = types[i % types.length];
          const p = this.add.container(Phaser.Math.Between(350, WORLD_W - 200), Phaser.Math.Between(180, WORLD_H - 180)).setDepth(36);
          p.powerType = item.type;
          p.add(this.add.circle(0, 0, 26, item.color, 0.88));
          p.add(this.add.text(0, 0, item.icon, { fontSize: "22px" }).setOrigin(0.5));
          this.physics.add.existing(p);
          p.body.setCircle(26);
          this.powerups.push(p);
        }
      }

      createQuestion() {
        if (current >= safeQuestions.length) return this.endGame("Ocean level complete!");
        this.answerFish.forEach((f) => f.destroy());
        this.labels.forEach((l) => l.destroy());
        this.answerFish = [];
        this.labels = [];

        const q = safeQuestions[current];
        const options = [...new Set([...(q.options || []), q.answer])].slice(0, 4).sort(() => Math.random() - 0.5);
        const baseX = Phaser.Math.Between(880, WORLD_W - 700);
        const baseY = Phaser.Math.Between(230, WORLD_H - 480);
        const spots = [[baseX, baseY], [baseX + 400, baseY + 140], [baseX - 210, baseY + 350], [baseX + 480, baseY + 430]];

        options.forEach((answer, i) => {
          const correct = String(answer).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
          const f = this.makeFish(
            Phaser.Math.Clamp(spots[i][0], 140, WORLD_W - 140),
            Phaser.Math.Clamp(spots[i][1], 130, WORLD_H - 140),
            correct ? 0xfacc15 : [0x38bdf8, 0x22c55e, 0xa855f7, 0xef4444][i],
            correct ? "⭐" : "",
            correct ? 1.15 : 1
          ).setDepth(correct ? 60 : 45);
          f.correct = correct;
          f.speed = Phaser.Math.Between(75, 130);
          f.dir = new Phaser.Math.Vector2(Phaser.Math.FloatBetween(-1, 1), Phaser.Math.FloatBetween(-1, 1)).normalize();
          this.physics.add.existing(f);
          f.body.setCircle(43);
          f.body.setCollideWorldBounds(true);
          if (correct) this.tweens.add({ targets: f.glow, alpha: 0.42, scaleX: 1.25, scaleY: 1.25, duration: 600, yoyo: true, repeat: -1 });
          f.label = this.add.text(f.x, f.y + 62, answer, { fontSize: "21px", color: "#ffffff", fontFamily: "Arial", fontStyle: "bold", stroke: "#000000", strokeThickness: 5 }).setOrigin(0.5).setDepth(61);
          this.answerFish.push(f);
          this.labels.push(f.label);
        });
        syncHud("Find ⭐ answer fish.");
      }

      setTargetFromPointer(pointer) {
        const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.targetX = Phaser.Math.Clamp(world.x, 80, WORLD_W - 80);
        this.targetY = Phaser.Math.Clamp(world.y, 80, WORLD_H - 80);
      }

      movePlayer(time) {
        const speed = 305 + level * 18 + (time < speedBoostUntil ? 55 : 0);
        if (isMobilePortrait) {
          const joy = joystickRef.current;
          if (joy.active) {
            this.player.body.setVelocity(joy.x * speed, joy.y * speed);
            this.player.rotation = Math.atan2(joy.y, joy.x);
          } else this.player.body.setVelocity(0, 0);
        } else {
          const dx = this.targetX - this.player.x;
          const dy = this.targetY - this.player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 8) {
            const angle = Math.atan2(dy, dx);
            this.player.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            this.player.rotation = angle;
          } else this.player.body.setVelocity(0, 0);
        }
        const size = Math.min(1.75, 1 + (level - 1) * 0.065);
        this.player.setScale(size);
      }

      moveFish() {
        [...this.answerFish, ...this.predators, ...this.bgFish].forEach((f) => {
          if (!f.active || !f.body) return;
          const predator = this.predators.includes(f);
          const chase = predator && Phaser.Math.Distance.Between(f.x, f.y, this.player.x, this.player.y) < 380;
          if (chase) {
            const angle = Phaser.Math.Angle.Between(f.x, f.y, this.player.x, this.player.y);
            f.body.setVelocity(Math.cos(angle) * f.speed * 1.15, Math.sin(angle) * f.speed * 1.15);
            f.rotation = angle;
          } else {
            f.body.setVelocity(f.dir.x * f.speed, f.dir.y * f.speed);
            f.rotation = Math.atan2(f.dir.y, f.dir.x);
          }
          if (f.x < 80 || f.x > WORLD_W - 80) f.dir.x *= -1;
          if (f.y < 80 || f.y > WORLD_H - 80) f.dir.y *= -1;
          if (f.label) {
            f.label.x = f.x;
            f.label.y = f.y + 62;
          }
        });
      }

      checkAnswerCollision() {
        this.answerFish.forEach((f) => {
          if (!f.active) return;
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, f.x, f.y) < 62 * this.player.scaleX) {
            if (f.correct) this.eatCorrect(f);
            else this.eatWrong(f);
          }
        });
      }

      checkPredatorCollision() {
        if (invincible) return;
        this.predators.forEach((p) => {
          if (!p.active) return;
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y) < 60 * this.player.scaleX) {
            invincible = true;
            if (shield > 0) shield -= 1;
            else {
              health = Math.max(0, health - p.damage);
              combo = 0;
              this.cameras.main.shake(120, 0.004);
            }
            this.tweens.add({ targets: this.player, alpha: 0.35, duration: 90, yoyo: true, repeat: 5, onComplete: () => { this.player.alpha = 1; invincible = false; } });
            if (health <= 0) this.endGame("Predators defeated your fish!");
            else syncHud(shield > 0 ? "Shield blocked predator." : "Predator hit. Avoid skull fish.");
          }
        });
      }

      checkCoinCollision() {
        this.coins.forEach((c) => {
          if (!c.active) return;
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y) < 64 * this.player.scaleX) {
            score += 5;
            c.destroy();
            syncHud("Coin collected. +5 score.");
          }
        });
      }

      checkPowerupCollision() {
        this.powerups.forEach((p) => {
          if (!p.active) return;
          if (Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y) < 66 * this.player.scaleX) {
            if (p.powerType === "health") health = Math.min(100, health + 18);
            if (p.powerType === "shield") shield = Math.min(3, shield + 1);
            if (p.powerType === "speed") speedBoostUntil = this.time.now + 7000;
            p.destroy();
            syncHud("Powerup collected.");
          }
        });
      }

      eatCorrect(f) {
        score += 10 + combo * 2;
        combo += 1;
        health = Math.min(100, health + 8);
        level = Math.min(12, level + 1);
        f.label?.destroy();
        f.destroy();
        current += 1;
        this.time.delayedCall(420, () => current >= safeQuestions.length ? this.endGame("Ocean level complete!") : this.createQuestion());
        syncHud("Correct. Fish grew bigger.");
      }

      eatWrong(f) {
        health = Math.max(0, health - 15);
        score = Math.max(0, score - 4);
        combo = 0;
        f.label?.destroy();
        f.destroy();
        current += 1;
        this.cameras.main.shake(120, 0.004);
        this.time.delayedCall(420, () => health <= 0 ? this.endGame("Wrong fish made you lose health!") : current >= safeQuestions.length ? this.endGame("Ocean level complete!") : this.createQuestion());
        syncHud("Wrong fish. Health decreased.");
      }

      updatePointer() {
        const correct = this.answerFish.find((f) => f.active && f.correct);
        if (!correct || !this.starPointer) return;
        const sx = correct.x - this.cameras.main.scrollX;
        const sy = correct.y - this.cameras.main.scrollY;
        this.starPointer.x = Phaser.Math.Clamp(sx, 35, GAME_W - 35);
        this.starPointer.y = Phaser.Math.Clamp(sy, 26, GAME_H - 28);
      }

      drawMiniMap() {
        const canvas = miniMapRef.current;
        if (!canvas || !this.player) return;
        const ctx = canvas.getContext("2d");
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "rgba(2,6,23,0.86)";
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
        this.predators.filter((p) => p.active).forEach((p) => dot(p.x, p.y, "#ef4444", 3));
        this.coins.filter((c) => c.active).forEach((c) => dot(c.x, c.y, "#facc15", 2));
        this.powerups.filter((p) => p.active).forEach((p) => dot(p.x, p.y, "#22c55e", 2));
      }

      endGame(reason = "Game complete!") {
        if (ended) return;
        ended = true;
        const xp = Math.max(20, Math.round(score / 2));
        const coins = Math.max(10, Math.round(score / 8));
        syncHud(`${reason} Use the top EXIT button.`);
        if (!rewardSentRef.current && typeof latestRewardRef.current === "function") {
          rewardSentRef.current = true;
          latestRewardRef.current({ xp, coins, score, total: safeQuestions.length, gameName: "Fish Game" });
        }
      }
    }

    gameRef.current = new Phaser.Game({
      type: Phaser.WEBGL,
      parent: gameWrapRef.current,
      width: GAME_W,
      height: GAME_H,
      backgroundColor: "#020617",
      scene: OceanScene,
      physics: { default: "arcade", arcade: { gravity: { y: 0 }, debug: false } },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_W,
        height: GAME_H,
      },
      render: { antialias: true, pixelArt: false, powerPreference: "high-performance" },
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [questions, isMobilePortrait]);

  const healthRatio = Math.max(0, Math.min(1, hud.health / 100));

  const updateJoystick = (clientX, clientY, rect) => {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const len = Math.sqrt(dx * dx + dy * dy);
    const max = Math.min(rect.width, rect.height) * 0.36;
    const angle = Math.atan2(dy, dx);
    joystickRef.current = { x: len > 8 ? Math.cos(angle) : 0, y: len > 8 ? Math.sin(angle) : 0, active: len > 8 };
    return { x: Math.cos(angle) * Math.min(len, max), y: Math.sin(angle) * Math.min(len, max) };
  };

  const handleJoyMove = (e) => {
    if (!isMobilePortrait) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches?.[0];
    const x = touch ? touch.clientX : e.clientX;
    const y = touch ? touch.clientY : e.clientY;
    const pos = updateJoystick(x, y, rect);
    const knob = e.currentTarget.querySelector("[data-joy-knob]");
    if (knob) knob.style.transform = `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`;
  };

  const stopJoystick = (e) => {
    joystickRef.current = { x: 0, y: 0, active: false };
    const knob = e.currentTarget.querySelector("[data-joy-knob]");
    if (knob) knob.style.transform = "translate(-50%, -50%)";
  };

  const HudPanel = ({ compact = false }) => (
    <div className="pointer-events-auto rounded-2xl border border-cyan-300/30 bg-slate-950/90 p-3 text-white shadow-2xl backdrop-blur-md">
      <div className={`${compact ? "text-sm" : "text-base"} pr-1 font-black leading-tight`}>
        Q{hud.current}/{hud.total}. {hud.question}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 text-[11px] font-black">
        <div>Score {hud.score}</div>
        <div className="text-green-300">HP {hud.health}</div>
        <div className="text-blue-300">Combo {hud.combo}</div>
        <div className="text-purple-300">Lv {hud.level}{hud.shield > 0 ? ` 🛡${hud.shield}` : ""}</div>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-800">
        <div className="h-2 rounded-full bg-green-500" style={{ width: `${healthRatio * 100}%` }} />
      </div>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="text-xs font-bold text-slate-200">{hud.message}</div>
        <canvas ref={miniMapRef} width={150} height={86} className="h-[72px] w-[126px] shrink-0 rounded border border-cyan-400/60 bg-slate-950" />
      </div>
    </div>
  );

  if (isMobilePortrait) {
    return (
      <div
        className="fixed inset-0 z-[99990] grid bg-slate-950 text-white"
        style={{
          gridTemplateRows: "27dvh 45dvh 28dvh",
          width: "100dvw",
          height: "100dvh",
          overflow: "hidden",
          touchAction: "none",
          overscrollBehavior: "none",
        }}
      >
        <div className="relative border-b border-cyan-400/30 bg-slate-950 px-3 pb-2 pt-4">
          <HudPanel compact />
        </div>

        <div className="flex items-center justify-center overflow-hidden bg-slate-900">
          <div
            ref={gameWrapRef}
            className="relative overflow-hidden rounded-xl bg-slate-950 shadow-[0_0_35px_rgba(34,211,238,0.22)]"
            style={{ width: "100dvw", maxWidth: "100dvw", height: "min(45dvh, 56.25dvw)", aspectRatio: "16 / 9" }}
          />
        </div>

        <div
          className="relative flex flex-col items-center justify-center border-t border-cyan-400/30 bg-slate-950"
          onTouchStart={handleJoyMove}
          onTouchMove={handleJoyMove}
          onTouchEnd={stopJoystick}
          onMouseDown={handleJoyMove}
          onMouseMove={(e) => e.buttons === 1 && handleJoyMove(e)}
          onMouseUp={stopJoystick}
          style={{ touchAction: "none" }}
        >
          <div className="mb-2 text-xs font-black text-cyan-200">Joystick • Chase ⭐ answer fish</div>
          <div className="relative h-32 w-32 rounded-full border-4 border-cyan-400/60 bg-cyan-300/10 shadow-[0_0_35px_rgba(34,211,238,0.25)]">
            <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30 bg-white/10" />
            <div data-joy-knob className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-cyan-300 bg-white/40 shadow-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[99990] overflow-hidden bg-slate-950 text-white"
      style={{ width: "100dvw", height: "100dvh", touchAction: "none", overscrollBehavior: "none" }}
    >
      <div className="pointer-events-none fixed left-5 top-5 z-[100000] w-[min(560px,calc(100vw-170px))]">
        <HudPanel />
      </div>

      <div className="flex h-full w-full items-center justify-center overflow-hidden bg-slate-950">
        <div ref={gameWrapRef} className="relative h-full w-full overflow-hidden bg-slate-950" />
      </div>
    </div>
  );
}
