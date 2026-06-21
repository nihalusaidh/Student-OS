import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

/**
 * ArcheryGame Cinematic Pro
 *
 * Replace:
 *   src/components/games/ArcheryGame.jsx
 *
 * Style:
 * - Narrow.One-inspired 2D archery arena
 * - No external assets needed
 * - Canyon background
 * - Right-side bow
 * - Moving answer targets
 * - Crosshair aiming
 * - 3 arrows per question
 * - Reload animation
 * - Combo + perfect-shot scoring
 * - Particle explosions
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

  const [hud, setHud] = useState({
    score: 0,
    combo: 0,
    arrows: 3,
    current: 1,
    total: Math.max(questions.length, 1),
    message: "Drag / aim / release. Hit the correct moving answer.",
  });

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const safeQuestions =
      questions.length > 0
        ? questions
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

    class CinematicArcheryScene extends Phaser.Scene {
      constructor() {
        super("CinematicArcheryScene");
        this.answerTargets = [];
        this.labels = [];
        this.arrow = null;
        this.bow = null;
        this.bowString = null;
        this.crosshair = null;
        this.aimLine = null;
        this.questionText = null;
        this.scoreText = null;
        this.comboText = null;
        this.arrowText = null;
        this.powerFill = null;
        this.power = 0.6;
      }

      create() {
        const width = this.scale.width;
        const height = this.scale.height;

        this.createCanyonWorld(width, height);
        this.createGameHud(width, height);
        this.createBow(width, height);
        this.createCrosshair(width, height);
        this.createPowerBar(width, height);

        this.aimLine = this.add.graphics();

        this.questionText = this.add
          .text(46, 94, "", {
            fontSize: width < 700 ? "18px" : "26px",
            color: "#ffffff",
            fontFamily: "Arial",
            fontStyle: "bold",
            wordWrap: { width: width < 700 ? width - 90 : 610 },
            stroke: "#1f2937",
            strokeThickness: 5,
          })
          .setDepth(50);

        this.loadQuestion();

        this.input.on("pointermove", (pointer) => {
          if (!canShoot || ended) return;
          this.moveCrosshair(pointer.x, pointer.y);
          this.rotateBow(pointer.x, pointer.y);
          this.drawAim(pointer.x, pointer.y);
        });

        this.input.on("pointerdown", (pointer) => {
          if (!canShoot || ended) return;
          this.moveCrosshair(pointer.x, pointer.y);
          this.rotateBow(pointer.x, pointer.y);
          this.drawAim(pointer.x, pointer.y);
        });

        this.input.on("pointerup", (pointer) => {
          if (!canShoot || ended) return;
          this.moveCrosshair(pointer.x, pointer.y);
          this.rotateBow(pointer.x, pointer.y);
          this.shoot(pointer.x, pointer.y);
        });
      }

      createCanyonWorld(width, height) {
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x8b5a44, 0x8b5a44, 0x5b342b, 0x3b1f1a, 1);
        bg.fillRect(0, 0, width, height);

        const colors = [0x9b6a56, 0x875542, 0x6f4034, 0xaa7b62];
        for (let i = 0; i < 9; i++) {
          const x = i * (width / 8);
          const poly = this.add.polygon(
            x,
            height / 2,
            [
              0, -height / 2,
              width / 6, -height / 2,
              width / 7, height / 2,
              -width / 12, height / 2,
            ],
            colors[i % colors.length],
            0.5
          );
          poly.setDepth(0);
          this.tweens.add({
            targets: poly,
            x: x + 12,
            duration: 2600 + i * 170,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
          });
        }

        const sun = this.add.circle(width - 120, 110, 46, 0xfbbf24, 0.25);
        this.tweens.add({
          targets: sun,
          scaleX: 1.18,
          scaleY: 1.18,
          alpha: 0.38,
          duration: 1500,
          yoyo: true,
          repeat: -1,
        });

        this.add.rectangle(width / 2, height - 44, width, 88, 0x3f2a1f, 0.95);
        this.add.rectangle(width / 2, height - 88, width, 12, 0xf59e0b, 0.38);

        for (let i = 0; i < 18; i++) {
          const dust = this.add.circle(
            Phaser.Math.Between(0, width),
            Phaser.Math.Between(height - 115, height - 35),
            Phaser.Math.Between(2, 5),
            0xfacc15,
            Phaser.Math.FloatBetween(0.12, 0.28)
          );
          this.tweens.add({
            targets: dust,
            x: dust.x + Phaser.Math.Between(-60, 60),
            alpha: 0,
            duration: Phaser.Math.Between(1600, 3000),
            repeat: -1,
          });
        }
      }

      createGameHud(width, height) {
        this.add.rectangle(width / 2, 32, width, 64, 0x111827, 0.78).setDepth(40);

        this.add.text(32, 14, "🏹 STUDY ARCHERY", {
          fontSize: width < 700 ? "16px" : "21px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 4,
        }).setDepth(50);

        this.scoreText = this.add.text(width - 350, 16, "Score 0", {
          fontSize: width < 700 ? "14px" : "19px",
          color: "#facc15",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 4,
        }).setDepth(50);

        this.comboText = this.add.text(width - 220, 16, "Combo 0", {
          fontSize: width < 700 ? "14px" : "19px",
          color: "#38bdf8",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 4,
        }).setDepth(50);

        this.arrowText = this.add.text(width - 100, 16, "🏹🏹🏹", {
          fontSize: width < 700 ? "14px" : "19px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 4,
        }).setDepth(50);

        this.add.text(width - 280, height - 62, "Moving answer targets", {
          fontSize: width < 700 ? "13px" : "16px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 4,
        }).setDepth(50);
      }

      createBow(width, height) {
        const bowX = width - 110;
        const bowY = height / 2 + 20;

        this.bow = this.add.container(bowX, bowY).setDepth(30);

        const hand = this.add.circle(-14, 0, 18, 0x7c2d12);
        const bowArc = this.add.graphics();
        bowArc.lineStyle(13, 0x111827, 1);
        bowArc.beginPath();
        bowArc.arc(0, 0, 98, -1.35, 1.35, false);
        bowArc.strokePath();

        const bowArcGold = this.add.graphics();
        bowArcGold.lineStyle(8, 0xf59e0b, 1);
        bowArcGold.beginPath();
        bowArcGold.arc(0, 0, 95, -1.32, 1.32, false);
        bowArcGold.strokePath();

        this.bowString = this.add.graphics();
        this.bowString.lineStyle(4, 0xffffff, 1);
        this.bowString.beginPath();
        this.bowString.moveTo(34, -91);
        this.bowString.lineTo(-2, 0);
        this.bowString.lineTo(34, 91);
        this.bowString.strokePath();

        const readyArrow = this.add.rectangle(-58, 0, 118, 9, 0xf8fafc);
        const readyHead = this.add.triangle(-122, 0, 0, -13, 0, 13, -23, 0, 0xef4444);

        this.bow.add([hand, bowArc, bowArcGold, this.bowString, readyArrow, readyHead]);

        this.tweens.add({
          targets: this.bow,
          y: bowY + 8,
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: "Sine.inOut",
        });
      }

      createCrosshair(width, height) {
        const x = width / 2;
        const y = height / 2;

        this.crosshair = this.add.container(x, y).setDepth(45);
        const g = this.add.graphics();
        g.lineStyle(4, 0xffffff, 0.95);
        g.beginPath();
        g.moveTo(-22, 0);
        g.lineTo(-8, 0);
        g.moveTo(8, 0);
        g.lineTo(22, 0);
        g.moveTo(0, -22);
        g.lineTo(0, -8);
        g.moveTo(0, 8);
        g.lineTo(0, 22);
        g.strokePath();

        const dot = this.add.circle(0, 0, 4, 0xfacc15);
        this.crosshair.add([g, dot]);

        this.tweens.add({
          targets: this.crosshair,
          scaleX: 1.12,
          scaleY: 1.12,
          duration: 650,
          yoyo: true,
          repeat: -1,
        });
      }

      createPowerBar(width, height) {
        this.add.rectangle(56, height - 58, 14, 150, 0x111827, 0.75).setDepth(45);
        this.powerFill = this.add.rectangle(56, height + 17, 10, 0, 0xfacc15, 0.95).setDepth(46);
      }

      moveCrosshair(x, y) {
        this.crosshair.x = x;
        this.crosshair.y = y;
      }

      rotateBow(x, y) {
        const bowX = this.scale.width - 110;
        const bowY = this.scale.height / 2 + 20;
        const angle = Phaser.Math.Angle.Between(bowX, bowY, x, y);
        this.bow.rotation = angle;
      }

      drawAim(x, y) {
        const bowX = this.scale.width - 160;
        const bowY = this.scale.height / 2 + 20;
        const distance = Phaser.Math.Distance.Between(bowX, bowY, x, y);
        this.power = Phaser.Math.Clamp(distance / 460, 0.32, 1);

        this.powerFill.height = 145 * this.power;
        this.powerFill.y = this.scale.height + 17 - this.powerFill.height / 2;

        this.aimLine.clear();
        this.aimLine.lineStyle(3, 0xfacc15, 0.68);
        this.aimLine.beginPath();
        this.aimLine.moveTo(bowX, bowY);
        this.aimLine.lineTo(x, y);
        this.aimLine.strokePath();
      }

      clearQuestionObjects() {
        this.answerTargets.forEach((item) => item.destroy());
        this.labels.forEach((item) => item.destroy());
        this.answerTargets = [];
        this.labels = [];

        if (this.arrow) {
          this.arrow.destroy();
          this.arrow = null;
        }

        this.aimLine?.clear();
        if (this.powerFill) this.powerFill.height = 0;
      }

      loadQuestion() {
        this.clearQuestionObjects();

        if (currentIndex >= safeQuestions.length) {
          this.endGame();
          return;
        }

        arrowsLeft = 3;
        canShoot = true;
        syncHud("3 arrows loaded. Correct on first arrow gives maximum points.");

        const width = this.scale.width;
        const height = this.scale.height;
        const q = safeQuestions[currentIndex];
        this.questionText.setText(`Q${currentIndex + 1}. ${q.question}`);
        this.updateGameHud();

        const options = [...q.options].slice(0, 4);
        const positions =
          width < 760
            ? [
                [width * 0.42, height * 0.30],
                [width * 0.52, height * 0.48],
                [width * 0.37, height * 0.66],
                [width * 0.60, height * 0.68],
              ]
            : [
                [width * 0.42, height * 0.28],
                [width * 0.57, height * 0.38],
                [width * 0.40, height * 0.62],
                [width * 0.58, height * 0.70],
              ];

        options.forEach((answer, index) => {
          const [x, y] = positions[index];
          const target = this.createAnswerTarget(x, y, answer, index);
          this.answerTargets.push(...target.objects);
          this.labels.push(target.label);

          const difficulty = Math.min(520, currentIndex * 70);
          this.tweens.add({
            targets: target.objects,
            x: `+=${index % 2 === 0 ? 95 : -95}`,
            y: `+=${index % 2 === 0 ? 24 : -24}`,
            duration: Math.max(620, 1250 - difficulty + index * 110),
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
          });

          this.tweens.add({
            targets: target.rings,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 520 + index * 80,
            yoyo: true,
            repeat: -1,
          });
        });
      }

      createAnswerTarget(x, y, answer, index) {
        const shield = this.add.graphics().setDepth(20);
        const color = [0xdc2626, 0x2563eb, 0x16a34a, 0x7c3aed][index % 4];

        shield.fillStyle(0xffffff, 1);
        shield.fillRoundedRect(x - 66, y - 42, 132, 84, 16);
        shield.fillStyle(color, 1);
        shield.fillRoundedRect(x - 58, y - 34, 116, 68, 13);

        const outer = this.add.circle(x, y, 43, 0xffffff).setDepth(21);
        const middle = this.add.circle(x, y, 34, 0x111827).setDepth(22);
        const ring = this.add.circle(x, y, 24, 0xfacc15).setDepth(23);
        const inner = this.add.circle(x, y, 15, color).setDepth(24);

        const zone = this.add
          .zone(x, y, 138, 94)
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .setDepth(26);

        zone.answer = answer;
        zone.outer = outer;
        zone.middle = middle;
        zone.ring = ring;
        zone.inner = inner;
        zone.shield = shield;

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
          .setDepth(25);

        // Move graphics manually with proxy zone
        shield.x = 0;
        shield.y = 0;
        shield.baseX = x;
        shield.baseY = y;

        const objects = [outer, middle, ring, inner, zone, label];

        // Since Phaser graphics shape does not move with x/y paths easily after fillRect,
        // keep the shield as decorative background and fade it with the target label/rings.
        this.tweens.add({
          targets: shield,
          alpha: 0.82,
          duration: 650,
          yoyo: true,
          repeat: -1,
        });

        return { objects, rings: [outer, middle, ring, inner], label };
      }

      shoot(pointerX, pointerY) {
        if (!canShoot || arrowsLeft <= 0) return;

        canShoot = false;
        this.aimLine.clear();

        arrowsLeft -= 1;
        this.updateGameHud();

        const startX = this.scale.width - 168;
        const startY = this.scale.height / 2 + 20;
        const angle = Phaser.Math.Angle.Between(startX, startY, pointerX, pointerY);
        const speed = 1100 + this.power * 800;

        this.arrow = this.add.container(startX, startY).setDepth(38);

        const shaft = this.add.rectangle(0, 0, 98, 8, 0xf8fafc);
        const head = this.add.triangle(-58, 0, 0, -12, 0, 12, -24, 0, 0xef4444);
        const feather1 = this.add.triangle(50, -5, 0, 0, 0, 12, 18, 0, 0x38bdf8);
        const feather2 = this.add.triangle(50, 5, 0, 0, 0, -12, 18, 0, 0x60a5fa);

        this.arrow.add([shaft, head, feather1, feather2]);
        this.arrow.rotation = angle;

        this.physics.add.existing(this.arrow);
        this.arrow.body.setSize(100, 14);
        this.arrow.body.setAllowGravity(false);
        this.arrow.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

        const trailTimer = this.time.addEvent({
          delay: 22,
          loop: true,
          callback: () => {
            if (!this.arrow || !this.arrow.active) return;
            const trail = this.add.circle(this.arrow.x, this.arrow.y, 4, 0xfacc15, 0.7).setDepth(35);
            this.tweens.add({
              targets: trail,
              alpha: 0,
              scale: 0,
              duration: 270,
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
            const zones = this.answerTargets.filter((item) => item.type === "Zone");

            zones.forEach((zone) => {
              const distance = Phaser.Math.Distance.Between(this.arrow.x, this.arrow.y, zone.x, zone.y);
              if (distance < 58) hitZone = zone;
            });

            if (hitZone) {
              hitTimer.remove(false);
              trailTimer.remove(false);
              this.arrow.body.setVelocity(0, 0);
              this.checkAnswer(hitZone);
              return;
            }

            if (
              this.arrow.x < -120 ||
              this.arrow.x > this.scale.width + 120 ||
              this.arrow.y < -120 ||
              this.arrow.y > this.scale.height + 120
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
        this.floatText(zone.x, zone.y - 92, `+${gained}`, "#22c55e");

        if (perfectBonus) this.centerMessage("PERFECT SHOT!", "#facc15");
        else if (comboBonus) this.centerMessage("COMBO BONUS!", "#38bdf8");
        else this.centerMessage("CORRECT!", "#22c55e");

        this.cameras.main.flash(130, 34, 197, 94);
        this.updateGameHud();
        syncHud(`Correct hit! +${gained} points.`);

        this.time.delayedCall(950, () => {
          currentIndex += 1;
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
        this.cameras.main.shake(170, 0.008);
        this.updateGameHud();

        if (arrowsLeft <= 0) {
          syncHud("No arrows left. Moving to next question.");
          this.time.delayedCall(950, () => {
            currentIndex += 1;
            if (currentIndex >= safeQuestions.length) this.endGame();
            else this.loadQuestion();
          });
        } else {
          syncHud(`Wrong. Reloading... ${arrowsLeft} arrows left.`);
          this.reload();
        }
      }

      handleMiss() {
        this.arrow?.destroy();
        this.arrow = null;

        combo = 0;
        this.centerMessage("MISS!", "#f97316");
        this.cameras.main.shake(130, 0.006);
        this.updateGameHud();

        if (arrowsLeft <= 0) {
          syncHud("No arrows left. Moving to next question.");
          this.time.delayedCall(950, () => {
            currentIndex += 1;
            if (currentIndex >= safeQuestions.length) this.endGame();
            else this.loadQuestion();
          });
        } else {
          syncHud(`Missed. Reloading... ${arrowsLeft} arrows left.`);
          this.reload();
        }
      }

      reload() {
        const reload = this.add
          .text(this.scale.width - 135, this.scale.height / 2 - 115, "RELOADING", {
            fontSize: "19px",
            color: "#facc15",
            fontFamily: "Arial",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setDepth(60);

        const arrowIcon = this.add
          .text(this.scale.width - 135, this.scale.height / 2 + 120, "🏹", {
            fontSize: "42px",
          })
          .setOrigin(0.5)
          .setDepth(60);

        this.tweens.add({
          targets: arrowIcon,
          y: this.scale.height / 2 + 20,
          alpha: 0,
          duration: 560,
          ease: "Back.in",
          onComplete: () => {
            reload.destroy();
            arrowIcon.destroy();
            canShoot = true;
          },
        });
      }

      paintTarget(zone, color) {
        zone.outer?.setFillStyle(color);
        zone.middle?.setFillStyle(0x111827);
        zone.ring?.setFillStyle(0xffffff);
        zone.inner?.setFillStyle(color);

        this.tweens.add({
          targets: [zone.outer, zone.middle, zone.ring, zone.inner],
          scaleX: 1.42,
          scaleY: 1.42,
          yoyo: true,
          duration: 170,
          ease: "Back.out",
        });
      }

      burst(x, y, color, correct) {
        const count = correct ? 52 : 28;

        for (let i = 0; i < count; i++) {
          const particle = this.add
            .circle(x, y, Phaser.Math.Between(3, 8), color, Phaser.Math.FloatBetween(0.75, 1))
            .setDepth(65);

          this.tweens.add({
            targets: particle,
            x: x + Phaser.Math.Between(-165, 165),
            y: y + Phaser.Math.Between(-145, 145),
            alpha: 0,
            scale: 0,
            duration: correct ? 730 : 480,
            ease: "Cubic.out",
            onComplete: () => particle.destroy(),
          });
        }

        if (correct) {
          for (let i = 0; i < 15; i++) {
            const star = this.add.text(x, y, "⭐", { fontSize: "20px" }).setOrigin(0.5).setDepth(66);
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

      floatText(x, y, text, color) {
        const item = this.add
          .text(x, y, text, {
            fontSize: "29px",
            color,
            fontFamily: "Arial",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 5,
          })
          .setOrigin(0.5)
          .setDepth(70);

        this.tweens.add({
          targets: item,
          y: y - 48,
          alpha: 0,
          duration: 850,
          onComplete: () => item.destroy(),
        });
      }

      centerMessage(text, color) {
        const item = this.add
          .text(this.scale.width / 2, this.scale.height / 2 - 130, text, {
            fontSize: "34px",
            color,
            fontFamily: "Arial",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 6,
          })
          .setOrigin(0.5)
          .setDepth(75);

        this.tweens.add({
          targets: item,
          y: item.y - 46,
          alpha: 0,
          scale: 1.15,
          duration: 900,
          onComplete: () => item.destroy(),
        });
      }

      updateGameHud() {
        this.scoreText?.setText(`Score ${score}`);
        this.comboText?.setText(`Combo ${combo}`);
        this.arrowText?.setText("🏹".repeat(Math.max(0, arrowsLeft)) || "❌");
      }

      endGame() {
        if (ended) return;
        ended = true;
        canShoot = false;
        this.clearQuestionObjects();

        const width = this.scale.width;
        const height = this.scale.height;

        const xp = Math.max(20, Math.round(score / 2));
        const coins = Math.max(10, Math.round(score / 8));

        this.add.rectangle(width / 2, height / 2, Math.min(width - 60, 650), 360, 0x111827, 0.97).setDepth(90);

        this.add
          .text(width / 2, height / 2 - 128, "🏆 ARENA COMPLETE", {
            fontSize: width < 700 ? "30px" : "42px",
            color: "#ffffff",
            fontFamily: "Arial",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 6,
          })
          .setOrigin(0.5)
          .setDepth(91);

        this.add
          .text(width / 2, height / 2 - 42, `Final Score: ${score}`, {
            fontSize: "30px",
            color: "#facc15",
            fontFamily: "Arial",
            fontStyle: "bold",
          })
          .setOrigin(0.5)
          .setDepth(91);

        this.add
          .text(width / 2, height / 2 + 22, `Reward: +${xp} XP · +${coins} Coins`, {
            fontSize: "22px",
            color: "#22c55e",
            fontFamily: "Arial",
          })
          .setOrigin(0.5)
          .setDepth(91);

        this.add
          .text(width / 2, height / 2 + 88, "Exit to return to Student OS", {
            fontSize: "17px",
            color: "#cbd5e1",
            fontFamily: "Arial",
          })
          .setOrigin(0.5)
          .setDepth(91);

        this.burst(width / 2, height / 2 + 142, 0xfacc15, true);

        syncHud("Game complete.");

        if (!rewardSentRef.current && typeof onReward === "function") {
          rewardSentRef.current = true;
          onReward({
            xp,
            coins,
            score,
            total: safeQuestions.length,
            mode: "archery-cinematic",
          });
        }
      }
    }

    const config = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 1180,
      height: 680,
      backgroundColor: "#020617",
      scene: CinematicArcheryScene,
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
  }, [questions, topic, onReward]);

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-slate-950 text-white">
      <div className="flex h-screen w-screen flex-col">
        <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-950/95 p-3 shadow-2xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black sm:text-3xl">🏹 Cinematic Archery Arena</h1>
            <p className="text-xs text-slate-400 sm:text-sm">
              {topic || "Study Topic"} · moving answer targets · 3 arrows per question
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

        <div ref={containerRef} className="h-full min-h-0 w-full flex-1 bg-slate-900" />
      </div>
    </div>
  );
}
