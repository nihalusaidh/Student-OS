import { useEffect, useMemo, useRef, useState } from "react";
import Phaser from "phaser";

/**
 * ArcheryGame PRO - Student OS Study Archery
 * Path: src/components/games/ArcheryGame.jsx
 *
 * Features:
 * 1. Angry Birds style drag power: pull backward, aim, release.
 * 2. Mobile + laptop friendly controls.
 * 3. Moving answer targets.
 * 4. Golden target bonus.
 * 5. Boss target on final question.
 * 6. Combo system, coins, XP reward.
 * 7. Loading screen.
 * 8. No EXIT button here. GameRoom should handle EXIT.
 */

const ARCHERY_MAPS = [
  {
    name: "Forest Range",
    emoji: "🌲",
    skyTop: 0x38bdf8,
    skyBottom: 0x86efac,
    ground: 0x166534,
    decor: ["🌲", "🌳", "🌿", "🍃"],
    speed: 1,
    rewardBoost: 1,
    windMax: 0,
    obstacle: "log",
  },
  {
    name: "Mountain Pass",
    emoji: "⛰️",
    skyTop: 0xfacc15,
    skyBottom: 0xf97316,
    ground: 0x78350f,
    decor: ["⛰️", "🪨", "🌿", "🦅"],
    speed: 1.12,
    rewardBoost: 1.15,
    windMax: 90,
    obstacle: "bird",
  },
  {
    name: "Desert Arena",
    emoji: "🏜️",
    skyTop: 0x0f172a,
    skyBottom: 0x312e81,
    ground: 0x111827,
    decor: ["🌵", "🪨", "💨", "☀️"],
    speed: 1.22,
    rewardBoost: 1.25,
    windMax: 150,
    obstacle: "pillar",
  },
  {
    name: "Volcano Range",
    emoji: "🌋",
    skyTop: 0x7f1d1d,
    skyBottom: 0x020617,
    ground: 0x451a03,
    decor: ["🌋", "🔥", "🪨", "💥"],
    speed: 1.35,
    rewardBoost: 1.4,
    windMax: 190,
    obstacle: "fire",
  },
];

export default function ArcheryGame({
  questions = [],
  topic = "Study Topic",
  onReward,
}) {
  const gameWrapRef = useRef(null);
  const gameRef = useRef(null);
  const latestRewardRef = useRef(onReward);
  const rewardSentRef = useRef(false);

  const [selectedMapIndex, setSelectedMapIndex] = useState(0);
  const [mapSelected, setMapSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Preparing archery arena...");
  const [hud, setHud] = useState({
    question: "Loading...",
    score: 0,
    combo: 0,
    arrows: 0,
    current: 1,
    total: Math.max(questions.length, 1),
    mapName: ARCHERY_MAPS[0].name,
    message: "Choose a map to start.",
    bossHp: 0,
    wind: 0,
    powerup: "Normal",
    obstacles: 0,
    ended: false,
  });

  const [isTouchDevice, setIsTouchDevice] = useState(() => {
    if (typeof window === "undefined") return false;
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
    const touchPoints = navigator.maxTouchPoints > 0;
    const phoneUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
    const smallLandscape = window.innerWidth > window.innerHeight && window.innerHeight <= 620;
    return Boolean(coarse || touchPoints || phoneUA || smallLandscape);
  });

  const [isPortraitMobile, setIsPortraitMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
    return Boolean(coarse && window.innerHeight > window.innerWidth);
  });

  useEffect(() => {
    latestRewardRef.current = onReward;
  }, [onReward]);

  useEffect(() => {
    const onResize = () => {
      const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
      const touchPoints = navigator.maxTouchPoints > 0;
      const phoneUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
      const smallLandscape = window.innerWidth > window.innerHeight && window.innerHeight <= 620;
      const mobileLike = Boolean(coarse || touchPoints || phoneUA || smallLandscape);
      setIsTouchDevice(mobileLike);
      setIsPortraitMobile(Boolean(mobileLike && window.innerHeight > window.innerWidth));
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  useEffect(() => {
    if (!mapSelected) return;
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
    let current = 0;
    let ended = false;
    let ready = false;
    let bossHp = 0;
    let rareTarget = null;
    let activePowerup = "Normal";
    let windChangeTimer = 0;

    const syncHud = (message = "") => {
      const q = safeQuestions[Math.min(current, safeQuestions.length - 1)];
      setHud({
        question: q?.question || "Game complete",
        score,
        combo,
        arrows,
        current: Math.min(current + 1, safeQuestions.length),
        total: safeQuestions.length,
        mapName: map.name,
        message,
        bossHp,
        wind: Math.round(this?.wind || windChangeTimer || 0),
        powerup: activePowerup,
        obstacles: this?.obstacles?.filter?.((o) => o.active)?.length || 0,
        ended,
      });
    };

    const setLoadStep = (text, delay) => {
      setTimeout(() => setLoadingText(text), delay);
    };

    setLoading(true);
    setLoadingText("🏹 Preparing Archery Arena...");
    setLoadStep("🎯 Loading answer targets...", 220);
    setLoadStep("⚡ Loading drag power...", 440);
    setLoadStep("⭐ Loading golden targets...", 660);
    setLoadStep("🦅 Loading boss round...", 880);

    class ArcheryScene extends Phaser.Scene {
      constructor() {
        super("StudentOSArcheryPRO");
        this.bow = null;
        this.arrow = null;
        this.targets = [];
        this.labels = [];
        this.obstacles = [];
        this.powerups = [];
        this.trajectoryDots = [];
        this.powerText = null;
        this.isDragging = false;
        this.dragStart = new Phaser.Math.Vector2(180, GAME_H - 150);
        this.dragPoint = new Phaser.Math.Vector2(180, GAME_H - 150);
        this.canShoot = true;
        this.wind = 0;
        this.lastHud = 0;
      }

      create() {
        this.physics.world.setBounds(0, 0, GAME_W, GAME_H);
        this.createBackground();
        this.createBow();
        this.createQuestionTargets();
        this.createTrajectoryDots();
        this.createRareTargetTimer();
        this.createPowerupTimer();
        this.createWindTimer();

        this.input.on("pointerdown", (pointer) => this.startDrag(pointer));
        this.input.on("pointermove", (pointer) => this.updateDrag(pointer));
        this.input.on("pointerup", () => this.releaseArrow());

        this.time.delayedCall(isPortraitMobile ? 450 : 700, () => {
          ready = true;
          setLoading(false);
          syncHud("Pull back from the bow, aim, and release.");
        });
      }

      update(time) {
        if (!ready || ended) return;
        this.moveTargets(time);
        this.moveObstacles(time);
        this.applyWindToArrow();
        this.updateArrowRotation();
        this.checkTargetHits();
        this.checkRareTargetHit();
        this.checkPowerupHit();
        this.checkObstacleHit();
        this.checkArrowOut();

        if (time - this.lastHud > 220) {
          syncHud(this.isDragging ? "Release to shoot." : "Drag backward like Angry Birds.");
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
            Phaser.Math.Between(45, 180),
            Phaser.Math.Between(70, 170),
            Phaser.Math.Between(20, 48),
            0xffffff,
            Phaser.Math.FloatBetween(0.14, 0.32)
          ).setDepth(1);
          this.tweens.add({
            targets: cloud,
            x: cloud.x + Phaser.Math.Between(-50, 50),
            duration: Phaser.Math.Between(3500, 6500),
            yoyo: true,
            repeat: -1,
          });
        }

        const ground = this.add.rectangle(GAME_W / 2, GAME_H - 42, GAME_W, 90, map.ground).setDepth(3);
        const hill = this.add.ellipse(GAME_W * 0.42, GAME_H - 40, GAME_W * 0.85, 130, map.ground, 0.85).setDepth(2);
        ground.setAlpha(0.96);
        hill.setAlpha(0.9);

        for (let i = 0; i < (isPortraitMobile ? 10 : 22); i++) {
          this.add.text(
            Phaser.Math.Between(30, GAME_W - 40),
            Phaser.Math.Between(GAME_H - 118, GAME_H - 54),
            map.decor[Phaser.Math.Between(0, map.decor.length - 1)],
            { fontSize: Phaser.Math.Between(24, 54) + "px" }
          ).setDepth(4);
        }

        this.add.text(GAME_W - 28, 24, `${map.emoji} ${map.name}`, {
          fontSize: "22px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 5,
        }).setOrigin(1, 0).setDepth(20);
      }

      createBow() {
        this.bow = this.add.container(175, GAME_H - 150).setDepth(40);
        const arc = this.add.arc(0, 0, 85, -65, 65, false, 0x78350f, 1);
        arc.setStrokeStyle(12, 0x78350f, 1);
        const string = this.add.line(0, 0, 34, -78, 34, 78, 0xffffff, 0.95).setLineWidth(3);
        const grip = this.add.rectangle(34, 0, 20, 58, 0x92400e, 1);
        this.bow.add([arc, string, grip]);

        this.arrow = this.createArrow(210, GAME_H - 150);
        this.arrow.setVisible(false);
        this.powerText = this.add.text(175, GAME_H - 250, "POWER 0%", {
          fontSize: "20px",
          color: "#facc15",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 5,
        }).setOrigin(0.5).setDepth(80).setVisible(false);
      }

      createArrow(x, y) {
        const arrow = this.add.container(x, y).setDepth(70);
        arrow.add(this.add.rectangle(0, 0, 78, 6, 0xf8fafc));
        arrow.add(this.add.triangle(44, 0, 0, -12, 0, 12, 24, 0, 0xf97316));
        arrow.add(this.add.triangle(-42, -8, 0, 0, 16, 8, 0, 16, 0x38bdf8));
        arrow.add(this.add.triangle(-42, 8, 0, 0, 16, -8, 0, -16, 0x38bdf8));
        this.physics.add.existing(arrow);
        arrow.body.setSize(86, 18);
        arrow.body.setAllowGravity(false);
        arrow.body.setCollideWorldBounds(false);
        return arrow;
      }

      createTrajectoryDots() {
        for (let i = 0; i < 9; i++) {
          const dot = this.add.circle(0, 0, 5, 0xffffff, 0.7).setDepth(65).setVisible(false);
          this.trajectoryDots.push(dot);
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

      createQuestionTargets() {
        if (current >= safeQuestions.length) return this.endGame("Archery round complete!");

        this.targets.forEach((target) => target.destroy());
        this.labels.forEach((label) => label.destroy());
        this.targets = [];
        this.labels = [];

        const q = safeQuestions[current];
        const options = this.shuffleOptions([...new Set([...(q.options || []), q.answer])]).slice(0, 4);
        const finalRound = current === safeQuestions.length - 1;

        if (finalRound) bossHp = 2;
        else bossHp = 0;

        const ySlots = [150, 255, 365, 475];
        options.forEach((answer, index) => {
          const correct = String(answer).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
          const x = Phaser.Math.Between(GAME_W - 390, GAME_W - 165);
          const y = ySlots[index] || Phaser.Math.Between(130, GAME_H - 170);
          const target = this.createTarget(x, y, correct, finalRound && correct);
          target.answer = answer;
          target.correct = correct;
          target.isBoss = finalRound && correct;
          target.baseY = y;
          target.movePhase = Phaser.Math.FloatBetween(0, Math.PI * 2);
          target.moveSpeed = Phaser.Math.FloatBetween(0.8, 1.45) * map.speed;
          target.setDepth(correct ? 55 : 45);

          const label = this.add.text(x, y + (target.isBoss ? 78 : 58), answer, {
            fontSize: target.isBoss ? "25px" : "22px",
            color: "#ffffff",
            fontFamily: "Arial",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 5,
          }).setOrigin(0.5).setDepth(75);

          target.label = label;
          this.labels.push(label);
          this.targets.push(target);
        });

        this.createObstacles();
        syncHud(finalRound ? "Final question: Boss Target needs 2 hits!" : "Hit the correct answer target.");
      }

      createTarget(x, y, correct, boss = false) {
        const target = this.add.container(x, y);
        const size = boss ? 1.28 : 1;
        const outerColor = boss ? 0x111827 : correct ? 0x22c55e : 0xef4444;
        const midColor = correct ? 0xfacc15 : 0xffffff;
        const centerColor = boss ? 0xf97316 : correct ? 0x22c55e : 0xef4444;

        target.add(this.add.circle(0, 0, 50 * size, outerColor, 0.95));
        target.add(this.add.circle(0, 0, 38 * size, 0xffffff, 1));
        target.add(this.add.circle(0, 0, 27 * size, midColor, 1));
        target.add(this.add.circle(0, 0, 14 * size, centerColor, 1));

        if (correct) {
          target.add(this.add.text(0, -68 * size, boss ? "🦅 BOSS" : "⭐", {
            fontSize: boss ? "24px" : "28px",
            fontFamily: "Arial",
            fontStyle: "bold",
          }).setOrigin(0.5));
        }

        if (boss) {
          target.add(this.add.text(0, 0, "🛡️", { fontSize: "26px" }).setOrigin(0.5));
        }

        target.setSize(100 * size, 100 * size);
        this.physics.add.existing(target);
        target.body.setCircle(50 * size);
        target.body.setAllowGravity(false);

        if (correct) {
          this.tweens.add({
            targets: target,
            scaleX: 1.08,
            scaleY: 1.08,
            duration: 600,
            yoyo: true,
            repeat: -1,
          });
        }

        return target;
      }

      createRareTargetTimer() {
        this.time.addEvent({
          delay: 17000,
          loop: true,
          callback: () => {
            if (!ready || ended || rareTarget?.active) return;
            this.spawnRareTarget();
          },
        });
      }

      spawnRareTarget() {
        const rarePool = [
          { name: "Golden Target", emoji: "⭐", color: 0xfacc15, score: 25 },
          { name: "Diamond Target", emoji: "💎", color: 0x60a5fa, score: 50 },
          { name: "Mystery Target", emoji: "❓", color: 0xa855f7, score: Phaser.Math.Between(15, 45) },
        ];
        const data = rarePool[Phaser.Math.Between(0, rarePool.length - 1)];
        rareTarget = this.add.container(
          Phaser.Math.Between(GAME_W - 480, GAME_W - 150),
          Phaser.Math.Between(110, GAME_H - 190)
        ).setDepth(85);

        rareTarget.rareData = data;
        rareTarget.add(this.add.circle(0, 0, 42, data.color, 0.95));
        rareTarget.add(this.add.circle(0, 0, 29, 0xffffff, 1));
        rareTarget.add(this.add.circle(0, 0, 17, data.color, 1));
        rareTarget.add(this.add.text(0, -62, data.emoji, { fontSize: "30px" }).setOrigin(0.5));
        rareTarget.baseY = rareTarget.y;
        rareTarget.movePhase = Phaser.Math.FloatBetween(0, Math.PI * 2);

        this.physics.add.existing(rareTarget);
        rareTarget.body.setCircle(44);
        rareTarget.body.setAllowGravity(false);
        this.centerMessage(`${data.emoji} ${data.name} appeared!`, "#facc15");

        this.tweens.add({
          targets: rareTarget,
          scaleX: 1.18,
          scaleY: 1.18,
          duration: 450,
          yoyo: true,
          repeat: -1,
        });

        this.time.delayedCall(7000, () => {
          if (rareTarget?.active) {
            rareTarget.destroy();
            rareTarget = null;
          }
        });
      }


      createWindTimer() {
        const updateWind = () => {
          const max = map.windMax || 0;
          this.wind = max ? Phaser.Math.Between(-max, max) : 0;
          windChangeTimer = this.wind;
          syncHud(this.wind === 0 ? "No wind. Aim normally." : `Wind changed: ${this.wind > 0 ? "→" : "←"} ${Math.abs(Math.round(this.wind))}`);
        };
        updateWind();
        this.time.addEvent({ delay: 9000, loop: true, callback: updateWind });
      }

      applyWindToArrow() {
        if (!this.arrow?.visible || !this.arrow.body?.enable || !this.wind) return;
        this.arrow.body.velocity.x += this.wind * 0.012;
      }

      createObstacles() {
        this.obstacles.forEach((item) => item.destroy());
        this.obstacles = [];
        // Obstacles become harder after every correct answer.
        // On mobile landscape they are placed in the visible middle lane,
        // away from the bow and away from answer targets.
        const baseCount = selectedMapIndex === 0 ? 1 : selectedMapIndex + 1;
        const count = Math.min(8, baseCount + current);
        for (let i = 0; i < count; i++) {
          const x = Phaser.Math.Between(430, GAME_W - 520);
          const y = Phaser.Math.Between(150, GAME_H - 190);
          let obstacle;
          const type = map.obstacle || "log";
          if (type === "bird") {
            obstacle = this.add.container(x, y).setDepth(82);
            obstacle.add(this.add.text(0, 0, "🦅", { fontSize: "46px" }).setOrigin(0.5));
            obstacle.kind = "bird";
            obstacle.speedX = Phaser.Math.Between(65, 115) * (i % 2 ? -1 : 1);
          } else if (type === "pillar") {
            obstacle = this.add.container(x, y).setDepth(82);
            obstacle.add(this.add.rectangle(0, 0, 34, Phaser.Math.Between(120, 210), 0x78716c, 0.95));
            obstacle.add(this.add.rectangle(0, 0, 46, 22, 0xa8a29e, 0.95));
            obstacle.kind = "pillar";
            obstacle.speedX = 0;
          } else if (type === "fire") {
            obstacle = this.add.container(x, y).setDepth(82);
            obstacle.add(this.add.circle(0, 0, 30, 0xef4444, 0.25));
            obstacle.add(this.add.text(0, 0, "🔥", { fontSize: "48px" }).setOrigin(0.5));
            obstacle.kind = "fire";
            obstacle.speedX = Phaser.Math.Between(35, 85) * (i % 2 ? -1 : 1);
          } else {
            obstacle = this.add.container(x, y).setDepth(82);
            obstacle.add(this.add.rectangle(0, 0, 40, 150, 0x78350f, 1));
            obstacle.add(this.add.rectangle(0, -82, 58, 20, 0xfacc15, 1));
            obstacle.add(this.add.rectangle(0, 82, 58, 20, 0xfacc15, 1));
            obstacle.add(this.add.text(0, 0, "🪵", { fontSize: "44px" }).setOrigin(0.5));
            obstacle.add(this.add.text(0, -112, "⚠", { fontSize: "24px" }).setOrigin(0.5));
            obstacle.kind = "log";
            obstacle.speedX = Phaser.Math.Between(35, 72) * (i % 2 ? -1 : 1);
          }
          obstacle.baseY = y;
          obstacle.phase = Phaser.Math.FloatBetween(0, Math.PI * 2);
          this.physics.add.existing(obstacle);
          obstacle.body.setSize(type === "pillar" ? 48 : 60, type === "pillar" ? 180 : 70);
          obstacle.body.setAllowGravity(false);
          obstacle.body.setImmovable(true);
          this.obstacles.push(obstacle);
        }
      }

      moveObstacles(time) {
        this.obstacles.forEach((o) => {
          if (!o.active) return;
          if (o.kind === "pillar") {
            o.y = o.baseY + Math.sin(time / 900 + o.phase) * 34;
          } else if (o.kind === "log") {
            o.angle = Math.sin(time / 520 + o.phase) * 18;
            o.y = o.baseY + Math.sin(time / 850 + o.phase) * 42;
          } else {
            o.x += o.speedX / 60;
            o.y = o.baseY + Math.sin(time / 450 + o.phase) * 36;
            if (o.x < 330 || o.x > GAME_W - 250) o.speedX *= -1;
          }
        });
      }

      checkObstacleHit() {
        if (!this.arrow?.visible || !this.arrow.body?.enable) return;
        this.obstacles.forEach((o) => {
          if (!o.active) return;
          const d = Phaser.Math.Distance.Between(this.arrow.x, this.arrow.y, o.x, o.y);
          const radius = o.kind === "pillar" ? 68 : 54;
          if (d < radius) {
            combo = 0;
            this.centerMessage("OBSTACLE BLOCKED!", "#f97316");
            this.floatText(o.x, o.y - 40, "BLOCK", "#f97316");
            this.cameras.main.shake(100, 0.003);
            this.resetArrow();
            syncHud("Obstacle blocked the arrow. Use angle and power.");
          }
        });
      }

      createPowerupTimer() {
        this.time.addEvent({
          delay: 22000,
          loop: true,
          callback: () => {
            if (!ready || ended || this.powerups.some((p) => p.active)) return;
            this.spawnPowerup();
          },
        });
      }

      spawnPowerup() {
        const types = [
          { name: "Precision", emoji: "🎯", color: 0x38bdf8 },
          { name: "Triple", emoji: "🏹", color: 0x22c55e },
          { name: "Explosive", emoji: "💥", color: 0xef4444 },
        ];
        const data = Phaser.Math.RND.pick(types);
        const p = this.add.container(Phaser.Math.Between(430, GAME_W - 300), Phaser.Math.Between(115, GAME_H - 170)).setDepth(82);
        p.powerData = data;
        p.add(this.add.circle(0, 0, 36, data.color, 0.9));
        p.add(this.add.circle(0, 0, 24, 0xffffff, 0.95));
        p.add(this.add.text(0, 0, data.emoji, { fontSize: "24px" }).setOrigin(0.5));
        this.physics.add.existing(p);
        p.body.setCircle(38);
        p.body.setAllowGravity(false);
        this.powerups.push(p);
        this.centerMessage(`${data.emoji} ${data.name} powerup appeared!`, "#38bdf8");
        this.tweens.add({ targets: p, scaleX: 1.16, scaleY: 1.16, duration: 550, yoyo: true, repeat: -1 });
        this.time.delayedCall(9000, () => p.active && p.destroy());
      }

      checkPowerupHit() {
        if (!this.arrow?.visible || !this.arrow.body?.enable) return;
        this.powerups.forEach((p) => {
          if (!p.active) return;
          const d = Phaser.Math.Distance.Between(this.arrow.x, this.arrow.y, p.x, p.y);
          if (d < 54) {
            activePowerup = p.powerData?.name || "Precision";
            score += 10;
            this.centerMessage(`${p.powerData?.emoji || "⚡"} ${activePowerup.toUpperCase()} READY`, "#38bdf8");
            p.destroy();
            this.resetArrow();
            syncHud(`${activePowerup} arrow equipped for next shot.`);
          }
        });
      }

      startDrag(pointer) {
        if (!ready || ended || !this.canShoot) return;
        const distanceFromBow = Phaser.Math.Distance.Between(pointer.x, pointer.y, 175, GAME_H - 150);
        if (distanceFromBow > 180 && !isTouchDevice) return;

        this.isDragging = true;
        this.dragPoint.set(pointer.x, pointer.y);
        this.arrow.setPosition(210, GAME_H - 150);
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
        const anchor = new Phaser.Math.Vector2(190, GAME_H - 150);
        const drag = new Phaser.Math.Vector2(px - anchor.x, py - anchor.y);
        const maxDrag = isTouchDevice ? 205 : 230;
        const len = Phaser.Math.Clamp(drag.length(), 0, maxDrag);
        const angle = Math.atan2(drag.y, drag.x);
        const clamped = new Phaser.Math.Vector2(Math.cos(angle) * len, Math.sin(angle) * len);
        const power = len / maxDrag;
        const velocity = new Phaser.Math.Vector2(-clamped.x * 5.4, -clamped.y * 5.4);
        velocity.x = Phaser.Math.Clamp(velocity.x, 300, 1250);
        velocity.y = Phaser.Math.Clamp(velocity.y, -950, 620);
        return { anchor, clamped, power, velocity };
      }

      showTrajectory(pointer) {
        const { anchor, clamped, power, velocity } = this.getShotData(pointer);
        const pullX = anchor.x + clamped.x;
        const pullY = anchor.y + clamped.y;
        this.arrow.setPosition(pullX + 22, pullY);
        this.arrow.rotation = Math.atan2(velocity.y, velocity.x);
        this.powerText.setText(`POWER ${Math.round(power * 100)}%`);
        this.powerText.setColor(power > 0.72 ? "#22c55e" : power > 0.38 ? "#facc15" : "#f97316");

        const gravity = 520;
        this.trajectoryDots.forEach((dot, i) => {
          const t = (i + 1) * 0.13;
          const x = anchor.x + velocity.x * t + 0.5 * (this.wind || 0) * t * t;
          const y = anchor.y + velocity.y * t + 0.5 * gravity * t * t;
          dot.setPosition(x, y).setVisible(x > 0 && x < GAME_W && y > 0 && y < GAME_H);
          dot.setAlpha(1 - i * 0.08);
        });
      }

      releaseArrow() {
        if (!this.isDragging || !this.canShoot) return;
        const { anchor, power, velocity } = this.getShotData();
        if (power < 0.08) {
          this.resetArrow();
          return;
        }

        this.isDragging = false;
        this.canShoot = false;
        arrows += 1;
        this.trajectoryDots.forEach((dot) => dot.setVisible(false));
        this.powerText.setVisible(false);
        this.arrow.setPosition(anchor.x + 24, anchor.y);
        this.arrow.setVisible(true);
        this.arrow.body.setEnable(true);
        this.arrow.body.setAllowGravity(true);
        this.arrow.body.setGravityY(520);
        let vx = velocity.x;
        let vy = velocity.y;
        if (activePowerup === "Precision") {
          this.targets.forEach((t) => { t.moveSpeed *= 0.45; });
          this.centerMessage("🎯 PRECISION SLOW", "#38bdf8", 700);
          activePowerup = "Normal";
        }
        if (activePowerup === "Explosive") {
          this.arrow.explosive = true;
          activePowerup = "Normal";
        } else {
          this.arrow.explosive = false;
        }
        this.arrow.body.setVelocity(vx, vy);
        this.arrow.rotation = Math.atan2(vy, vx);
        syncHud("Arrow released!");
      }

      resetArrow() {
        this.isDragging = false;
        this.canShoot = true;
        this.arrow.setVisible(false);
        this.arrow.body.setEnable(false);
        this.arrow.body.setVelocity(0, 0);
        this.arrow.body.setAllowGravity(false);
        this.trajectoryDots.forEach((dot) => dot.setVisible(false));
        this.powerText.setVisible(false);
      }

      updateArrowRotation() {
        if (!this.arrow?.visible || !this.arrow.body?.enable) return;
        const vx = this.arrow.body.velocity.x;
        const vy = this.arrow.body.velocity.y;
        this.arrow.rotation = Math.atan2(vy, vx);
      }

      moveTargets(time) {
        this.targets.forEach((target) => {
          if (!target.active) return;
          const amp = target.isBoss ? 76 : 46;
          target.y = target.baseY + Math.sin(time / 720 * target.moveSpeed + target.movePhase) * amp;
          target.x += Math.sin(time / 900 + target.movePhase) * 0.35 * map.speed;
          if (target.label) {
            target.label.x = target.x;
            target.label.y = target.y + (target.isBoss ? 78 : 58);
          }
        });

        if (rareTarget?.active) {
          rareTarget.y = rareTarget.baseY + Math.sin(time / 420 + rareTarget.movePhase) * 70;
        }
      }

      checkTargetHits() {
        if (!this.arrow?.visible || !this.arrow.body?.enable) return;
        this.targets.forEach((target) => {
          if (!target.active) return;
          const d = Phaser.Math.Distance.Between(this.arrow.x, this.arrow.y, target.x, target.y);
          if (d < (target.isBoss ? 72 : 56)) {
            target.correct ? this.hitCorrect(target, d) : this.hitWrong(target);
          }
        });
      }

      checkRareTargetHit() {
        if (!rareTarget?.active || !this.arrow?.visible || !this.arrow.body?.enable) return;
        const d = Phaser.Math.Distance.Between(this.arrow.x, this.arrow.y, rareTarget.x, rareTarget.y);
        if (d < 56) {
          const data = rareTarget.rareData || { emoji: "⭐", name: "Golden Target", score: 25 };
          score += data.score;
          combo += 1;
          if (data.name === "Mystery Target") activePowerup = Phaser.Math.RND.pick(["Precision", "Triple", "Explosive"]);
          this.centerMessage(`${data.emoji} ${data.name.toUpperCase()} +${data.score}`, "#facc15");
          this.floatText(rareTarget.x, rareTarget.y - 55, `+${data.score}`, "#facc15");
          rareTarget.destroy();
          rareTarget = null;
          this.resetArrow();
          syncHud(`${data.name} collected. Continue question.`);
        }
      }

      hitCorrect(target, hitDistance = 99) {
        const boost = map.rewardBoost || 1;

        if (target.isBoss && bossHp > 1) {
          bossHp -= 1;
          score += Math.round(8 * boost);
          this.centerMessage("BOSS SHIELD BROKEN! Hit once more.", "#f97316", 1000);
          this.floatText(target.x, target.y - 60, "BOSS -1", "#f97316");
          this.resetArrow();
          syncHud("Boss target needs one more hit.");
          return;
        }

        const perfectBonus = hitDistance < 18 ? 25 : hitDistance < 32 ? 10 : 0;
        const gained = Math.round((15 + combo * 4 + (target.isBoss ? 35 : 0) + perfectBonus) * boost);
        score += gained;
        combo += 1;
        this.centerMessage(perfectBonus >= 25 ? "🎯 PERFECT SHOT!" : target.isBoss ? "🦅 BOSS DEFEATED!" : combo >= 3 ? `COMBO x${combo}!` : "CORRECT HIT!", target.isBoss || perfectBonus ? "#facc15" : "#22c55e");
        this.floatText(target.x, target.y - 60, `+${gained}`, "#22c55e");

        target.label?.destroy();
        target.destroy();
        current += 1;
        this.resetArrow();

        this.time.delayedCall(480, () => {
          current >= safeQuestions.length ? this.endGame("Archery round complete!") : this.createQuestionTargets();
        });
      }

      hitWrong(target) {
        score = Math.max(0, score - 5);
        combo = 0;
        this.centerMessage("WRONG TARGET!", "#ef4444");
        this.floatText(target.x, target.y - 55, "-5", "#ef4444");
        this.cameras.main.shake(130, 0.004);
        target.label?.destroy();
        target.destroy();
        this.resetArrow();
        syncHud("Wrong target. Try the correct answer.");
      }

      checkArrowOut() {
        if (!this.arrow?.visible || !this.arrow.body?.enable) return;
        if (this.arrow.x > GAME_W + 80 || this.arrow.y > GAME_H + 80 || this.arrow.y < -120) {
          combo = 0;
          this.centerMessage("MISSED!", "#f97316");
          this.resetArrow();
          syncHud("Missed shot. Pull stronger or aim better.");
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
        this.tweens.add({ targets: item, y: y - 48, alpha: 0, duration: 760, onComplete: () => item.destroy() });
      }

      centerMessage(text, color, duration = 900) {
        const item = this.add.text(GAME_W / 2, 86, text, {
          fontSize: isPortraitMobile ? "28px" : "34px",
          color,
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 6,
        }).setOrigin(0.5).setDepth(170);
        this.tweens.add({ targets: item, y: 45, alpha: 0, duration, onComplete: () => item.destroy() });
      }

      endGame(reason = "Game complete!") {
        if (ended) return;
        ended = true;
        const accuracyBonus = arrows > 0 ? Math.round((current / arrows) * 20) : 0;
        const xp = Math.max(25, Math.round(score * 0.7 + accuracyBonus));
        const coins = Math.max(10, Math.round(score / 9));

        const panel = this.add.container(GAME_W / 2, GAME_H / 2).setDepth(500);
        const bg = this.add.rectangle(0, 0, 650, 315, 0x0f172a, 0.97);
        bg.setStrokeStyle(3, 0xfacc15, 0.8);
        const title = this.add.text(0, -108, "🏹 ARCHERY COMPLETE", {
          fontSize: "34px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 6,
        }).setOrigin(0.5);
        const reasonText = this.add.text(0, -40, reason, { fontSize: "20px", color: "#facc15", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5);
        const scoreText = this.add.text(0, 35, `Score: ${score} · Arrows: ${arrows} · Combo: ${combo}`, { fontSize: "20px", color: "#38bdf8", fontFamily: "Arial", fontStyle: "bold" }).setOrigin(0.5);
        const rewardText = this.add.text(0, 98, `Reward: +${xp} XP · +${coins} Coins`, { fontSize: "20px", color: "#22c55e", fontFamily: "Arial" }).setOrigin(0.5);
        panel.add([bg, title, reasonText, scoreText, rewardText]);

        syncHud("Game complete. Tap EXIT in GameRoom.");

        if (!rewardSentRef.current && typeof latestRewardRef.current === "function") {
          rewardSentRef.current = true;
          latestRewardRef.current({
            xp,
            coins,
            score: current,
            total: safeQuestions.length,
            gameName: "Archery Pro",
            mode: "archery-ultimate-landscape-obstacles-wind",
          });
        }
      }
    }

    const config = {
      type: isPortraitMobile ? Phaser.CANVAS : Phaser.AUTO,
      parent: gameWrapRef.current,
      width: GAME_W,
      height: GAME_H,
      backgroundColor: "#0f172a",
      scene: ArcheryScene,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { y: 0 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_W,
        height: GAME_H,
      },
      render: {
        antialias: !isPortraitMobile,
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
  }, [mapSelected, selectedMapIndex, questions, topic, isPortraitMobile, isTouchDevice]);

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
      <div className="mt-6 h-3 w-64 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full w-2/3 animate-pulse rounded-full bg-yellow-400" />
      </div>
      <div className="mt-4 text-xs font-semibold text-slate-400">Pull backward, aim, release. Study OS is preparing targets.</div>
    </div>
  );

  const MapSelectScreen = () => (
    <div
      className="fixed inset-0 z-[99999] bg-slate-950 text-white"
      style={{
        width: "100dvw",
        height: "100dvh",
        overflow: "hidden",
      }}
    >
      <div className="flex h-full flex-col px-4 py-5">
        <div className="text-center">
          <div className="text-3xl font-black sm:text-4xl">🏹 Choose Archery Arena</div>
          <div className="mx-auto mt-2 max-w-2xl text-sm font-bold text-yellow-200">
            Angry Birds style drag power: pull back, aim line appears, release to shoot.
          </div>
        </div>

        <div className="mt-5 grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          {ARCHERY_MAPS.map((map, index) => (
            <button
              key={map.name}
              onClick={() => startMap(index)}
              className="rounded-3xl border border-white/10 bg-white/5 p-4 text-left shadow-2xl transition hover:bg-white/10 active:scale-[0.98]"
            >
              <div className="text-5xl">{map.emoji}</div>
              <div className="mt-3 text-xl font-black">{map.name}</div>
              <div className="mt-2 text-xs font-bold text-slate-300">
                Speed x{map.speed} · Reward x{map.rewardBoost}
              </div>
              <div className="mt-4 inline-flex rounded-full bg-yellow-400 px-4 py-2 text-sm font-black text-slate-950">
                Start
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const HudCard = ({ mobile = false }) => (
    <div
      className={
        mobile
          ? "rounded-3xl border border-yellow-400/40 bg-slate-950/95 p-4 shadow-2xl"
          : "pointer-events-none fixed left-5 top-5 z-[10000] w-[440px] rounded-2xl border border-yellow-400/40 bg-slate-950/75 p-4 text-white shadow-2xl backdrop-blur-md"
      }
    >
      <div className={mobile ? "text-base font-black leading-tight" : "text-sm font-black leading-tight"}>
        Q{hud.current}/{hud.total}. {hud.question}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-xs font-black">
        <div>Score {hud.score}</div>
        <div className="text-yellow-300">Combo {hud.combo}</div>
        <div className="text-cyan-300">🌬 {hud.wind > 0 ? "→" : hud.wind < 0 ? "←" : "0"} {Math.abs(hud.wind)}</div>
        <div className="text-red-300">Boss {hud.bossHp}</div>
      </div>
      <div className="mt-3 text-xs font-black text-yellow-200">{hud.mapName} · {hud.powerup} · Obstacles {hud.obstacles}</div>
      <div className="mt-1 text-xs font-bold leading-snug text-slate-200">{hud.message}</div>
    </div>
  );


  const MobileLandscapeHud = () => (
    <>
      {/* Mobile landscape: text only, no card/background, so it will not cover the game. */}
      <div className="pointer-events-none fixed left-2 top-1 z-[10000] max-w-[58vw] text-white">
        <div className="truncate text-[11px] font-black leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
          Q{hud.current}/{hud.total}. {hud.question}
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-1 left-2 z-[10000] flex max-w-[70vw] gap-2 text-[10px] font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
        <span>Score {hud.score}</span>
        <span className="text-yellow-200">Combo {hud.combo}</span>
        <span className="text-cyan-200">🌬 {hud.wind > 0 ? "→" : hud.wind < 0 ? "←" : "0"} {Math.abs(hud.wind)}</span>
        <span className="text-orange-200">Obs {hud.obstacles}</span>
      </div>
    </>
  );

  const RotateLandscapeScreen = () => (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
      <div className="text-7xl">📱↔️</div>
      <div className="mt-5 text-2xl font-black">Rotate to Landscape</div>
      <div className="mt-2 max-w-sm text-sm font-bold text-yellow-200">
        Archery is a landscape-only game on mobile so the question, bow, targets, wind, and obstacles have enough space.
      </div>
    </div>
  );

  const forceMobileLandscapeHud =
    typeof window !== "undefined" &&
    window.innerWidth > window.innerHeight &&
    window.innerHeight <= 620;

  if (!mapSelected) return <MapSelectScreen />;

  if (isPortraitMobile) return <RotateLandscapeScreen />;

  if (isTouchDevice || forceMobileLandscapeHud) {
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
        <MobileLandscapeHud />
        <div ref={gameWrapRef} className="h-full w-full bg-slate-950" />
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
