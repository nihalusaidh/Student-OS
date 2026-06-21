import { useEffect, useRef } from "react";
import Phaser from "phaser";

/**
 * FishGame V6.2 - Mobile Dynamic Joystick
 * Path: src/components/games/FishGame.jsx
 *
 * Goal:
 * Keep features, but make mobile smoother.
 *
 * Main optimizations:
 * - Phaser.WEBGL forced
 * - React HUD removed during gameplay
 * - HUD drawn inside Phaser only
 * - No React setState loop while game runs
 * - Static decorations batched using Graphics/text with no physics
 * - Physics only for moving gameplay objects
 * - Minimap updates slower
 * - Particle effects use short pooled-looking lightweight circles
 * - Labels are hidden when far from player
 * - Objects far from player are less visually active
 */

export default function FishGame({
  questions = [],
  topic = "Study Topic",
  onExit,
  onReward,
}) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const rewardSentRef = useRef(false);
  const questionsRef = useRef(questions);
  const rewardRef = useRef(onReward);
  const exitRef = useRef(onExit);

  useEffect(() => {
    questionsRef.current = questions;
    rewardRef.current = onReward;
    exitRef.current = onExit;
  }, [questions, onReward, onExit]);

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

    const screenW = Math.max(window.innerWidth || 960, 360);
    const screenH = Math.max(window.innerHeight || 540, 240);

    const isMobileDevice =
      window.matchMedia("(pointer: coarse)").matches ||
      screenW <= 950 ||
      screenH <= 650;

    const GAME_W = screenW;
    const GAME_H = screenH;
    const WORLD_W = 3400;
    const WORLD_H = 1900;

    let gameReady = false;

    let score = 0;
    let health = 100;
    let combo = 0;
    let level = 1;
    let shield = 0;
    let current = 0;
    let ended = false;
    let invincible = false;
    let speedBoostUntil = 0;

    class OceanScene extends Phaser.Scene {
      constructor() {
        super("OceanSurvivalPerformanceV5");

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

        this.questionText = null;
        this.hudScore = null;
        this.hudHealth = null;
        this.hudCombo = null;
        this.hudLevel = null;
        this.hudShield = null;
        this.hudQuestion = null;
        this.messageText = null;
        this.healthBar = null;
        this.pointerStar = null;
        this.map = null;
        this.exitButton = null;
        this.loadingPanel = null;

        this.joyBase = null;
        this.joyKnob = null;
        this.joystickActive = false;
        this.joystickPointerId = null;
        this.joystickVector = new Phaser.Math.Vector2(0, 0);
        this.joyRadius = Math.max(54, Math.min(82, GAME_W * 0.07));
        this.joyCenterX = Math.max(90, GAME_W * 0.12);
        this.joyCenterY = Math.max(150, GAME_H * 0.78);
        this.dynamicJoy = true;

        this.lastMiniMapUpdate = 0;
        this.lastHudUpdate = 0;
        this.lastCullUpdate = 0;
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
        this.createLoadingScreen();

        this.cameras.main.startFollow(this.player, true, 0.09, 0.09);

        this.input.on("pointerdown", (p) => this.handlePointerDown(p));
        this.input.on("pointermove", (p) => this.handlePointerMove(p));
        this.input.on("pointerup", (p) => this.handlePointerUp(p));
        this.input.on("pointerupoutside", (p) => this.handlePointerUp(p));

        if (isMobileDevice) this.createGlassJoystick();

        this.time.delayedCall(1000, () => {
          gameReady = true;
          this.hideLoadingScreen();
          this.setMessage(isMobileDevice ? "Touch anywhere on left side to move like joystick. Chase ⭐ answer fish." : "Move with mouse/touch. Chase ⭐ answer fish.");
        });

        this.time.addEvent({
          delay: 1000,
          loop: true,
          callback: () => {
            if (ended) return;

            health = Math.max(0, health - 0.3);

            if (health <= 0) {
              this.endGame("Your fish ran out of health!");
              return;
            }

            this.setMessage("Find ⭐ answer fish. Avoid ☠ predators. Collect coins and powerups.");
            this.updateHud();
          },
        });
      }

      update(time) {
        if (ended || !this.player || !gameReady) return;

        this.movePlayer(time);
        this.moveRoamingFish();
        this.checkAnswerCollision();
        this.checkPredatorCollision();
        this.checkCoinCollision();
        this.checkPowerupCollision();
        this.updateAnswerPointer();

        if (time - this.lastMiniMapUpdate > 220) {
          this.updateMiniMap();
          this.lastMiniMapUpdate = time;
        }

        if (time - this.lastHudUpdate > 160) {
          this.updateHud();
          this.lastHudUpdate = time;
        }

        if (time - this.lastCullUpdate > 400) {
          this.updateVisibilityCulling();
          this.lastCullUpdate = time;
        }
      }

      handlePointerDown(pointer) {
        if (ended) return;

        if (isMobileDevice) {
          // BGMI-style floating joystick:
          // wherever the user touches on the left side, joystick appears there.
          if (pointer.x < GAME_W * 0.52 && pointer.y > GAME_H * 0.18) {
            this.joystickActive = true;
            this.joystickPointerId = pointer.id;

            this.joyCenterX = Phaser.Math.Clamp(pointer.x, this.joyRadius + 18, GAME_W * 0.48);
            this.joyCenterY = Phaser.Math.Clamp(pointer.y, GAME_H * 0.24, GAME_H - this.joyRadius - 18);

            this.moveJoystickBase(this.joyCenterX, this.joyCenterY);
            this.updateJoystick(pointer);
            return;
          }
        }

        this.updateTargetFromPointer(pointer);
      }

      handlePointerMove(pointer) {
        if (ended) return;

        if (isMobileDevice && this.joystickActive && pointer.id === this.joystickPointerId) {
          this.updateJoystick(pointer);
          return;
        }

        if (!isMobileDevice) this.updateTargetFromPointer(pointer);
      }

      handlePointerUp(pointer) {
        if (!isMobileDevice) return;
        if (pointer.id !== this.joystickPointerId) return;

        this.joystickActive = false;
        this.joystickPointerId = null;
        this.joystickVector.set(0, 0);

        if (this.joyKnob) {
          this.tweens.add({
            targets: this.joyKnob,
            x: this.joyCenterX,
            y: this.joyCenterY,
            duration: 120,
            ease: "Sine.out",
          });
        }
      }

      moveJoystickBase(x, y) {
        if (!this.joyBase || !this.joyKnob) return;

        this.joyBase.x = x;
        this.joyBase.y = y;
        this.joyKnob.x = x;
        this.joyKnob.y = y;

        if (this.joyInner) {
          this.joyInner.x = x;
          this.joyInner.y = y;
        }

        if (this.joyLabel) {
          this.joyLabel.x = x;
          this.joyLabel.y = y + this.joyRadius + 20;
        }
      }

      updateJoystick(pointer) {
        if (!this.joyKnob) return;

        const dx = pointer.x - this.joyCenterX;
        const dy = pointer.y - this.joyCenterY;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len < 8) {
          this.joystickVector.set(0, 0);
          this.joyKnob.x = this.joyCenterX;
          this.joyKnob.y = this.joyCenterY;
          return;
        }

        const clamped = Math.min(len, this.joyRadius);
        const angle = Math.atan2(dy, dx);

        this.joyKnob.x = this.joyCenterX + Math.cos(angle) * clamped;
        this.joyKnob.y = this.joyCenterY + Math.sin(angle) * clamped;

        this.joystickVector.set(Math.cos(angle), Math.sin(angle));
      }

      updateTargetFromPointer(pointer) {
        if (ended) return;
        const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.targetX = Phaser.Math.Clamp(world.x, 70, WORLD_W - 70);
        this.targetY = Phaser.Math.Clamp(world.y, 100, WORLD_H - 90);
      }

      createLoadingScreen() {
        this.loadingPanel = this.add.container(GAME_W / 2, GAME_H / 2).setScrollFactor(0).setDepth(900);

        const bg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x020617, 0.92);
        const cardW = Math.min(620, GAME_W * 0.82);
        const cardH = Math.min(250, GAME_H * 0.55);
        const card = this.add.rectangle(0, 0, cardW, cardH, 0x0f172a, 0.96);
        card.setStrokeStyle(3, 0x38bdf8, 0.55);

        const title = this.add.text(0, -cardH * 0.25, "🌊 LOADING OCEAN", {
          fontSize: Math.max(24, Math.min(42, GAME_W * 0.032)) + "px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 7,
        }).setOrigin(0.5);

        const sub = this.add.text(0, 0, "Preparing smooth fullscreen mode...", {
          fontSize: Math.max(14, Math.min(20, GAME_W * 0.016)) + "px",
          color: "#cbd5e1",
          fontFamily: "Arial",
        }).setOrigin(0.5);

        const barBack = this.add.rectangle(0, cardH * 0.25, cardW * 0.68, 16, 0x020617, 1);
        const bar = this.add.rectangle(-(cardW * 0.34), cardH * 0.25, 0, 10, 0x38bdf8, 1).setOrigin(0, 0.5);

        this.loadingPanel.add([bg, card, title, sub, barBack, bar]);

        this.tweens.add({
          targets: bar,
          width: cardW * 0.68,
          duration: 900,
          ease: "Sine.out",
        });
      }

      hideLoadingScreen() {
        if (!this.loadingPanel) return;
        this.tweens.add({
          targets: this.loadingPanel,
          alpha: 0,
          duration: 220,
          onComplete: () => {
            this.loadingPanel.destroy();
            this.loadingPanel = null;
          },
        });
      }

      createGlassJoystick() {
        const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(650);

        this.joyBase = this.add.circle(this.joyCenterX, this.joyCenterY, this.joyRadius, 0x93c5fd, 0.17);
        this.joyBase.setStrokeStyle(4, 0x38bdf8, 0.55);

        this.joyInner = this.add.circle(this.joyCenterX, this.joyCenterY, this.joyRadius * 0.58, 0xffffff, 0.07);
        this.joyInner.setStrokeStyle(2, 0xffffff, 0.28);

        this.joyKnob = this.add.circle(this.joyCenterX, this.joyCenterY, this.joyRadius * 0.42, 0xffffff, 0.35);
        this.joyKnob.setStrokeStyle(4, 0x67e8f9, 0.85);

        this.joyLabel = this.add.text(this.joyCenterX, this.joyCenterY + this.joyRadius + 20, "TOUCH LEFT SIDE", {
          fontSize: Math.max(11, GAME_W * 0.011) + "px",
          color: "#bae6fd",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 4,
        }).setOrigin(0.5);

        layer.add([this.joyBase, this.joyInner, this.joyKnob, this.joyLabel]);

        this.tweens.add({
          targets: this.joyBase,
          alpha: 0.26,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 900,
          yoyo: true,
          repeat: -1,
        });
      }

      createWorld() {
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0891b2, 0x0e7490, 0x164e63, 0x020617, 1);
        bg.fillRect(0, 0, WORLD_W, WORLD_H);

        const staticLayer = this.add.graphics();
        staticLayer.setDepth(1);

        for (let i = 0; i < 125; i++) {
          staticLayer.fillStyle(0x1f2937, Phaser.Math.FloatBetween(0.35, 0.75));
          staticLayer.fillEllipse(
            Phaser.Math.Between(0, WORLD_W),
            WORLD_H - Phaser.Math.Between(15, 85),
            Phaser.Math.Between(55, 170),
            Phaser.Math.Between(22, 60)
          );
        }

        for (let i = 0; i < 7; i++) {
          staticLayer.fillStyle(0x020617, 0.08);
          staticLayer.fillEllipse(
            Phaser.Math.Between(250, WORLD_W - 250),
            Phaser.Math.Between(240, WORLD_H - 240),
            Phaser.Math.Between(520, 900),
            Phaser.Math.Between(260, 520)
          );
        }

        // Fewer animated bubbles, but drawn as simple circles with long tweens.
        for (let i = 0; i < 95; i++) {
          const bubble = this.add.circle(
            Phaser.Math.Between(0, WORLD_W),
            Phaser.Math.Between(0, WORLD_H),
            Phaser.Math.Between(2, 6),
            0xffffff,
            Phaser.Math.FloatBetween(0.06, 0.18)
          ).setDepth(3);

          this.tweens.add({
            targets: bubble,
            y: bubble.y - Phaser.Math.Between(180, 480),
            x: bubble.x + Phaser.Math.Between(-40, 40),
            alpha: 0,
            duration: Phaser.Math.Between(3600, 8500),
            repeat: -1,
            onRepeat: () => {
              bubble.y = WORLD_H + Phaser.Math.Between(20, 160);
              bubble.x = Phaser.Math.Between(0, WORLD_W);
              bubble.alpha = Phaser.Math.FloatBetween(0.06, 0.18);
            },
          });
        }

        // Decorations are static text, no physics.
        for (let i = 0; i < 70; i++) {
          const deco = this.add.text(
            Phaser.Math.Between(0, WORLD_W),
            Phaser.Math.Between(WORLD_H - 140, WORLD_H - 72),
            "🌿",
            { fontSize: Phaser.Math.Between(28, 56) + "px" }
          ).setDepth(4);

          if (i < 25) {
            this.tweens.add({
              targets: deco,
              angle: Phaser.Math.Between(-6, 6),
              duration: Phaser.Math.Between(1200, 2200),
              yoyo: true,
              repeat: -1,
            });
          }
        }

        for (let i = 0; i < 40; i++) {
          this.add.text(
            Phaser.Math.Between(0, WORLD_W),
            Phaser.Math.Between(240, WORLD_H - 230),
            ["🪸", "🐚", "🪨"][Phaser.Math.Between(0, 2)],
            { fontSize: Phaser.Math.Between(28, 52) + "px" }
          ).setDepth(4);
        }
      }

      createBackgroundLife() {
        for (let i = 0; i < 22; i++) {
          const f = this.makeFish(
            Phaser.Math.Between(150, WORLD_W - 150),
            Phaser.Math.Between(160, WORLD_H - 160),
            [0x38bdf8, 0x22c55e, 0xa855f7, 0xf97316, 0xec4899][Phaser.Math.Between(0, 4)],
            "",
            Phaser.Math.FloatBetween(0.45, 0.7),
            false
          );

          f.speed = Phaser.Math.Between(30, 70);
          f.dir = new Phaser.Math.Vector2(
            Phaser.Math.FloatBetween(-1, 1),
            Phaser.Math.FloatBetween(-0.4, 0.4)
          ).normalize();

          this.physics.add.existing(f);
          f.body.setCircle(24);
          f.body.setCollideWorldBounds(true);
          f.setAlpha(0.5);
          f.setDepth(12);

          this.backgroundFish.push(f);
        }
      }

      makeFish(x, y, color, icon = "", size = 1, isPlayer = false) {
        const fish = this.add.container(x, y);

        const glow = this.add.circle(0, 0, 55 * size, color, isPlayer ? 0.1 : 0.055);
        const tail = this.add.triangle(-56 * size, 0, 0, -30 * size, 0, 30 * size, -42 * size, 0, color);
        const body = this.add.ellipse(0, 0, 96 * size, 56 * size, color);
        const belly = this.add.ellipse(8 * size, 10 * size, 52 * size, 24 * size, 0xffffff, 0.2);
        const eye = this.add.circle(30 * size, -11 * size, 7 * size, 0xffffff);
        const pupil = this.add.circle(32 * size, -11 * size, 3 * size, 0x020617);

        fish.add([glow, tail, body, belly, eye, pupil]);

        if (icon) {
          fish.add(this.add.text(0, -42 * size, icon, { fontSize: 24 * size + "px" }).setOrigin(0.5));
        }

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

      createPlayer() {
        this.player = this.makeFish(WORLD_W * 0.18, WORLD_H * 0.5, 0xf97316, "", 1.15, true);
        this.player.setDepth(80);

        this.physics.add.existing(this.player);
        this.player.body.setCircle(44);
        this.player.body.setCollideWorldBounds(true);
      }

      createPredators() {
        for (let i = 0; i < 7; i++) {
          const predator = this.makeFish(
            Phaser.Math.Between(500, WORLD_W - 160),
            Phaser.Math.Between(150, WORLD_H - 170),
            0x334155,
            "☠",
            Phaser.Math.FloatBetween(1.05, 1.32)
          );

          predator.damage = Phaser.Math.Between(7, 13);
          predator.speed = Phaser.Math.Between(75, 118);
          predator.dir = new Phaser.Math.Vector2(
            Phaser.Math.FloatBetween(-1, 1),
            Phaser.Math.FloatBetween(-1, 1)
          ).normalize();

          this.physics.add.existing(predator);
          predator.body.setCircle(45);
          predator.body.setCollideWorldBounds(true);
          predator.setDepth(52);

          this.predators.push(predator);
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
        for (let i = 0; i < 22; i++) {
          const coin = this.add.container(
            Phaser.Math.Between(260, WORLD_W - 160),
            Phaser.Math.Between(160, WORLD_H - 160)
          ).setDepth(34);

          coin.add(this.add.circle(0, 0, 34, 0xfacc15, 0.14));
          coin.add(this.add.circle(0, 0, 18, 0xfacc15));
          coin.add(this.add.text(0, 0, "$", {
            fontSize: "20px",
            color: "#78350f",
            fontFamily: "Arial",
            fontStyle: "bold",
          }).setOrigin(0.5));

          this.physics.add.existing(coin);
          coin.body.setCircle(22);

          this.tweens.add({
            targets: coin,
            scaleX: 1.14,
            scaleY: 1.14,
            duration: 650,
            yoyo: true,
            repeat: -1,
          });

          this.coins.push(coin);
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

          this.tweens.add({
            targets: p,
            y: p.y + 18,
            duration: 980,
            yoyo: true,
            repeat: -1,
          });

          this.powerups.push(p);
        }
      }

      createFixedHud() {
        const hud = this.add.container(0, 0).setScrollFactor(0).setDepth(500);

        hud.add(this.add.rectangle(GAME_W / 2, 34, GAME_W, 68, 0x020617, 0.76));

        this.questionText = this.add.text(28, 16, "", {
          fontSize: "22px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
          wordWrap: { width: Math.max(320, GAME_W * 0.56) },
          stroke: "#000000",
          strokeThickness: 5,
        });
        hud.add(this.questionText);

        const pillStyle = {
          fontSize: "18px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
        };

        this.hudScore = this.add.text(GAME_W - 560, 18, "Score: 0", pillStyle);
        this.hudHealth = this.add.text(GAME_W - 440, 18, "Health: 100", { ...pillStyle, color: "#86efac" });
        this.hudCombo = this.add.text(GAME_W - 295, 18, "Combo: 0", { ...pillStyle, color: "#93c5fd" });
        this.hudLevel = this.add.text(GAME_W - 170, 18, "Lv: 1", { ...pillStyle, color: "#c4b5fd" });

        hud.add([this.hudScore, this.hudHealth, this.hudCombo, this.hudLevel]);

        hud.add(this.add.rectangle(GAME_W - 260, 56, 260, 16, 0x0f172a, 0.95));
        this.healthBar = this.add.rectangle(GAME_W - 390, 56, 260, 10, 0x22c55e, 1).setOrigin(0, 0.5);
        hud.add(this.healthBar);

        this.messageText = this.add.text(28, 74, "Loading ocean...", {
          fontSize: "17px",
          color: "#cbd5e1",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 4,
        }).setScrollFactor(0).setDepth(501);

        this.pointerStar = this.add.text(GAME_W / 2, 124, "⭐", {
          fontSize: "32px",
        }).setOrigin(0.5).setScrollFactor(0).setDepth(510);

        this.exitButton = this.add.text(GAME_W - 75, 86, "EXIT", {
          fontSize: "18px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
          backgroundColor: "#ef4444",
          padding: { x: 14, y: 9 },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(540).setInteractive({ useHandCursor: true });

        this.exitButton.on("pointerdown", () => {
          if (typeof exitRef.current === "function") exitRef.current();
        });

        this.updateHud();
      }

      createMiniMap() {
        this.map = this.add.container(GAME_W - 185, GAME_H * 0.30).setScrollFactor(0).setDepth(520);

        const bg = this.add.rectangle(0, 0, 310, 178, 0x020617, 0.72);
        bg.setStrokeStyle(2, 0x38bdf8, 0.55);

        const title = this.add.text(-142, -82, "MAP", {
          fontSize: "13px",
          color: "#93c5fd",
          fontFamily: "Arial",
          fontStyle: "bold",
        });

        this.map.add([bg, title]);
      }

      setMessage(message) {
        if (this.messageText) this.messageText.setText(message);
      }

      updateHud() {
        if (!this.hudScore) return;

        this.hudScore.setText(`Score: ${score}`);
        this.hudHealth.setText(`Health: ${Math.round(health)}`);
        this.hudCombo.setText(`Combo: ${combo}`);
        this.hudLevel.setText(`Lv: ${level}${shield > 0 ? ` 🛡${shield}` : ""}`);

        const ratio = Phaser.Math.Clamp(health / 100, 0, 1);
        this.healthBar.width = 260 * ratio;

        if (health > 60) this.healthBar.setFillStyle(0x22c55e);
        else if (health > 30) this.healthBar.setFillStyle(0xfacc15);
        else this.healthBar.setFillStyle(0xef4444);
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

      startRainbowAnswerFish(fish) {
        const colors = [0xfacc15, 0x22c55e, 0x38bdf8, 0xa855f7, 0xec4899, 0xffffff];
        let index = 0;

        this.time.addEvent({
          delay: 180,
          loop: true,
          callback: () => {
            if (!fish.active || !fish.glow?.active) return;
            index = (index + 1) % colors.length;
            fish.glow.setFillStyle(colors[index], 0.36);
          },
        });

        this.tweens.add({
          targets: fish.glow,
          alpha: 0.42,
          scaleX: 1.28,
          scaleY: 1.28,
          duration: 640,
          yoyo: true,
          repeat: -1,
        });
      }

      loadQuestion() {
        this.clearAnswers();

        if (current >= safeQuestions.length) {
          this.endGame("Ocean level complete!");
          return;
        }

        const q = safeQuestions[current];

        this.questionText.setText(`Q${current + 1}. ${q.question}`);

        const options = this.shuffleOptions([...new Set([...(q.options || []), q.answer])]).slice(0, 4);

        const baseX = Phaser.Math.Between(1100, WORLD_W - 650);
        const baseY = Phaser.Math.Between(300, WORLD_H - 520);

        const spots = [
          [baseX, baseY],
          [baseX + 460, baseY + 170],
          [baseX - 260, baseY + 420],
          [baseX + 540, baseY + 520],
        ];

        options.forEach((answer, i) => {
          const correct = String(answer).trim().toLowerCase() === String(q.answer).trim().toLowerCase();

          const fish = this.makeFish(
            Phaser.Math.Clamp(spots[i][0], 160, WORLD_W - 160),
            Phaser.Math.Clamp(spots[i][1], 150, WORLD_H - 160),
            correct ? 0xfacc15 : [0x38bdf8, 0x22c55e, 0xa855f7, 0xef4444][i],
            correct ? "⭐" : "",
            correct ? 1.18 : 1
          );

          fish.answer = answer;
          fish.correct = correct;
          fish.speed = Phaser.Math.Between(80, 136);
          fish.dir = new Phaser.Math.Vector2(
            Phaser.Math.FloatBetween(-1, 1),
            Phaser.Math.FloatBetween(-1, 1)
          ).normalize();

          this.physics.add.existing(fish);
          fish.body.setCircle(43);
          fish.body.setCollideWorldBounds(true);
          fish.setDepth(correct ? 60 : 45);

          if (correct) {
            this.startRainbowAnswerFish(fish);
          }

          const label = this.add.text(fish.x, fish.y + 62, answer, {
            fontSize: "21px",
            color: "#ffffff",
            fontFamily: "Arial",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 5,
          }).setOrigin(0.5).setDepth(61);

          fish.label = label;

          this.answerFish.push(fish);
          this.labels.push(label);
        });

        this.setMessage("Find ⭐ correct answer fish. Wrong fish reduce health.");
        this.updateHud();
      }

      movePlayer(time) {
        const boost = time < speedBoostUntil ? 55 : 0;
        const speed = 315 + level * 18 + boost;

        if (isMobileDevice) {
          if (this.joystickVector.length() > 0.05) {
            const angle = Math.atan2(this.joystickVector.y, this.joystickVector.x);
            this.player.body.setVelocity(this.joystickVector.x * speed, this.joystickVector.y * speed);
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

      moveRoamingFish() {
        const roamers = [...this.answerFish, ...this.predators, ...this.backgroundFish];

        roamers.forEach((f) => {
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
            const distanceToPlayer = Phaser.Math.Distance.Between(f.x, f.y, this.player.x, this.player.y);
            const showLabel = distanceToPlayer < 900 || f.correct;
            f.label.setVisible(showLabel);
            if (showLabel) {
              f.label.x = f.x;
              f.label.y = f.y + 62;
            }
          }
        });
      }

      updateVisibilityCulling() {
        const cam = this.cameras.main;
        const left = cam.scrollX - 300;
        const right = cam.scrollX + cam.width + 300;
        const top = cam.scrollY - 300;
        const bottom = cam.scrollY + cam.height + 300;

        const cullList = [...this.backgroundFish, ...this.coins, ...this.powerups];

        cullList.forEach((obj) => {
          if (!obj.active) return;
          obj.setVisible(obj.x > left && obj.x < right && obj.y > top && obj.y < bottom);
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
          const hitRange = 58 * this.player.scaleX + (p.scaleX > 1.45 ? 25 : 0);

          if (dist < hitRange) {
            invincible = true;

            if (shield > 0) {
              shield -= 1;
              this.centerMessage("SHIELD BLOCKED!", "#38bdf8");
              this.burst(this.player.x, this.player.y, 0x38bdf8, true);
              this.setMessage("Shield protected you.");
            } else {
              health = Math.max(0, health - p.damage);
              combo = 0;
              this.centerMessage(`PREDATOR HIT -${p.damage}`, "#ef4444");
              this.cameras.main.shake(160, 0.005);
              this.burst(this.player.x, this.player.y, 0xef4444, false);
              this.setMessage("Predator attacked. Avoid skull fish.");
            }

            this.updateHud();

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

            if (health <= 0) {
              this.endGame("Predators defeated your fish!");
            }
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
            this.setMessage("Treasure collected. +5 score.");
            this.updateHud();
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
              speedBoostUntil = this.time.now + 7000;
              score += 8;
              this.centerMessage("SPEED BOOST!", "#facc15");
              this.burst(p.x, p.y, 0xfacc15, true);
            }

            p.destroy();
            this.setMessage("Powerup collected.");
            this.updateHud();
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

        current += 1;

        this.updateHud();

        this.time.delayedCall(560, () => {
          current >= safeQuestions.length ? this.endGame("Ocean level complete!") : this.loadQuestion();
        });

        this.setMessage("Correct. Fish grew bigger. Combo increased.");
      }

      eatWrong(f) {
        health = Math.max(0, health - 15);
        score = Math.max(0, score - 4);
        combo = 0;

        this.burst(f.x, f.y, 0xef4444, false);
        this.floatText(f.x, f.y - 60, "-15 HEALTH", "#ef4444");
        this.centerMessage("WRONG FISH!", "#ef4444");
        this.cameras.main.shake(140, 0.004);

        f.label?.destroy();
        f.destroy();

        current += 1;

        this.updateHud();

        if (health <= 0) {
          this.time.delayedCall(560, () => this.endGame("Wrong fish made you lose health!"));
          return;
        }

        this.time.delayedCall(560, () => {
          current >= safeQuestions.length ? this.endGame("Ocean level complete!") : this.loadQuestion();
        });

        this.setMessage("Wrong fish. Health decreased.");
      }

      updateAnswerPointer() {
        const correct = this.answerFish.find((f) => f.active && f.correct);

        if (!correct) {
          this.pointerStar?.setVisible(false);
          return;
        }

        this.pointerStar.setVisible(true);

        const cam = this.cameras.main;
        const sx = correct.x - cam.scrollX;
        const sy = correct.y - cam.scrollY;

        this.pointerStar.x = Phaser.Math.Clamp(sx, 70, cam.width - 70);
        this.pointerStar.y = Phaser.Math.Clamp(sy, 100, cam.height - 70);
      }

      updateMiniMap() {
        if (!this.map) return;

        this.miniDots.forEach((d) => d.destroy());
        this.miniDots = [];

        const mapW = 310;
        const mapH = 178;
        const sx = mapW / WORLD_W;
        const sy = mapH / WORLD_H;

        const dot = (x, y, color, r = 4) => {
          const d = this.add.circle(-mapW / 2 + x * sx, -mapH / 2 + y * sy, r, color);
          this.map.add(d);
          this.miniDots.push(d);
        };

        dot(this.player.x, this.player.y, 0xf97316, 5);

        const correct = this.answerFish.find((f) => f.active && f.correct);
        if (correct) dot(correct.x, correct.y, 0xfacc15, 6);

        this.answerFish.filter((f) => f.active && !f.correct).forEach((f) => dot(f.x, f.y, 0x93c5fd, 2));
        this.predators.forEach((p) => dot(p.x, p.y, 0xef4444, p.scaleX > 1.45 ? 5 : 3));
        this.coins.filter((c) => c.active).forEach((c) => dot(c.x, c.y, 0xfacc15, 2));
        this.powerups.filter((p) => p.active).forEach((p) => dot(p.x, p.y, 0x22c55e, 2));
      }

      burst(x, y, color, correct) {
        const count = correct ? 26 : 16;

        for (let i = 0; i < count; i++) {
          const p = this.add.circle(
            x,
            y,
            Phaser.Math.Between(3, 7),
            color,
            Phaser.Math.FloatBetween(0.72, 1)
          ).setDepth(130);

          this.tweens.add({
            targets: p,
            x: x + Phaser.Math.Between(-120, 120),
            y: y + Phaser.Math.Between(-100, 100),
            alpha: 0,
            scale: 0,
            duration: correct ? 620 : 430,
            ease: "Cubic.out",
            onComplete: () => p.destroy(),
          });
        }
      }

      floatText(x, y, text, color) {
        const item = this.add.text(x, y, text, {
          fontSize: "24px",
          color,
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 5,
        }).setOrigin(0.5).setDepth(135);

        this.tweens.add({
          targets: item,
          y: y - 48,
          alpha: 0,
          scale: 1.1,
          duration: 780,
          onComplete: () => item.destroy(),
        });
      }

      centerMessage(text, color) {
        const item = this.add.text(800, 132, text, {
          fontSize: "30px",
          color,
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 6,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(550);

        this.tweens.add({
          targets: item,
          y: 94,
          alpha: 0,
          scale: 1.12,
          duration: 860,
          onComplete: () => item.destroy(),
        });
      }

      endGame(reason = "Game complete!") {
        if (ended) return;

        ended = true;
        this.clearAnswers();

        const xp = Math.max(20, Math.round(score / 2));
        const coins = Math.max(10, Math.round(score / 8));

        const panel = this.add.container(GAME_W / 2, GAME_H / 2).setScrollFactor(0).setDepth(700);

        const bg = this.add.rectangle(0, 0, 760, 410, 0x0f172a, 0.97);
        bg.setStrokeStyle(3, 0x38bdf8, 0.65);

        panel.add(bg);

        panel.add(this.add.text(0, -155, "🐟 OCEAN SURVIVAL COMPLETE", {
          fontSize: "36px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 7,
        }).setOrigin(0.5));

        panel.add(this.add.text(0, -76, reason, {
          fontSize: "23px",
          color: "#38bdf8",
          fontFamily: "Arial",
          fontStyle: "bold",
        }).setOrigin(0.5));

        panel.add(this.add.text(0, -4, `Score: ${score} · Level: ${level} · Combo: ${combo}`, {
          fontSize: "24px",
          color: "#facc15",
          fontFamily: "Arial",
          fontStyle: "bold",
        }).setOrigin(0.5));

        panel.add(this.add.text(0, 68, `Reward: +${xp} XP · +${coins} Coins`, {
          fontSize: "23px",
          color: "#22c55e",
          fontFamily: "Arial",
        }).setOrigin(0.5));

        panel.add(this.add.text(0, 138, "Tap EXIT to return to Student OS", {
          fontSize: "16px",
          color: "#cbd5e1",
          fontFamily: "Arial",
        }).setOrigin(0.5));

        this.setMessage("Game complete.");
        this.updateHud();

        if (!rewardSentRef.current && typeof rewardRef.current === "function") {
          rewardSentRef.current = true;
          rewardRef.current({
            xp,
            coins,
            score,
            total: safeQuestions.length,
            mode: "fish-ocean-v6-2-mobile-joystick",
          });
        }
      }
    }

    const config = {
      type: Phaser.WEBGL,
      parent: containerRef.current,
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
  }, []);

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-hidden bg-slate-950 text-white"
      style={{
        width: "100vw",
        height: "100vh",
        width: "100dvw",
        height: "100dvh",
        margin: 0,
        padding: 0,
        touchAction: "none",
        overscrollBehavior: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      <div className="absolute inset-0 z-[100000] flex items-center justify-center bg-slate-950 p-6 text-center landscape:hidden">
        <div className="max-w-sm rounded-3xl border border-cyan-400/40 bg-slate-900/95 p-7 shadow-2xl">
          <div className="text-6xl">📱↔️</div>
          <h1 className="mt-4 text-2xl font-black">Rotate Phone</h1>
          <p className="mt-3 text-slate-300">
            For the best Ocean Survival gameplay, rotate your phone to landscape mode.
          </p>
          <p className="mt-2 text-sm text-cyan-300">
            Use the floating joystick anywhere on the left side.
          </p>
          <button
            onClick={onExit}
            className="mt-6 rounded-2xl bg-red-500 px-5 py-3 font-bold text-white hover:bg-red-600"
          >
            Exit Game
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="bg-slate-950"
        style={{
          width: "100%",
          height: "100%",
          margin: 0,
          padding: 0,
          overflow: "hidden",
          touchAction: "none",
        }}
      />
    </div>
  );
}
