import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

/**
 * ArcheryGame Cinematic V3 Shuffle
 * Path: src/components/games/ArcheryGame.jsx
 *
 * Fullscreen professional-looking Phaser archery game.
 * Keep App.jsx and GameRoom.jsx unchanged.
 */

export default function ArcheryGame({
  questions = [],
  topic = "Study Topic",
  onExit,
  onReward,
}) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const rewardSentRef = useRef(false);

  // Keep latest props without recreating Phaser on every React render.
  // This fixes blinking/restarting from question 1.
  const questionsRef = useRef(questions);
  const topicRef = useRef(topic);
  const onRewardRef = useRef(onReward);

  const [hud, setHud] = useState({
    score: 0,
    combo: 0,
    arrows: 3,
    current: 1,
    total: Math.max(questions.length, 1),
    message: "Use the open right side to aim. Targets move vertically.",
  });

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const initialQuestions = questionsRef.current || [];

    const safeQuestions =
      initialQuestions.length > 0
        ? initialQuestions
        : [
            { question: "Both inputs 1 gives output 1?", answer: "AND", options: ["AND", "OR", "XOR", "NOT"] },
            { question: "Either input 1 gives output 1?", answer: "OR", options: ["AND", "OR", "NAND", "NOR"] },
            { question: "Opposite output gate?", answer: "NOT", options: ["NOT", "AND", "OR", "XOR"] },
            { question: "Universal gate?", answer: "NAND", options: ["NAND", "NOR", "XOR", "AND"] },
            { question: "Exclusive OR short form?", answer: "XOR", options: ["XOR", "AND", "OR", "NOT"] },
          ];

    let score = 0;
    let combo = 0;
    let currentIndex = 0;
    let arrowsLeft = 3;
    let canShoot = true;
    let ended = false;
    let shotLocked = false;

    const syncHud = (message = "") => {
      setHud({
        score,
        combo,
        arrows: arrowsLeft,
        current: Math.min(currentIndex + 1, safeQuestions.length),
        total: safeQuestions.length,
        message,
      });
    };

    class ArcheryScene extends Phaser.Scene {
      constructor() {
        super("ArcheryCinematicV2");
        this.targets = [];
        this.labels = [];
        this.fxObjects = [];
        this.arrow = null;
        this.bow = null;
        this.aimLine = null;
        this.crosshair = null;
        this.powerFill = null;
        this.questionText = null;
        this.power = 0.75;
      }

      create() {
        const width = this.scale.width;
        const height = this.scale.height;

        this.createBackground(width, height);
        this.createGameObjects(width, height);
        this.createAimSystem(width, height);
        this.loadQuestion();

        this.input.on("pointermove", (pointer) => {
          if (!canShoot || ended || shotLocked) return;
          this.updateAim(pointer.x, pointer.y);
        });

        this.input.on("pointerdown", (pointer) => {
          if (!canShoot || ended || shotLocked) return;
          this.updateAim(pointer.x, pointer.y);
          this.pullBow();
        });

        this.input.on("pointerup", (pointer) => {
          if (!canShoot || ended || shotLocked) return;
          this.updateAim(pointer.x, pointer.y);
          this.shoot(pointer.x, pointer.y);
        });
      }

      createBackground(width, height) {
        const sky = this.add.graphics();
        sky.fillGradientStyle(0x1e3a8a, 0x312e81, 0x7c2d12, 0x111827, 1);
        sky.fillRect(0, 0, width, height);

        const sun = this.add.circle(width - 120, 105, 54, 0xfacc15, 0.28).setDepth(0);
        this.tweens.add({
          targets: sun,
          scaleX: 1.15,
          scaleY: 1.15,
          alpha: 0.45,
          duration: 1500,
          yoyo: true,
          repeat: -1,
        });

        for (let layer = 0; layer < 3; layer++) {
          const color = [0x0f172a, 0x1e293b, 0x334155][layer];
          const yBase = height * (0.42 + layer * 0.11);
          for (let i = 0; i < 8; i++) {
            const mountain = this.add.polygon(
              i * (width / 7),
              yBase,
              [
                -140, 220,
                0, -Phaser.Math.Between(120, 220),
                150, 220,
              ],
              color,
              0.55 + layer * 0.12
            ).setDepth(1 + layer);

            this.tweens.add({
              targets: mountain,
              x: mountain.x + (layer + 1) * 8,
              duration: 3500 + layer * 800 + i * 120,
              yoyo: true,
              repeat: -1,
              ease: "Sine.inOut",
            });
          }
        }

        // Clouds
        for (let i = 0; i < 8; i++) {
          const cloud = this.add.container(
            Phaser.Math.Between(0, width),
            Phaser.Math.Between(75, 230)
          ).setDepth(4);

          const alpha = Phaser.Math.FloatBetween(0.08, 0.16);
          cloud.add(this.add.circle(0, 0, 24, 0xffffff, alpha));
          cloud.add(this.add.circle(28, -8, 32, 0xffffff, alpha));
          cloud.add(this.add.circle(62, 0, 24, 0xffffff, alpha));
          cloud.add(this.add.rectangle(32, 12, 80, 26, 0xffffff, alpha));

          this.tweens.add({
            targets: cloud,
            x: cloud.x + Phaser.Math.Between(60, 150),
            duration: Phaser.Math.Between(5000, 9000),
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
          });
        }

        // Ground
        this.add.rectangle(width / 2, height - 48, width, 96, 0x2b1d16, 0.98).setDepth(8);
        this.add.rectangle(width / 2, height - 96, width, 10, 0xf59e0b, 0.45).setDepth(9);

        // Wind/dust particles
        for (let i = 0; i < 38; i++) {
          const dust = this.add.circle(
            Phaser.Math.Between(0, width),
            Phaser.Math.Between(height - 135, height - 35),
            Phaser.Math.Between(2, 5),
            0xfacc15,
            Phaser.Math.FloatBetween(0.1, 0.32)
          ).setDepth(10);

          this.tweens.add({
            targets: dust,
            x: dust.x + Phaser.Math.Between(-120, 140),
            y: dust.y + Phaser.Math.Between(-16, 16),
            alpha: 0,
            duration: Phaser.Math.Between(1600, 3400),
            repeat: -1,
          });
        }
      }

      createGameObjects(width, height) {
        this.questionText = this.add
          .text(34, 36, "", {
            fontSize: width < 700 ? "18px" : "27px",
            color: "#ffffff",
            fontFamily: "Arial",
            fontStyle: "bold",
            wordWrap: { width: width < 700 ? width - 70 : 720 },
            stroke: "#000000",
            strokeThickness: 6,
          })
          .setDepth(70);

        this.add
          .text(36, height - 60, "Use right-side open space to aim • Release to shoot • Targets move vertically", {
            fontSize: width < 700 ? "12px" : "16px",
            color: "#fde68a",
            fontFamily: "Arial",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 4,
          })
          .setDepth(70);

        // Right-side aim zone, kept mostly transparent so it does not disturb the scene.
        this.add.rectangle(width - 165, height / 2 + 20, 260, 360, 0x020617, 0.18).setDepth(18);
        this.add
          .text(width - 165, height / 2 - 190, "AIM ZONE", {
            fontSize: width < 700 ? "12px" : "15px",
            color: "#fde68a",
            fontFamily: "Arial",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setDepth(70);

        this.createBow(width, height);
        this.createPowerBar(width, height);
      }

      createBow(width, height) {
        const bowX = width - 150;
        const bowY = height / 2 + 20;

        this.bow = this.add.container(bowX, bowY).setDepth(60);

        const glow = this.add.circle(0, 0, 86, 0xfacc15, 0.08);
        const handle = this.add.circle(-4, 0, 18, 0x7c2d12);

        const outerBow = this.add.graphics();
        outerBow.lineStyle(15, 0x0f172a, 1);
        outerBow.beginPath();
        outerBow.arc(0, 0, 104, -1.35, 1.35, false);
        outerBow.strokePath();

        const goldBow = this.add.graphics();
        goldBow.lineStyle(9, 0xf59e0b, 1);
        goldBow.beginPath();
        goldBow.arc(0, 0, 100, -1.33, 1.33, false);
        goldBow.strokePath();

        const string = this.add.graphics();
        string.lineStyle(4, 0xffffff, 0.95);
        string.beginPath();
        string.moveTo(36, -96);
        string.lineTo(-4, 0);
        string.lineTo(36, 96);
        string.strokePath();

        const readyArrow = this.add.rectangle(-62, 0, 126, 8, 0xf8fafc);
        const readyHead = this.add.triangle(-130, 0, 0, -14, 0, 14, -26, 0, 0xef4444);
        const featherA = this.add.triangle(4, -6, 0, 0, 0, 13, 18, 0, 0x38bdf8);
        const featherB = this.add.triangle(4, 6, 0, 0, 0, -13, 18, 0, 0x60a5fa);

        this.bow.add([glow, handle, outerBow, goldBow, string, readyArrow, readyHead, featherA, featherB]);

        this.tweens.add({
          targets: glow,
          scaleX: 1.25,
          scaleY: 1.25,
          alpha: 0.18,
          duration: 900,
          yoyo: true,
          repeat: -1,
        });

        this.tweens.add({
          targets: this.bow,
          y: bowY + 7,
          duration: 950,
          yoyo: true,
          repeat: -1,
          ease: "Sine.inOut",
        });
      }

      createPowerBar(width, height) {
        this.add.rectangle(54, height - 80, 18, 160, 0x020617, 0.65).setDepth(66);
        this.add.rectangle(54, height - 80, 12, 148, 0x1e293b, 0.9).setDepth(67);
        this.powerFill = this.add.rectangle(54, height - 6, 10, 0, 0xfacc15, 0.95).setDepth(68);
      }

      createAimSystem(width, height) {
        this.aimLine = this.add.graphics().setDepth(58);
        this.crosshair = this.add.container(width / 2, height / 2).setDepth(75);

        const cross = this.add.graphics();
        cross.lineStyle(3, 0xffffff, 0.95);
        cross.beginPath();
        cross.moveTo(-24, 0);
        cross.lineTo(-8, 0);
        cross.moveTo(8, 0);
        cross.lineTo(24, 0);
        cross.moveTo(0, -24);
        cross.lineTo(0, -8);
        cross.moveTo(0, 8);
        cross.lineTo(0, 24);
        cross.strokePath();

        const dot = this.add.circle(0, 0, 4, 0xfacc15);
        this.crosshair.add([cross, dot]);

        this.tweens.add({
          targets: this.crosshair,
          scaleX: 1.12,
          scaleY: 1.12,
          duration: 600,
          yoyo: true,
          repeat: -1,
        });
      }

      pullBow() {
        if (!this.bow) return;
        this.tweens.add({
          targets: this.bow,
          scaleX: 0.96,
          scaleY: 1.05,
          duration: 120,
          yoyo: true,
          ease: "Sine.out",
        });
      }

      updateAim(x, y) {
        const width = this.scale.width;
        const height = this.scale.height;
        const bowX = width - 220;
        const bowY = height / 2 + 20;

        this.crosshair.x = x;
        this.crosshair.y = y;

        const angle = Phaser.Math.Angle.Between(width - 120, bowY, x, y);
        this.bow.rotation = angle;

        const distance = Phaser.Math.Distance.Between(bowX, bowY, x, y);
        this.power = Phaser.Math.Clamp(distance / 480, 0.35, 1);

        this.powerFill.height = 148 * this.power;
        this.powerFill.y = height - 6 - this.powerFill.height / 2;

        this.aimLine.clear();
        this.aimLine.lineStyle(3, 0xfacc15, 0.6);
        this.aimLine.beginPath();
        this.aimLine.moveTo(bowX, bowY);
        this.aimLine.lineTo(x, y);
        this.aimLine.strokePath();
      }

      clearRoundObjects() {
        this.targets.forEach((item) => item.destroy());
        this.labels.forEach((item) => item.destroy());
        this.fxObjects.forEach((item) => item.destroy());
        this.targets = [];
        this.labels = [];
        this.fxObjects = [];

        if (this.arrow) {
          this.arrow.destroy();
          this.arrow = null;
        }

        this.aimLine?.clear();
        if (this.powerFill) this.powerFill.height = 0;
      }

      shuffleOptions(options) {
        const shuffled = [...options];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Phaser.Math.Between(0, i);
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      }

      loadQuestion() {
        this.clearRoundObjects();

        if (currentIndex >= safeQuestions.length) {
          this.endGame();
          return;
        }

        arrowsLeft = 3;
        canShoot = true;
        shotLocked = false;

        const width = this.scale.width;
        const height = this.scale.height;
        const q = safeQuestions[currentIndex];

        this.questionText.setText(`Q${currentIndex + 1}. ${q.question}`);

        const optionSet = new Set([...(q.options || []), q.answer]);
        const options = this.shuffleOptions([...optionSet]).slice(0, 4);
        const positions =
          width < 760
            ? [
                [width * 0.30, height * 0.26],
                [width * 0.43, height * 0.40],
                [width * 0.31, height * 0.58],
                [width * 0.45, height * 0.72],
              ]
            : [
                [width * 0.34, height * 0.28],
                [width * 0.45, height * 0.38],
                [width * 0.31, height * 0.62],
                [width * 0.46, height * 0.72],
              ];

        options.forEach((answer, index) => {
          const [x, y] = positions[index];
          const target = this.createTarget(x, y, answer, index);

          this.targets.push(...target.objects);
          this.labels.push(target.label);

          const difficulty = Math.min(520, currentIndex * 70);
          const moveY = index % 2 === 0 ? 70 : -70;

          // Vertical movement only. This gives a cleaner archery feel
          // and keeps the right side free for aiming/dragging.
          this.tweens.add({
            targets: target.objects,
            y: `+=${moveY}`,
            duration: Math.max(760, 1350 - difficulty + index * 150),
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
          });

          // Stable glow. No scale pulsing here because it looked like blinking.
          target.glow.setAlpha(0.2);
        });

        syncHud("3 arrows loaded. Use the open right-side space to aim.");
      }

      createTarget(x, y, answer, index) {
        const colors = [0xef4444, 0x3b82f6, 0x22c55e, 0xa855f7];
        const color = colors[index % colors.length];

        const shadow = this.add.ellipse(x + 10, y + 18, 128, 38, 0x000000, 0.25).setDepth(19);
        const glow = this.add.circle(x, y, 60, color, 0.16).setDepth(20);
        const outer = this.add.circle(x, y, 52, 0xffffff).setDepth(22);
        const blue = this.add.circle(x, y, 43, 0x38bdf8).setDepth(23);
        const dark = this.add.circle(x, y, 34, 0x111827).setDepth(24);
        const gold = this.add.circle(x, y, 25, 0xfacc15).setDepth(25);
        const inner = this.add.circle(x, y, 16, color).setDepth(26);

        const label = this.add
          .text(x, y, answer, {
            fontSize: "18px",
            color: "#ffffff",
            fontFamily: "Arial",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setDepth(28);

        const zone = this.add
          .zone(x, y, 128, 128)
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .setDepth(29);

        zone.answer = answer;
        zone.outer = outer;
        zone.blue = blue;
        zone.dark = dark;
        zone.gold = gold;
        zone.inner = inner;
        zone.glow = glow;
        zone.shadow = shadow;

        return {
          objects: [shadow, glow, outer, blue, dark, gold, inner, label, zone],
          rings: [outer, blue, dark, gold, inner],
          glow,
          label,
        };
      }

      shoot(pointerX, pointerY) {
        if (!canShoot || arrowsLeft <= 0 || shotLocked) return;

        canShoot = false;
        shotLocked = true;
        this.aimLine.clear();

        arrowsLeft -= 1;
        syncHud("Arrow flying...");

        const startX = this.scale.width - 220;
        const startY = this.scale.height / 2 + 20;
        const angle = Phaser.Math.Angle.Between(startX, startY, pointerX, pointerY);
        const speed = 1150 + this.power * 850;

        this.arrow = this.add.container(startX, startY).setDepth(63);
        const shaft = this.add.rectangle(0, 0, 108, 8, 0xf8fafc);
        const head = this.add.triangle(-65, 0, 0, -13, 0, 13, -26, 0, 0xef4444);
        const feather1 = this.add.triangle(52, -6, 0, 0, 0, 13, 18, 0, 0x38bdf8);
        const feather2 = this.add.triangle(52, 6, 0, 0, 0, -13, 18, 0, 0x60a5fa);

        this.arrow.add([shaft, head, feather1, feather2]);
        this.arrow.rotation = angle;

        this.physics.add.existing(this.arrow);
        this.arrow.body.setSize(108, 16);
        this.arrow.body.setAllowGravity(false);
        this.arrow.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

        const trailTimer = this.time.addEvent({
          delay: 18,
          loop: true,
          callback: () => {
            if (!this.arrow || !this.arrow.active) return;
            const trail = this.add.circle(this.arrow.x, this.arrow.y, 5, 0xfacc15, 0.68).setDepth(61);
            this.tweens.add({
              targets: trail,
              alpha: 0,
              scale: 0,
              duration: 280,
              onComplete: () => trail.destroy(),
            });
          },
        });

        const hitTimer = this.time.addEvent({
          delay: 16,
          loop: true,
          callback: () => {
            if (!this.arrow || !this.arrow.active) {
              hitTimer.remove(false);
              trailTimer.remove(false);
              return;
            }

            let hitZone = null;
            const zones = this.targets.filter((item) => item.type === "Zone");

            zones.forEach((zone) => {
              const distance = Phaser.Math.Distance.Between(this.arrow.x, this.arrow.y, zone.x, zone.y);
              if (distance < 62) hitZone = zone;
            });

            if (hitZone) {
              hitTimer.remove(false);
              trailTimer.remove(false);
              this.arrow.body.setVelocity(0, 0);
              this.checkAnswer(hitZone);
              return;
            }

            if (
              this.arrow.x < -140 ||
              this.arrow.x > this.scale.width + 140 ||
              this.arrow.y < -140 ||
              this.arrow.y > this.scale.height + 140
            ) {
              hitTimer.remove(false);
              trailTimer.remove(false);
              this.handleMiss();
            }
          },
        });
      }

      checkAnswer(zone) {
        const q = safeQuestions[currentIndex];
        const correct =
          String(zone.answer).trim().toLowerCase() ===
          String(q.answer).trim().toLowerCase();

        if (correct) this.handleCorrect(zone);
        else this.handleWrong(zone);
      }

      getShotPoints() {
        if (arrowsLeft === 2) return 30;
        if (arrowsLeft === 1) return 20;
        return 10;
      }

      handleCorrect(zone) {
        this.arrow?.destroy();
        this.arrow = null;

        const base = this.getShotPoints();
        combo += 1;

        const comboBonus = combo >= 3 ? 15 : 0;
        const perfectBonus = arrowsLeft === 2 ? 15 : 0;
        const gained = base + comboBonus + perfectBonus;

        score += gained;

        this.paintTarget(zone, 0x22c55e);
        this.burst(zone.x, zone.y, 0x22c55e, true);
        this.floatingText(zone.x, zone.y - 90, `+${gained}`, "#22c55e");

        if (perfectBonus) this.centerMessage("PERFECT HIT!", "#facc15");
        else if (comboBonus) this.centerMessage("COMBO BONUS!", "#38bdf8");
        else this.centerMessage("CORRECT!", "#22c55e");

        this.cameras.main.flash(130, 34, 197, 94);
        syncHud(`Correct! +${gained} points.`);

        this.time.delayedCall(950, () => {
          currentIndex += 1;
          shotLocked = false;
          if (currentIndex >= safeQuestions.length) this.endGame();
          else this.loadQuestion();
        });
      }

      handleWrong(zone) {
        this.arrow?.destroy();
        this.arrow = null;

        combo = 0;
        score = Math.max(0, score - 5);

        this.paintTarget(zone, 0xef4444);
        this.burst(zone.x, zone.y, 0xef4444, false);
        this.centerMessage("WRONG TARGET!", "#ef4444");
        this.cameras.main.shake(160, 0.008);

        if (arrowsLeft <= 0) {
          syncHud("No arrows left. Moving to next question.");
          this.time.delayedCall(950, () => {
            currentIndex += 1;
            shotLocked = false;
            if (currentIndex >= safeQuestions.length) this.endGame();
            else this.loadQuestion();
          });
        } else {
          syncHud(`Wrong. Reloading... ${arrowsLeft} arrows left.`);
          this.reloadArrow();
        }
      }

      handleMiss() {
        this.arrow?.destroy();
        this.arrow = null;

        combo = 0;
        this.centerMessage("MISS!", "#f97316");
        this.cameras.main.shake(120, 0.006);

        if (arrowsLeft <= 0) {
          syncHud("No arrows left. Moving to next question.");
          this.time.delayedCall(950, () => {
            currentIndex += 1;
            shotLocked = false;
            if (currentIndex >= safeQuestions.length) this.endGame();
            else this.loadQuestion();
          });
        } else {
          syncHud(`Missed. Reloading... ${arrowsLeft} arrows left.`);
          this.reloadArrow();
        }
      }

      reloadArrow() {
        const x = this.scale.width - 170;
        const y = this.scale.height / 2 + 20;

        const reloadText = this.add
          .text(x, y - 120, "RELOADING", {
            fontSize: "20px",
            color: "#facc15",
            fontFamily: "Arial",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 5,
          })
          .setOrigin(0.5)
          .setDepth(80);

        const icon = this.add
          .text(x, y + 130, "🏹", { fontSize: "46px" })
          .setOrigin(0.5)
          .setDepth(80);

        this.tweens.add({
          targets: icon,
          y,
          alpha: 0,
          duration: 540,
          ease: "Back.in",
          onComplete: () => {
            reloadText.destroy();
            icon.destroy();
            shotLocked = false;
            canShoot = true;
            syncHud(`${arrowsLeft} arrow${arrowsLeft === 1 ? "" : "s"} left. Aim again.`);
          },
        });
      }

      paintTarget(zone, color) {
        zone.glow?.setFillStyle(color, 0.28);
        zone.outer?.setFillStyle(color);
        zone.blue?.setFillStyle(0xffffff);
        zone.dark?.setFillStyle(0x111827);
        zone.gold?.setFillStyle(0xffffff);
        zone.inner?.setFillStyle(color);

        this.tweens.add({
          targets: [zone.glow, zone.outer, zone.blue, zone.dark, zone.gold, zone.inner],
          scaleX: 1.45,
          scaleY: 1.45,
          yoyo: true,
          duration: 170,
          ease: "Back.out",
        });
      }

      burst(x, y, color, correct) {
        const count = correct ? 58 : 30;

        for (let i = 0; i < count; i++) {
          const p = this.add
            .circle(x, y, Phaser.Math.Between(3, 8), color, Phaser.Math.FloatBetween(0.75, 1))
            .setDepth(90);

          this.tweens.add({
            targets: p,
            x: x + Phaser.Math.Between(-170, 170),
            y: y + Phaser.Math.Between(-150, 150),
            alpha: 0,
            scale: 0,
            duration: correct ? 760 : 500,
            ease: "Cubic.out",
            onComplete: () => p.destroy(),
          });
        }

        if (correct) {
          for (let i = 0; i < 15; i++) {
            const star = this.add.text(x, y, "⭐", { fontSize: "20px" }).setOrigin(0.5).setDepth(91);
            this.tweens.add({
              targets: star,
              x: x + Phaser.Math.Between(-130, 130),
              y: y + Phaser.Math.Between(-120, 120),
              alpha: 0,
              scale: 0.2,
              duration: 800,
              onComplete: () => star.destroy(),
            });
          }
        }
      }

      floatingText(x, y, text, color) {
        const item = this.add
          .text(x, y, text, {
            fontSize: "30px",
            color,
            fontFamily: "Arial",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 6,
          })
          .setOrigin(0.5)
          .setDepth(95);

        this.tweens.add({
          targets: item,
          y: y - 55,
          alpha: 0,
          scale: 1.16,
          duration: 900,
          onComplete: () => item.destroy(),
        });
      }

      centerMessage(text, color) {
        const item = this.add
          .text(this.scale.width / 2, this.scale.height / 2 - 135, text, {
            fontSize: "36px",
            color,
            fontFamily: "Arial",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 7,
          })
          .setOrigin(0.5)
          .setDepth(96);

        this.tweens.add({
          targets: item,
          y: item.y - 52,
          alpha: 0,
          scale: 1.18,
          duration: 900,
          onComplete: () => item.destroy(),
        });
      }

      endGame() {
        if (ended) return;
        ended = true;
        canShoot = false;
        shotLocked = true;
        this.clearRoundObjects();

        const width = this.scale.width;
        const height = this.scale.height;

        const xp = Math.max(20, Math.round(score / 2));
        const coins = Math.max(10, Math.round(score / 8));

        this.add.rectangle(width / 2, height / 2, Math.min(width - 60, 680), 380, 0x111827, 0.97).setDepth(100);

        this.add
          .text(width / 2, height / 2 - 138, "🏆 ARENA COMPLETE", {
            fontSize: width < 700 ? "30px" : "44px",
            color: "#ffffff",
            fontFamily: "Arial",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 7,
          })
          .setOrigin(0.5)
          .setDepth(101);

        this.add
          .text(width / 2, height / 2 - 46, `Final Score: ${score}`, {
            fontSize: "31px",
            color: "#facc15",
            fontFamily: "Arial",
            fontStyle: "bold",
          })
          .setOrigin(0.5)
          .setDepth(101);

        this.add
          .text(width / 2, height / 2 + 22, `Reward: +${xp} XP · +${coins} Coins`, {
            fontSize: "22px",
            color: "#22c55e",
            fontFamily: "Arial",
          })
          .setOrigin(0.5)
          .setDepth(101);

        this.add
          .text(width / 2, height / 2 + 92, "Use Exit button to return to Student OS", {
            fontSize: "17px",
            color: "#cbd5e1",
            fontFamily: "Arial",
          })
          .setOrigin(0.5)
          .setDepth(101);

        this.burst(width / 2, height / 2 + 150, 0xfacc15, true);

        syncHud("Game complete.");

        if (!rewardSentRef.current && typeof onRewardRef.current === "function") {
          rewardSentRef.current = true;
          onRewardRef.current({
            xp,
            coins,
            score,
            total: safeQuestions.length,
            mode: "archery-cinematic-v3",
          });
        }
      }
    }

    const config = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 1280,
      height: 720,
      backgroundColor: "#020617",
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
    <div className="fixed inset-0 z-[99999] overflow-hidden bg-slate-950 text-white">
      <div className="flex h-screen w-screen flex-col">
        <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-950/95 p-3 shadow-2xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black sm:text-3xl">🏹 Archery Arena V3 Shuffle</h1>
            <p className="text-xs text-slate-400 sm:text-sm">
              {topic || "Study Topic"} · vertical moving targets · bigger aim space · 3 arrows
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold sm:text-sm">
              Score: {hud.score}
            </div>
            <div className="rounded-xl bg-blue-400/10 px-3 py-2 text-xs font-bold text-blue-300 sm:text-sm">
              Combo: {hud.combo}
            </div>
            <div className="rounded-xl bg-yellow-400/10 px-3 py-2 text-xs font-bold text-yellow-300 sm:text-sm">
              Arrows: {hud.arrows}
            </div>
            <div className="rounded-xl bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300 sm:text-sm">
              Q: {hud.current}/{hud.total}
            </div>
            <button
              onClick={onExit}
              className="rounded-xl bg-red-500 px-4 py-2 text-xs font-bold text-white hover:bg-red-600 sm:text-sm"
            >
              Exit
            </button>
          </div>
        </div>

        <div className="border-b border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200">
          {hud.message}
        </div>

        <div ref={containerRef} className="h-full min-h-0 w-full flex-1 bg-slate-950" />
      </div>
    </div>
  );
}
