import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

/**
 * FishGame_OceanSurvival_Advanced_V3
 * Path: src/components/games/FishGame.jsx
 *
 * Advanced landscape survival loop:
 * Move fish -> chase answer fish -> eat correct fish -> grow -> gain combo
 * Includes wider landscape canvas, predators, coins, answer fish, minimap, and mobile rotate warning.
 */
export default function FishGame({ questions = [], topic = "Study Topic", onExit, onReward }) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const rewardSentRef = useRef(false);
  const questionsRef = useRef(questions);
  const rewardRef = useRef(onReward);

  const [hud, setHud] = useState({
    score: 0,
    health: 100,
    combo: 0,
    level: 1,
    current: 1,
    total: Math.max(questions.length, 1),
    message: "Explore the ocean. Follow ⭐, eat correct fish, avoid predators.",
  });

  useEffect(() => {
    questionsRef.current = questions;
    rewardRef.current = onReward;
  }, [questions, onReward]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

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

    const safeQuestions = questionsRef.current?.length ? questionsRef.current : fallbackQuestions;
    const WORLD_W = 3400;
    const WORLD_H = 1900;

    let score = 0;
    let health = 100;
    let combo = 0;
    let level = 1;
    let current = 0;
    let ended = false;
    let invincible = false;
    let shield = 0;

    const syncHud = (message) => {
      setHud({
        score,
        health,
        combo,
        level,
        shield,
        current: Math.min(current + 1, safeQuestions.length),
        total: safeQuestions.length,
        message,
      });
    };

    class OceanScene extends Phaser.Scene {
      constructor() {
        super("OceanSurvivalLearning");
        this.player = null;
        this.answerFish = [];
        this.backgroundFish = [];
        this.predators = [];
        this.coins = [];
        this.powerups = [];
        this.labels = [];
        this.miniDots = [];
        this.targetX = WORLD_W * 0.18;
        this.targetY = WORLD_H * 0.5;
      }

      create() {
        this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
        this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);

        this.createWorld();
        this.createBackgroundLife();
        this.createPlayer();
        this.createPredators();
        this.createCoins();
        this.createPowerups();
        this.createFixedHud();
        this.createMiniMap();
        this.loadQuestion();

        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        this.input.on("pointermove", (p) => this.updateTargetFromPointer(p));
        this.input.on("pointerdown", (p) => this.updateTargetFromPointer(p));

        this.time.addEvent({
          delay: 1000,
          loop: true,
          callback: () => {
            if (ended) return;
            health = Math.max(0, health - 0.35);
            this.updateHealthBar();
            if (health <= 0) return this.endGame("Your fish ran out of health!");
            syncHud("Find the glowing answer fish. Avoid skull predators.");
          },
        });

        this.time.addEvent({
          delay: 80,
          loop: true,
          callback: () => !ended && this.updateMiniMap(),
        });
      }

      update() {
        if (ended || !this.player) return;
        this.movePlayer();
        this.moveRoamingFish();
        this.checkAnswerCollision();
        this.checkPredatorCollision();
        this.checkCoinCollision();
        this.checkPowerupCollision();
        this.updateAnswerPointer();
      }

      updateTargetFromPointer(pointer) {
        if (ended) return;
        const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.targetX = Phaser.Math.Clamp(world.x, 60, WORLD_W - 60);
        this.targetY = Phaser.Math.Clamp(world.y, 90, WORLD_H - 80);
      }

      createWorld() {
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0891b2, 0x0e7490, 0x164e63, 0x020617, 1);
        bg.fillRect(0, 0, WORLD_W, WORLD_H);

        for (let i = 0; i < 150; i++) {
          const b = this.add.circle(
            Phaser.Math.Between(0, WORLD_W),
            Phaser.Math.Between(0, WORLD_H),
            Phaser.Math.Between(2, 6),
            0xffffff,
            Phaser.Math.FloatBetween(0.08, 0.25)
          );
          this.tweens.add({
            targets: b,
            y: b.y - Phaser.Math.Between(160, 420),
            x: b.x + Phaser.Math.Between(-40, 40),
            alpha: 0,
            duration: Phaser.Math.Between(2500, 7000),
            repeat: -1,
            onRepeat: () => {
              b.y = WORLD_H + Phaser.Math.Between(20, 140);
              b.x = Phaser.Math.Between(0, WORLD_W);
              b.alpha = Phaser.Math.FloatBetween(0.08, 0.25);
            },
          });
        }

        for (let i = 0; i < 70; i++) {
          this.add.ellipse(
            Phaser.Math.Between(0, WORLD_W),
            WORLD_H - Phaser.Math.Between(15, 80),
            Phaser.Math.Between(55, 160),
            Phaser.Math.Between(22, 58),
            0x1f2937,
            Phaser.Math.FloatBetween(0.35, 0.75)
          );
        }

        for (let i = 0; i < 70; i++) {
          const seaweed = this.add.text(
            Phaser.Math.Between(0, WORLD_W),
            WORLD_H - Phaser.Math.Between(90, 135),
            "🌿",
            { fontSize: Phaser.Math.Between(28, 56) + "px" }
          );
          this.tweens.add({
            targets: seaweed,
            angle: Phaser.Math.Between(-8, 8),
            duration: Phaser.Math.Between(850, 1600),
            yoyo: true,
            repeat: -1,
          });
        }

        for (let i = 0; i < 35; i++) {
          this.add.text(
            Phaser.Math.Between(0, WORLD_W),
            Phaser.Math.Between(250, WORLD_H - 220),
            ["🪸", "🐚", "🪨"][Phaser.Math.Between(0, 2)],
            { fontSize: Phaser.Math.Between(28, 52) + "px" }
          );
        }
      }

      createBackgroundLife() {
        for (let i = 0; i < 24; i++) {
          const f = this.makeFish(
            Phaser.Math.Between(150, WORLD_W - 150),
            Phaser.Math.Between(160, WORLD_H - 160),
            [0x38bdf8, 0x22c55e, 0xa855f7, 0xf97316, 0xec4899][Phaser.Math.Between(0, 4)],
            "",
            Phaser.Math.FloatBetween(0.45, 0.72),
            false
          );
          f.speed = Phaser.Math.Between(35, 75);
          f.dir = new Phaser.Math.Vector2(
            Phaser.Math.FloatBetween(-1, 1),
            Phaser.Math.FloatBetween(-0.4, 0.4)
          ).normalize();
          this.physics.add.existing(f);
          f.body.setCircle(25);
          f.body.setCollideWorldBounds(true);
          f.setAlpha(0.55);
          f.setDepth(12);
          this.backgroundFish.push(f);
        }
      }

      createPlayer() {
        this.player = this.makeFish(WORLD_W * 0.18, WORLD_H * 0.5, 0xf97316, "", 1.15, true);
        this.player.setDepth(80);
        this.physics.add.existing(this.player);
        this.player.body.setCircle(44);
        this.player.body.setCollideWorldBounds(true);
      }

      makeFish(x, y, color, icon = "", size = 1, isPlayer = false) {
        const fish = this.add.container(x, y);
        const glow = this.add.circle(0, 0, 55 * size, color, isPlayer ? 0.11 : 0.06);
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
        this.tweens.add({ targets: tail, scaleX: 1.28, duration: 150, yoyo: true, repeat: -1 });
        return fish;
      }

      createPredators() {
        for (let i = 0; i < 7; i++) {
          const p = this.makeFish(
            Phaser.Math.Between(500, WORLD_W - 160),
            Phaser.Math.Between(150, WORLD_H - 170),
            0x334155,
            "☠",
            Phaser.Math.FloatBetween(1.05, 1.35)
          );
          p.damage = Phaser.Math.Between(7, 13);
          p.speed = Phaser.Math.Between(75, 120);
          p.dir = new Phaser.Math.Vector2(Phaser.Math.FloatBetween(-1, 1), Phaser.Math.FloatBetween(-1, 1)).normalize();
          this.physics.add.existing(p);
          p.body.setCircle(45);
          p.body.setCollideWorldBounds(true);
          this.predators.push(p);
        }

        const boss = this.makeFish(WORLD_W * 0.78, WORLD_H * 0.2, 0x111827, "🦈", 1.55);
        boss.damage = 18;
        boss.speed = 72;
        boss.dir = new Phaser.Math.Vector2(-1, 0.35).normalize();
        this.physics.add.existing(boss);
        boss.body.setCircle(58);
        boss.body.setCollideWorldBounds(true);
        boss.setDepth(51);
        this.predators.push(boss);
      }

      createCoins() {
        for (let i = 0; i < 22; i++) {
          const c = this.add.container(Phaser.Math.Between(260, WORLD_W - 160), Phaser.Math.Between(160, WORLD_H - 160));
          c.add(this.add.circle(0, 0, 34, 0xfacc15, 0.14));
          c.add(this.add.circle(0, 0, 18, 0xfacc15));
          c.add(this.add.text(0, 0, "$", { fontSize: "20px", color: "#78350f", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5));
          this.physics.add.existing(c);
          c.body.setCircle(22);
          this.tweens.add({ targets: c, scaleX: 1.18, scaleY: 1.18, duration: 500, yoyo: true, repeat: -1 });
          this.coins.push(c);
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
          this.tweens.add({ targets: p, y: p.y + 18, scaleX: 1.12, scaleY: 1.12, duration: 780, yoyo: true, repeat: -1 });
          this.powerups.push(p);
        }
      }

      createFixedHud() {
        const hud = this.add.container(0, 0).setScrollFactor(0).setDepth(500);
        hud.add(this.add.rectangle(800, 34, 1600, 68, 0x020617, 0.72));
        this.questionText = this.add.text(28, 18, "", {
          fontSize: "22px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
          wordWrap: { width: 980 },
          stroke: "#000000",
          strokeThickness: 5,
        });
        hud.add(this.questionText);
        hud.add(this.add.rectangle(1340, 34, 310, 20, 0x0f172a, 0.92));
        this.healthBar = this.add.rectangle(1185, 34, 310, 14, 0x22c55e, 1).setOrigin(0, 0.5);
        hud.add(this.healthBar);
        this.pointerStar = this.add.text(800, 110, "⭐", { fontSize: "32px" }).setOrigin(0.5).setScrollFactor(0).setDepth(510);
      }

      createMiniMap() {
        this.map = this.add.container(1390, 138).setScrollFactor(0).setDepth(520);
        const bg = this.add.rectangle(0, 0, 310, 178, 0x020617, 0.72);
        bg.setStrokeStyle(2, 0x38bdf8, 0.55);
        this.map.add(bg);
        this.map.add(this.add.text(-142, -82, "MAP", { fontSize: "13px", color: "#93c5fd", fontFamily: "Arial", fontStyle: "bold" }));
      }

      shuffleOptions(options) {
        const arr = [...options];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Phaser.Math.Between(0, i);
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      }

      clearAnswers() {
        this.answerFish.forEach((f) => f.destroy());
        this.labels.forEach((l) => l.destroy());
        this.answerFish = [];
        this.labels = [];
      }

      loadQuestion() {
        this.clearAnswers();
        if (current >= safeQuestions.length) return this.endGame("Ocean level complete!");
        const q = safeQuestions[current];
        this.questionText.setText(`Q${current + 1}. ${q.question}`);
        const options = this.shuffleOptions([...new Set([...(q.options || []), q.answer])]).slice(0, 4);
        const spots = [
          [WORLD_W * 0.62, WORLD_H * 0.28],
          [WORLD_W * 0.82, WORLD_H * 0.42],
          [WORLD_W * 0.55, WORLD_H * 0.72],
          [WORLD_W * 0.78, WORLD_H * 0.78],
        ];
        options.forEach((answer, i) => {
          const correct = String(answer).toLowerCase() === String(q.answer).toLowerCase();
          const f = this.makeFish(spots[i][0], spots[i][1], correct ? 0xfacc15 : [0x38bdf8, 0x22c55e, 0xa855f7, 0xef4444][i], correct ? "⭐" : "", correct ? 1.15 : 1);
          f.answer = answer;
          f.correct = correct;
          f.speed = Phaser.Math.Between(85, 145);
          f.dir = new Phaser.Math.Vector2(Phaser.Math.FloatBetween(-1, 1), Phaser.Math.FloatBetween(-1, 1)).normalize();
          this.physics.add.existing(f);
          f.body.setCircle(42);
          f.body.setCollideWorldBounds(true);
          if (correct) this.tweens.add({ targets: f.glow, alpha: 0.35, scaleX: 1.25, scaleY: 1.25, duration: 650, yoyo: true, repeat: -1 });
          const label = this.add.text(f.x, f.y + 58, answer, { fontSize: "20px", color: "#fff", fontFamily: "Arial", fontStyle: "bold", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5);
          f.label = label;
          this.answerFish.push(f);
          this.labels.push(label);
        });
        syncHud("Find the glowing correct answer fish on the mini-map.");
      }

      movePlayer() {
        const dx = this.targetX - this.player.x;
        const dy = this.targetY - this.player.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 8) {
          const angle = Math.atan2(dy, dx);
          const speed = 325 + level * 18;
          this.player.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
          this.player.rotation = angle;
        } else this.player.body.setVelocity(0, 0);
        const size = Math.min(1.85, 1 + (level - 1) * 0.08);
        this.player.scaleX = size;
        this.player.scaleY = size;
      }

      moveRoamingFish() {
        [...this.answerFish, ...this.predators, ...this.backgroundFish].forEach((f) => {
          if (!f.active) return;
          const chase = this.predators.includes(f) && Phaser.Math.Distance.Between(f.x, f.y, this.player.x, this.player.y) < (f.scaleX > 1.45 ? 520 : 360);
          if (chase) {
            const a = Phaser.Math.Angle.Between(f.x, f.y, this.player.x, this.player.y);
            f.body.setVelocity(Math.cos(a) * f.speed * (f.scaleX > 1.45 ? 1.1 : 1.28), Math.sin(a) * f.speed * (f.scaleX > 1.45 ? 1.1 : 1.28));
            f.rotation = a;
          } else {
            f.body.setVelocity(f.dir.x * f.speed, f.dir.y * f.speed);
            f.rotation = Math.atan2(f.dir.y, f.dir.x);
          }
          if (f.x < 90 || f.x > WORLD_W - 90) f.dir.x *= -1;
          if (f.y < 105 || f.y > WORLD_H - 95) f.dir.y *= -1;
          if (f.label) {
            f.label.x = f.x;
            f.label.y = f.y + 58;
          }
        });
      }

      checkAnswerCollision() {
        this.answerFish.forEach((f) => {
          if (!f.active) return;
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, f.x, f.y);
          if (dist < 62 * this.player.scaleX) f.correct ? this.eatCorrect(f) : this.eatWrong(f);
        });
      }

      checkPredatorCollision() {
        if (invincible) return;
        this.predators.forEach((p) => {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
          if (dist < 62 * this.player.scaleX) {
            invincible = true;
            if (shield > 0) {
              shield -= 1;
              this.centerMessage("SHIELD BLOCKED!", "#38bdf8");
              this.burst(this.player.x, this.player.y, 0x38bdf8, true);
            } else {
              health = Math.max(0, health - p.damage);
              combo = 0;
              this.centerMessage(`PREDATOR HIT -${p.damage}`, "#ef4444");
              this.cameras.main.shake(180, 0.006);
              this.burst(this.player.x, this.player.y, 0xef4444, false);
            }
            this.updateHealthBar();
            syncHud(shield > 0 ? "Shield protected you." : "Predator attacked. Avoid skull fish.");
            this.tweens.add({ targets: this.player, alpha: 0.35, duration: 110, yoyo: true, repeat: 5, onComplete: () => { this.player.alpha = 1; invincible = false; } });
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
            this.floatText(c.x, c.y - 40, "+5 COIN", "#facc15");
            this.burst(c.x, c.y, 0xfacc15, true);
            c.destroy();
            syncHud("Treasure collected! +5 score.");
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
              this.burst(p.x, p.y, 0x22c55e, true);
            }
            if (p.powerType === "shield") {
              shield = Math.min(3, shield + 1);
              this.centerMessage("SHIELD +1", "#38bdf8");
              this.burst(p.x, p.y, 0x38bdf8, true);
            }
            if (p.powerType === "speed") {
              score += 8;
              this.centerMessage("SPEED BONUS +8", "#facc15");
              this.burst(p.x, p.y, 0xfacc15, true);
            }
            p.destroy();
            this.updateHealthBar();
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
        this.burst(f.x, f.y, 0x22c55e, true);
        this.floatText(f.x, f.y - 60, `+${gained} SCORE`, "#22c55e");
        if (combo >= 5) this.centerMessage(`COMBO x${combo}!`, "#facc15");
        else this.centerMessage("CORRECT FISH EATEN!", "#22c55e");
        f.label?.destroy();
        f.destroy();
        this.updateHealthBar();
        current += 1;
        this.time.delayedCall(550, () => current >= safeQuestions.length ? this.endGame("Ocean level complete!") : this.loadQuestion());
        syncHud("Correct! Your fish grew bigger.");
      }

      eatWrong(f) {
        health = Math.max(0, health - 18);
        score = Math.max(0, score - 4);
        combo = 0;
        this.burst(f.x, f.y, 0xef4444, false);
        this.floatText(f.x, f.y - 60, "-18 HEALTH", "#ef4444");
        this.centerMessage("WRONG FISH!", "#ef4444");
        this.cameras.main.shake(160, 0.006);
        f.label?.destroy();
        f.destroy();
        this.updateHealthBar();
        current += 1;
        if (health <= 0) return this.time.delayedCall(550, () => this.endGame("Wrong fish made you lose health!"));
        this.time.delayedCall(550, () => current >= safeQuestions.length ? this.endGame("Ocean level complete!") : this.loadQuestion());
        syncHud("Wrong answer fish. Health decreased.");
      }

      updateAnswerPointer() {
        const correct = this.answerFish.find((f) => f.active && f.correct);
        if (!correct) return this.pointerStar.setVisible(false);
        this.pointerStar.setVisible(true);
        const cam = this.cameras.main;
        const sx = correct.x - cam.scrollX;
        const sy = correct.y - cam.scrollY;
        this.pointerStar.x = Phaser.Math.Clamp(sx, 70, cam.width - 70);
        this.pointerStar.y = Phaser.Math.Clamp(sy, 110, cam.height - 70);
      }

      updateMiniMap() {
        if (!this.map) return;
        this.miniDots.forEach((d) => d.destroy());
        this.miniDots = [];
        const mapW = 310, mapH = 178, sx = mapW / WORLD_W, sy = mapH / WORLD_H;
        const dot = (x, y, color, r = 4) => {
          const d = this.add.circle(-mapW / 2 + x * sx, -mapH / 2 + y * sy, r, color);
          this.map.add(d); this.miniDots.push(d);
        };
        dot(this.player.x, this.player.y, 0xf97316, 5);
        const correct = this.answerFish.find((f) => f.active && f.correct);
        if (correct) dot(correct.x, correct.y, 0xfacc15, 5);
        this.predators.forEach((p) => dot(p.x, p.y, 0xef4444, 3));
        this.coins.filter((c) => c.active).forEach((c) => dot(c.x, c.y, 0xfacc15, 2));
        this.powerups.filter((p) => p.active).forEach((p) => dot(p.x, p.y, 0x22c55e, 2));
      }

      updateHealthBar() {
        const ratio = Phaser.Math.Clamp(health / 100, 0, 1);
        this.healthBar.width = 310 * ratio;
        if (health > 60) this.healthBar.setFillStyle(0x22c55e);
        else if (health > 30) this.healthBar.setFillStyle(0xfacc15);
        else this.healthBar.setFillStyle(0xef4444);
      }

      burst(x, y, color, correct) {
        for (let i = 0; i < (correct ? 38 : 24); i++) {
          const p = this.add.circle(x, y, Phaser.Math.Between(3, 8), color, Phaser.Math.FloatBetween(0.75, 1)).setDepth(130);
          this.tweens.add({ targets: p, x: x + Phaser.Math.Between(-130, 130), y: y + Phaser.Math.Between(-115, 115), alpha: 0, scale: 0, duration: correct ? 680 : 470, ease: "Cubic.out", onComplete: () => p.destroy() });
        }
      }

      floatText(x, y, text, color) {
        const item = this.add.text(x, y, text, { fontSize: "24px", color, fontFamily: "Arial", fontStyle: "bold", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setDepth(135);
        this.tweens.add({ targets: item, y: y - 48, alpha: 0, scale: 1.12, duration: 850, onComplete: () => item.destroy() });
      }

      centerMessage(text, color) {
        const item = this.add.text(800, 130, text, { fontSize: "30px", color, fontFamily: "Arial", fontStyle: "bold", stroke: "#000", strokeThickness: 6 }).setOrigin(0.5).setScrollFactor(0).setDepth(550);
        this.tweens.add({ targets: item, y: 90, alpha: 0, scale: 1.15, duration: 900, onComplete: () => item.destroy() });
      }

      endGame(reason = "Game complete!") {
        if (ended) return;
        ended = true;
        this.clearAnswers();
        const xp = Math.max(20, Math.round(score / 2));
        const coins = Math.max(10, Math.round(score / 8));
        const panel = this.add.container(800, 450).setScrollFactor(0).setDepth(700);
        const bg = this.add.rectangle(0, 0, 700, 390, 0x0f172a, 0.97);
        bg.setStrokeStyle(3, 0x38bdf8, 0.65);
        panel.add(bg);
        panel.add(this.add.text(0, -145, "🐟 OCEAN SURVIVAL COMPLETE", { fontSize: "34px", color: "#fff", fontFamily: "Arial", fontStyle: "bold", stroke: "#000", strokeThickness: 7 }).setOrigin(0.5));
        panel.add(this.add.text(0, -68, reason, { fontSize: "22px", color: "#38bdf8", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5));
        panel.add(this.add.text(0, 0, `Score: ${score} · Level: ${level} · Combo: ${combo}`, { fontSize: "23px", color: "#facc15", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5));
        panel.add(this.add.text(0, 68, `Reward: +${xp} XP · +${coins} Coins`, { fontSize: "22px", color: "#22c55e", fontFamily: "Arial" }).setOrigin(0.5));
        panel.add(this.add.text(0, 130, "Click Exit button to return to Student OS", { fontSize: "16px", color: "#cbd5e1", fontFamily: "Arial" }).setOrigin(0.5));
        syncHud("Game complete.");
        if (!rewardSentRef.current && typeof rewardRef.current === "function") {
          rewardSentRef.current = true;
          rewardRef.current({ xp, coins, score, total: safeQuestions.length, mode: "fish-ocean-advanced-v3" });
        }
      }
    }

    const config = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 1600,
      height: 900,
      backgroundColor: "#020617",
      scene: OceanScene,
      physics: { default: "arcade", arcade: { gravity: { y: 0 }, debug: false } },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    };

    gameRef.current = new Phaser.Game(config);
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[99999] overflow-hidden bg-slate-950 text-white">
      <div className="portrait-warning flex h-screen w-screen items-center justify-center bg-slate-950 p-6 text-center text-white landscape:hidden">
        <div className="max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
          <div className="text-6xl">📱↔️</div>
          <h1 className="mt-4 text-2xl font-black">Rotate Your Phone</h1>
          <p className="mt-3 text-slate-300">Ocean Survival is designed like a real game. Turn your phone to landscape mode for best gameplay.</p>
          <button onClick={onExit} className="mt-6 rounded-2xl bg-red-500 px-5 py-3 font-bold text-white hover:bg-red-600">Exit Game</button>
        </div>
      </div>

      <div className="hidden h-screen w-screen flex-col landscape:flex">
        <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-950/95 p-3 shadow-2xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black sm:text-3xl">🐟 Ocean Survival Advanced</h1>
            <p className="text-xs text-slate-400 sm:text-sm">{topic || "Study Topic"} · large ocean map · predators · minimap · powerups</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold sm:text-sm">Score: {hud.score}</div>
            <div className="rounded-xl bg-green-400/10 px-3 py-2 text-xs font-bold text-green-300 sm:text-sm">Health: {Math.round(hud.health)}</div>
            <div className="rounded-xl bg-blue-400/10 px-3 py-2 text-xs font-bold text-blue-300 sm:text-sm">Combo: {hud.combo}</div>
            <div className="rounded-xl bg-purple-400/10 px-3 py-2 text-xs font-bold text-purple-300 sm:text-sm">Level: {hud.level}</div>
            <div className="rounded-xl bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-300 sm:text-sm">Shield: {hud.shield}</div>
            <div className="rounded-xl bg-yellow-400/10 px-3 py-2 text-xs font-bold text-yellow-300 sm:text-sm">Q: {hud.current}/{hud.total}</div>
            <button onClick={onExit} className="rounded-xl bg-red-500 px-4 py-2 text-xs font-bold text-white hover:bg-red-600 sm:text-sm">Exit</button>
          </div>
        </div>
        <div className="border-b border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200">{hud.message}</div>
        <div ref={containerRef} className="h-full min-h-0 w-full flex-1 bg-slate-900" />
      </div>
    </div>
  );
}
