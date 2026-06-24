import { useEffect, useMemo, useRef, useState } from "react";
import Phaser from "phaser";

/**
 * FishGame V7 - Student OS Mobile Safe Ocean
 * Path: src/components/games/FishGame.jsx
 *
 * Best version fixes:
 * 1. EXIT button is React DOM, so it works on laptop and mobile.
 * 2. Mobile portrait:
 *    Top = question + score + health + minimap + exit
 *    Middle = real horizontal 16:9 ocean game strip
 *    Bottom = joystick
 * 3. No zoomed portrait ocean. The Phaser canvas lives only inside the middle strip.
 * 4. If user minimizes/reopens, React EXIT button still works.
 */

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

  const [hud, setHud] = useState({
    question: "Loading...",
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

  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 1024 : window.innerWidth,
    height: typeof window === "undefined" ? 768 : window.innerHeight,
  }));

  const isPortraitMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
    return Boolean(coarse && viewport.height > viewport.width);
  }, [viewport.height, viewport.width]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  useEffect(() => {
    latestRewardRef.current = onReward;
  }, [onReward]);

  useEffect(() => {
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

    const safeQuestions = questions?.length ? questions : fallbackQuestions;

    if (!gameWrapRef.current || gameRef.current) return;

    const parent = gameWrapRef.current;
    const rect = parent.getBoundingClientRect();
    const GAME_W = Math.max(360, Math.floor(rect.width || window.innerWidth || 960));
    // Portrait mobile middle strip is intentionally short and wide.
    // This prevents the ocean from becoming zoomed/cropped like portrait fullscreen.
    const GAME_H = isPortraitMobile
      ? Math.max(190, Math.min(360, Math.floor(rect.height || GAME_W * 0.5625)))
      : Math.max(420, Math.floor(rect.height || 540));

    const WORLD_W = 3000;
    const WORLD_H = 1650;

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
        super("FishGameV7StudentOSOcean");
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
        this.createPointer();

        this.cameras.main.startFollow(this.player, true, 0.09, 0.09);

        if (!isPortraitMobile) {
          this.input.on("pointermove", (p) => this.setTargetFromPointer(p));
          this.input.on("pointerdown", (p) => this.setTargetFromPointer(p));
        }

        this.showLoading();

        this.time.delayedCall(700, () => {
          ready = true;
          syncHud(isPortraitMobile ? "Use joystick below. Chase ⭐ answer fish." : "Move with mouse/touch. Chase ⭐ answer fish.");
        });

        this.time.addEvent({
          delay: 1000,
          loop: true,
          callback: () => {
            if (!ready || ended) return;
            health = Math.max(0, health - 0.25);
            if (health <= 0) {
              this.endGame("Your fish ran out of health!");
              return;
            }
            syncHud("Find ⭐ answer fish. Avoid ☠ predators. Collect coins.");
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
        this.updatePointer();

        if (time - this.lastHud > 160) {
          syncHud(hud.message || "Keep swimming.");
          this.lastHud = time;
        }

        if (time - this.lastMap > 250) {
          this.drawMiniMap();
          this.lastMap = time;
        }
      }

      showLoading() {
        const box = this.add.container(GAME_W / 2, GAME_H / 2).setScrollFactor(0).setDepth(999);
        const bg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x020617, 0.65);
        const card = this.add.rectangle(0, 0, Math.min(520, GAME_W * 0.8), 160, 0x0f172a, 0.96);
        card.setStrokeStyle(3, 0x38bdf8, 0.7);
        const title = this.add.text(0, -32, "🌊 Loading Ocean", {
          fontSize: Math.max(24, GAME_W * 0.035) + "px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 6,
        }).setOrigin(0.5);
        const sub = this.add.text(0, 30, "Preparing smooth game view...", {
          fontSize: "16px",
          color: "#cbd5e1",
          fontFamily: "Arial",
        }).setOrigin(0.5);
        box.add([bg, card, title, sub]);

        this.time.delayedCall(650, () => {
          this.tweens.add({
            targets: box,
            alpha: 0,
            duration: 180,
            onComplete: () => box.destroy(),
          });
        });
      }

      createOcean() {
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0891b2, 0x0e7490, 0x164e63, 0x020617, 1);
        bg.fillRect(0, 0, WORLD_W, WORLD_H);

        const staticLayer = this.add.graphics().setDepth(1);
        for (let i = 0; i < 100; i++) {
          staticLayer.fillStyle(0x1f2937, Phaser.Math.FloatBetween(0.35, 0.75));
          staticLayer.fillEllipse(
            Phaser.Math.Between(0, WORLD_W),
            WORLD_H - Phaser.Math.Between(20, 95),
            Phaser.Math.Between(60, 170),
            Phaser.Math.Between(22, 62)
          );
        }

        for (let i = 0; i < 70; i++) {
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

        for (let i = 0; i < 45; i++) {
          const deco = this.add.text(
            Phaser.Math.Between(0, WORLD_W),
            Phaser.Math.Between(WORLD_H - 145, WORLD_H - 76),
            "🌿",
            { fontSize: Phaser.Math.Between(28, 54) + "px" }
          ).setDepth(4);
          if (i < 15) {
            this.tweens.add({
              targets: deco,
              angle: Phaser.Math.Between(-6, 6),
              duration: Phaser.Math.Between(1200, 2200),
              yoyo: true,
              repeat: -1,
            });
          }
        }

        for (let i = 0; i < 25; i++) {
          this.add.text(
            Phaser.Math.Between(0, WORLD_W),
            Phaser.Math.Between(220, WORLD_H - 220),
            ["🪸", "🐚", "🪨"][Phaser.Math.Between(0, 2)],
            { fontSize: Phaser.Math.Between(28, 50) + "px" }
          ).setDepth(4);
        }
      }

      makeFish(x, y, color, icon = "", size = 1, isPlayer = false) {
        const fish = this.add.container(x, y);
        const glow = this.add.circle(0, 0, 55 * size, color, isPlayer ? 0.1 : 0.06);
        const tail = this.add.triangle(-56 * size, 0, 0, -30 * size, 0, 30 * size, -42 * size, 0, color);
        const body = this.add.ellipse(0, 0, 96 * size, 56 * size, color);
        const belly = this.add.ellipse(8 * size, 10 * size, 52 * size, 24 * size, 0xffffff, 0.2);
        const eye = this.add.circle(30 * size, -11 * size, 7 * size, 0xffffff);
        const pupil = this.add.circle(32 * size, -11 * size, 3 * size, 0x020617);

        fish.add([glow, tail, body, belly, eye, pupil]);
        if (icon) fish.add(this.add.text(0, -42 * size, icon, { fontSize: 24 * size + "px" }).setOrigin(0.5));

        fish.tail = tail;
        fish.glow = glow;
        fish.setSize(100 * size, 60 * size);

        this.tweens.add({
          targets: tail,
          scaleX: 1.28,
          duration: 150,
          yoyo: true,
          repeat: -1,
        });

        return fish;
      }

      createBackgroundFish() {
        for (let i = 0; i < 18; i++) {
          const f = this.makeFish(
            Phaser.Math.Between(150, WORLD_W - 150),
            Phaser.Math.Between(160, WORLD_H - 160),
            [0x38bdf8, 0x22c55e, 0xa855f7, 0xf97316, 0xec4899][Phaser.Math.Between(0, 4)],
            "",
            Phaser.Math.FloatBetween(0.45, 0.7),
            false
          );
          f.speed = Phaser.Math.Between(30, 70);
          f.dir = new Phaser.Math.Vector2(Phaser.Math.FloatBetween(-1, 1), Phaser.Math.FloatBetween(-0.4, 0.4)).normalize();
          this.physics.add.existing(f);
          f.body.setCircle(24);
          f.body.setCollideWorldBounds(true);
          f.setAlpha(0.52);
          f.setDepth(12);
          this.bgFish.push(f);
        }
      }

      createPlayer() {
        this.player = this.makeFish(WORLD_W * 0.18, WORLD_H * 0.5, 0xf97316, "", 1.15, true);
        this.player.setDepth(80);
        this.physics.add.existing(this.player);
        this.player.body.setCircle(44);
        this.player.body.setCollideWorldBounds(true);
      }

      createPredators() {
        for (let i = 0; i < 7; i++) {
          const p = this.makeFish(
            Phaser.Math.Between(500, WORLD_W - 160),
            Phaser.Math.Between(150, WORLD_H - 170),
            0x334155,
            "☠",
            Phaser.Math.FloatBetween(1.05, 1.32)
          );
          p.damage = Phaser.Math.Between(7, 13);
          p.speed = Phaser.Math.Between(75, 118);
          p.dir = new Phaser.Math.Vector2(Phaser.Math.FloatBetween(-1, 1), Phaser.Math.FloatBetween(-1, 1)).normalize();
          this.physics.add.existing(p);
          p.body.setCircle(45);
          p.body.setCollideWorldBounds(true);
          p.setDepth(52);
          this.predators.push(p);
        }

        const boss = this.makeFish(WORLD_W * 0.78, WORLD_H * 0.2, 0x111827, "🦈", 1.55);
        boss.damage = 18;
        boss.speed = 72;
        boss.dir = new Phaser.Math.Vector2(-1, 0.35).normalize();
        this.physics.add.existing(boss);
        boss.body.setCircle(58);
        boss.body.setCollideWorldBounds(true);
        boss.setDepth(53);
        this.predators.push(boss);
      }

      createCoins() {
        for (let i = 0; i < 20; i++) {
          const c = this.add.container(
            Phaser.Math.Between(260, WORLD_W - 160),
            Phaser.Math.Between(160, WORLD_H - 160)
          ).setDepth(34);

          c.add(this.add.circle(0, 0, 34, 0xfacc15, 0.14));
          c.add(this.add.circle(0, 0, 18, 0xfacc15));
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

        for (let i = 0; i < 6; i++) {
          const item = types[i % types.length];
          const p = this.add.container(
            Phaser.Math.Between(350, WORLD_W - 200),
            Phaser.Math.Between(220, WORLD_H - 220)
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

        const q = safeQuestions[current];
        const options = this.shuffleOptions([...new Set([...(q.options || []), q.answer])]).slice(0, 4);

        const baseX = Phaser.Math.Between(980, WORLD_W - 700);
        const baseY = Phaser.Math.Between(260, WORLD_H - 540);
        const spots = [
          [baseX, baseY],
          [baseX + 440, baseY + 160],
          [baseX - 240, baseY + 380],
          [baseX + 520, baseY + 480],
        ];

        options.forEach((answer, i) => {
          const correct = String(answer).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
          const f = this.makeFish(
            Phaser.Math.Clamp(spots[i][0], 160, WORLD_W - 160),
            Phaser.Math.Clamp(spots[i][1], 150, WORLD_H - 160),
            correct ? 0xfacc15 : [0x38bdf8, 0x22c55e, 0xa855f7, 0xef4444][i],
            correct ? "⭐" : "",
            correct ? 1.18 : 1
          );
          f.answer = answer;
          f.correct = correct;
          f.speed = Phaser.Math.Between(80, 136);
          f.dir = new Phaser.Math.Vector2(Phaser.Math.FloatBetween(-1, 1), Phaser.Math.FloatBetween(-1, 1)).normalize();

          this.physics.add.existing(f);
          f.body.setCircle(43);
          f.body.setCollideWorldBounds(true);
          f.setDepth(correct ? 60 : 45);

          if (correct) {
            this.tweens.add({
              targets: f.glow,
              alpha: 0.42,
              scaleX: 1.28,
              scaleY: 1.28,
              duration: 640,
              yoyo: true,
              repeat: -1,
            });
          }

          const label = this.add.text(f.x, f.y + 62, answer, {
            fontSize: "21px",
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

        syncHud("Find ⭐ answer fish. Avoid ☠ predators. Collect coins.");
      }

      createPointer() {
        this.starPointer = this.add.text(GAME_W / 2, 32, "⭐", {
          fontSize: "28px",
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
      }

      setTargetFromPointer(pointer) {
        const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.targetX = Phaser.Math.Clamp(world.x, 80, WORLD_W - 80);
        this.targetY = Phaser.Math.Clamp(world.y, 100, WORLD_H - 90);
      }

      movePlayer(time) {
        const boost = time < speedBoostUntil ? 55 : 0;
        const speed = 315 + level * 18 + boost;

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

        const size = Math.min(1.9, 1 + (level - 1) * 0.075);
        this.player.scaleX = size;
        this.player.scaleY = size;
      }

      moveAllFish() {
        [...this.answerFish, ...this.predators, ...this.bgFish].forEach((f) => {
          if (!f.active || !f.body) return;

          const isPredator = this.predators.includes(f);
          const chaseDistance = f.scaleX > 1.45 ? 520 : 360;
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

          if (f.x < 90 || f.x > WORLD_W - 90) f.dir.x *= -1;
          if (f.y < 105 || f.y > WORLD_H - 95) f.dir.y *= -1;

          if (f.label) {
            const d = Phaser.Math.Distance.Between(f.x, f.y, this.player.x, this.player.y);
            const show = d < 850 || f.correct;
            f.label.setVisible(show);
            if (show) {
              f.label.x = f.x;
              f.label.y = f.y + 62;
            }
          }
        });
      }

      checkAnswerCollision() {
        this.answerFish.forEach((f) => {
          if (!f.active) return;
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, f.x, f.y);
          if (dist < 62 * this.player.scaleX) {
            f.correct ? this.eatCorrect(f) : this.eatWrong(f);
          }
        });
      }

      checkPredatorCollision() {
        if (invincible) return;

        this.predators.forEach((p) => {
          if (!p.active) return;
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
          if (dist < 58 * this.player.scaleX + (p.scaleX > 1.45 ? 25 : 0)) {
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
              duration: 100,
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
          if (dist < 64 * this.player.scaleX) {
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
          if (dist < 66 * this.player.scaleX) {
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

      eatCorrect(f) {
        const gained = 10 + combo * 2;
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

        this.starPointer.x = Phaser.Math.Clamp(sx, 35, GAME_W - 35);
        this.starPointer.y = Phaser.Math.Clamp(sy, 26, GAME_H - 28);
      }

      drawMiniMap() {
        if (!miniMapRef.current) return;

        const canvas = miniMapRef.current;
        const ctx = canvas.getContext("2d");
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "rgba(2, 6, 23, 0.82)";
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
        this.predators.forEach((p) => dot(p.x, p.y, "#ef4444", p.scaleX > 1.45 ? 4 : 3));
        this.coins.filter((c) => c.active).forEach((c) => dot(c.x, c.y, "#facc15", 2));
        this.powerups.filter((p) => p.active).forEach((p) => dot(p.x, p.y, "#22c55e", 2));
      }

      floatText(x, y, text, color) {
        const item = this.add.text(x, y, text, {
          fontSize: "24px",
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
        const item = this.add.text(GAME_W / 2, 42, text, {
          fontSize: Math.max(18, GAME_W * 0.027) + "px",
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

        const xp = Math.max(20, Math.round(score / 2));
        const coins = Math.max(10, Math.round(score / 8));

        const panel = this.add.container(GAME_W / 2, GAME_H / 2).setScrollFactor(0).setDepth(500);
        const panelW = Math.min(620, GAME_W * 0.88);
        const panelH = Math.min(310, GAME_H * 0.76);
        const bg = this.add.rectangle(0, 0, panelW, panelH, 0x0f172a, 0.97);
        bg.setStrokeStyle(3, 0x38bdf8, 0.7);

        const title = this.add.text(0, -panelH * 0.34, "🐟 OCEAN COMPLETE", {
          fontSize: Math.max(22, GAME_W * 0.04) + "px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 6,
        }).setOrigin(0.5);

        const reasonText = this.add.text(0, -panelH * 0.12, reason, {
          fontSize: Math.max(15, GAME_W * 0.026) + "px",
          color: "#38bdf8",
          fontFamily: "Arial",
          fontStyle: "bold",
        }).setOrigin(0.5);

        const scoreText = this.add.text(0, panelH * 0.08, `Score: ${score} · Level: ${level} · Combo: ${combo}`, {
          fontSize: Math.max(15, GAME_W * 0.027) + "px",
          color: "#facc15",
          fontFamily: "Arial",
          fontStyle: "bold",
        }).setOrigin(0.5);

        const rewardText = this.add.text(0, panelH * 0.27, `Reward: +${xp} XP · +${coins} Coins`, {
          fontSize: Math.max(15, GAME_W * 0.026) + "px",
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
            mode: "fish",
            gameName: "Fish Feeding",
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
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias: false,
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
  }, [questions, isPortraitMobile]);

  const healthRatio = Math.max(0, Math.min(1, hud.health / 100));

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

  if (isPortraitMobile) {
    return (
      <div
        className="fixed inset-0 z-[99999] grid bg-slate-950 text-white"
        style={{
          gridTemplateRows: "minmax(190px, 27dvh) minmax(190px, 56.25dvw) 1fr",
          width: "100dvw",
          height: "100dvh",
          overflow: "hidden",
          touchAction: "none",
          overscrollBehavior: "none",
        }}
      >
        <div className="relative overflow-hidden border-b border-cyan-400/30 bg-slate-950 px-4 pt-[max(16px,env(safe-area-inset-top))]">
          <button
            onClick={onExit}
            className="absolute right-4 top-[max(16px,env(safe-area-inset-top))] z-[100001] rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white shadow-lg active:scale-95"
          >
            EXIT
          </button>

          <div className="pr-20 text-lg font-black leading-tight drop-shadow">
            Q{hud.current}. {hud.question}
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 text-xs font-black">
            <div>Score: {hud.score}</div>
            <div className="text-green-300">HP: {hud.health}</div>
            <div className="text-blue-300">Combo: {hud.combo}</div>
            <div className="text-purple-300">Lv: {hud.level}{hud.shield > 0 ? ` 🛡${hud.shield}` : ""}</div>
          </div>

          <div className="mt-3 h-2.5 rounded-full bg-slate-800">
            <div
              className="h-2.5 rounded-full bg-green-500"
              style={{ width: `${healthRatio * 100}%` }}
            />
          </div>

          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="text-xs font-bold leading-snug text-slate-200">
              {hud.message}
            </div>
            <canvas
              ref={miniMapRef}
              width={150}
              height={86}
              className="h-[76px] w-[132px] shrink-0 rounded border border-cyan-400/60 bg-slate-950"
            />
          </div>
        </div>

        <div ref={gameWrapRef} className="relative h-full w-full overflow-hidden bg-slate-900" />

        <div
          className="relative flex flex-col items-center justify-center border-t border-cyan-400/30 bg-slate-950"
          onTouchStart={handleJoyMove}
          onTouchMove={handleJoyMove}
          onTouchEnd={stopJoystick}
          onTouchCancel={stopJoystick}
          onMouseDown={handleJoyMove}
          onMouseMove={(e) => {
            if (e.buttons === 1) handleJoyMove(e);
          }}
          onMouseUp={stopJoystick}
          style={{ touchAction: "none" }}
        >
          <div className="mb-2 text-xs font-black text-cyan-200">
            Joystick area • Chase ⭐ answer fish
          </div>

          <div className="relative h-36 w-36 rounded-full border-4 border-cyan-400/60 bg-cyan-300/10 shadow-[0_0_35px_rgba(34,211,238,0.25)]">
            <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30 bg-white/10" />
            <div
              data-joy-knob
              className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-cyan-300 bg-white/40 shadow-xl"
            />
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
      <button
        onClick={onExit}
        className="fixed right-5 top-5 z-[100001] rounded-xl bg-red-500 px-5 py-3 text-sm font-black text-white shadow-xl hover:bg-red-600 active:scale-95"
      >
        EXIT
      </button>

      <div ref={gameWrapRef} className="h-full w-full bg-slate-950" />
    </div>
  );
}
