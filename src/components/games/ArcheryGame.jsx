import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

/**
 * ArcheryGame Pro Fullscreen
 *
 * File:
 * src/components/games/ArcheryGame.jsx
 *
 * Features:
 * - Fullscreen game room
 * - Professional 2D game layout
 * - Drag, aim, release mechanic
 * - 3 arrows per question
 * - Reload animation
 * - Moving targets
 * - Bow rotation
 * - Arrow physics
 * - Combo scoring
 * - Perfect shot bonus
 * - Particle explosions
 * - Game complete screen
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
    message: "Drag backward, aim, and release.",
  });

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const safeQuestions =
      questions.length > 0
        ? questions
        : [
            { question: "Both inputs 1 gives output 1?", answer: "AND", options: ["AND", "OR", "XOR", "NOT"] },
            { question: "Opposite output gate?", answer: "NOT", options: ["NOT", "AND", "OR", "XOR"] },
            { question: "Universal gate?", answer: "NAND", options: ["NAND", "OR", "XOR", "AND"] },
            { question: "Either input 1 gives output 1?", answer: "OR", options: ["AND", "OR", "NAND", "NOR"] },
            { question: "Exclusive OR short form?", answer: "XOR", options: ["XOR", "AND", "OR", "NOT"] },
          ];

    let score = 0;
    let combo = 0;
    let currentIndex = 0;
    let arrowsLeft = 3;
    let canShoot = true;
    let isDragging = false;
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

    class ProArcheryScene extends Phaser.Scene {
      constructor() {
        super("ProArcheryScene");
        this.targets = [];
        this.labels = [];
        this.aimLine = null;
        this.arrow = null;
        this.bow = null;
        this.bowString = null;
        this.questionText = null;
        this.scoreText = null;
        this.comboText = null;
        this.arrowText = null;
        this.powerBar = null;
        this.powerFill = null;
        this.dragStart = null;
        this.power = 0;
      }

      create() {
        const width = this.scale.width;
        const height = this.scale.height;

        this.createWorld(width, height);
        this.createTopHud(width);
        this.createBow(height);
        this.createPowerBar(height);

        this.aimLine = this.add.graphics();

        this.questionText = this.add
          .text(width / 2, 86, "", {
            fontSize: width < 600 ? "17px" : "23px",
            color: "#ffffff",
            fontFamily: "Arial",
            fontStyle: "bold",
            align: "center",
            wordWrap: { width: width - 100 },
          })
          .setOrigin(0.5, 0);

        this.loadQuestion();

        this.input.on("pointerdown", (pointer) => {
          if (!canShoot || ended) return;
          isDragging = true;
          this.dragStart = { x: pointer.x, y: pointer.y };
          this.rotateBow(pointer.x, pointer.y);
          this.drawAim(pointer.x, pointer.y);
        });

        this.input.on("pointermove", (pointer) => {
          if (!canShoot || ended) return;
          this.rotateBow(pointer.x, pointer.y);
          if (isDragging) this.drawAim(pointer.x, pointer.y);
        });

        this.input.on("pointerup", (pointer) => {
          if (!canShoot || ended || !isDragging) return;
          isDragging = false;
          this.rotateBow(pointer.x, pointer.y);
          this.shoot(pointer.x, pointer.y);
        });
      }

      createWorld(width, height) {
        this.add.rectangle(width / 2, height / 2, width, height, 0x020617);

        const graphics = this.add.graphics();
        graphics.fillGradientStyle(0x0f172a, 0x0f172a, 0x111827, 0x020617, 1);
        graphics.fillRect(0, 0, width, height);

        for (let i = 0; i < 110; i++) {
          const star = this.add.circle(
            Phaser.Math.Between(0, width),
            Phaser.Math.Between(0, height - 80),
            Phaser.Math.Between(1, 2),
            0xffffff,
            Phaser.Math.FloatBetween(0.15, 0.75)
          );

          this.tweens.add({
            targets: star,
            alpha: Phaser.Math.FloatBetween(0.15, 1),
            duration: Phaser.Math.Between(700, 1800),
            yoyo: true,
            repeat: -1,
          });
        }

        this.add.rectangle(width / 2, height - 38, width, 76, 0x064e3b);
        this.add.rectangle(width / 2, height - 74, width, 10, 0x22c55e, 0.55);

        for (let i = 0; i < 16; i++) {
          this.add.text(
            Phaser.Math.Between(0, width),
            height - Phaser.Math.Between(45, 105),
            "🌲",
            { fontSize: Phaser.Math.Between(20, 38) + "px" }
          );
        }

        this.add.text(26, height - 54, "Power: drag backward", {
          fontSize: "16px",
          color: "#bbf7d0",
          fontFamily: "Arial",
          fontStyle: "bold",
        });
      }

      createTopHud(width) {
        this.add.rectangle(width / 2, 28, width, 56, 0x0f172a, 0.94);

        this.add.text(22, 13, "🏹 Archery Pro", {
          fontSize: width < 600 ? "16px" : "20px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
        });

        this.scoreText = this.add.text(width - 310, 14, "Score: 0", {
          fontSize: width < 600 ? "14px" : "18px",
          color: "#facc15",
          fontFamily: "Arial",
          fontStyle: "bold",
        });

        this.comboText = this.add.text(width - 190, 14, "Combo: 0", {
          fontSize: width < 600 ? "14px" : "18px",
          color: "#38bdf8",
          fontFamily: "Arial",
          fontStyle: "bold",
        });

        this.arrowText = this.add.text(width - 88, 14, "🏹🏹🏹", {
          fontSize: width < 600 ? "15px" : "18px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
        });
      }

      createBow(height) {
        this.add.circle(118, height / 2, 72, 0x1e293b, 0.95);
        this.add.circle(118, height / 2, 58, 0x334155, 0.95);

        this.bow = this.add
          .container(118, height / 2)
          .setSize(120, 120);

        const bowArc = this.add.graphics();
        bowArc.lineStyle(10, 0xf59e0b, 1);
        bowArc.beginPath();
        bowArc.arc(0, 0, 52, -1.25, 1.25, false);
        bowArc.strokePath();

        this.bowString = this.add.graphics();
        this.bowString.lineStyle(3, 0xffffff, 1);
        this.bowString.beginPath();
        this.bowString.moveTo(18, -48);
        this.bowString.lineTo(18, 48);
        this.bowString.strokePath();

        const grip = this.add.circle(0, 0, 7, 0x92400e);
        const arrowReady = this.add.rectangle(30, 0, 74, 7, 0xf8fafc);
        const arrowHead = this.add.triangle(70, 0, 0, -9, 0, 9, 18, 0, 0xef4444);

        this.bow.add([bowArc, this.bowString, grip, arrowReady, arrowHead]);

        this.tweens.add({
          targets: this.bow,
          scaleX: 1.04,
          scaleY: 1.04,
          duration: 800,
          yoyo: true,
          repeat: -1,
        });
      }

      createPowerBar(height) {
        this.powerBar = this.add.rectangle(118, height / 2 + 102, 110, 12, 0x1e293b).setOrigin(0.5);
        this.powerFill = this.add.rectangle(64, height / 2 + 102, 0, 8, 0xfacc15).setOrigin(0, 0.5);
      }

      rotateBow(x, y) {
        const angle = Phaser.Math.Angle.Between(118, this.scale.height / 2, x, y);
        this.bow.rotation = angle;
      }

      drawAim(x, y) {
        const bowX = 118;
        const bowY = this.scale.height / 2;
        const distance = Phaser.Math.Distance.Between(bowX, bowY, x, y);
        this.power = Phaser.Math.Clamp(distance / 260, 0.28, 1);

        this.powerFill.width = 105 * this.power;

        this.aimLine.clear();
        this.aimLine.lineStyle(3, 0xfacc15, 0.8);
        this.aimLine.beginPath();
        this.aimLine.moveTo(bowX + 40, bowY);
        this.aimLine.lineTo(x, y);
        this.aimLine.strokePath();

        this.aimLine.fillStyle(0xfacc15, 0.9);
        this.aimLine.fillCircle(x, y, 5);
      }

      clearQuestionObjects() {
        this.targets.forEach((item) => item.destroy());
        this.labels.forEach((item) => item.destroy());
        this.targets = [];
        this.labels = [];

        if (this.arrow) {
          this.arrow.destroy();
          this.arrow = null;
        }

        this.aimLine?.clear();
        if (this.powerFill) this.powerFill.width = 0;
      }

      loadQuestion() {
        this.clearQuestionObjects();

        if (currentIndex >= safeQuestions.length) {
          this.endGame();
          return;
        }

        arrowsLeft = 3;
        canShoot = true;
        this.power = 0;
        syncHud("New question. 3 arrows loaded.");

        const width = this.scale.width;
        const height = this.scale.height;
        const question = safeQuestions[currentIndex];

        this.questionText.setText(`Q${currentIndex + 1}. ${question.question}`);
        this.updateGameHud();

        const options = [...question.options].slice(0, 4);
        const positions =
          width < 700
            ? [
                [width - 125, 170],
                [width - 125, 270],
                [width - 125, 370],
                [width - 125, 470],
              ]
            : [
                [width - 320, 190],
                [width - 150, 270],
                [width - 320, 350],
                [width - 150, 430],
              ];

        options.forEach((answer, index) => {
          const [x, y] = positions[index];
          const radius = width < 700 ? 37 : 46;

          const outer = this.add.circle(x, y, radius, 0x60a5fa);
          const middle = this.add.circle(x, y, radius - 10, 0x111827);
          const ring = this.add.circle(x, y, radius - 19, 0xfacc15);
          const inner = this.add.circle(x, y, radius - 29, 0xef4444);

          const zone = this.add
            .zone(x, y, radius * 2.2, radius * 2.2)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

          zone.answer = answer;
          zone.outer = outer;
          zone.middle = middle;
          zone.ring = ring;
          zone.inner = inner;

          const label = this.add
            .text(x, y, answer, {
              fontSize: width < 700 ? "15px" : "17px",
              color: "#ffffff",
              fontFamily: "Arial",
              fontStyle: "bold",
            })
            .setOrigin(0.5);

          const group = [outer, middle, ring, inner, zone, label];

          const difficulty = Math.min(450, currentIndex * 55);
          this.tweens.add({
            targets: group,
            x: `+=${index % 2 === 0 ? 70 : -70}`,
            y: `+=${index % 2 === 0 ? 18 : -18}`,
            duration: Math.max(620, 1150 - difficulty + index * 120),
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
          });

          this.tweens.add({
            targets: [outer, middle, ring, inner],
            scaleX: 1.08,
            scaleY: 1.08,
            duration: 530 + index * 90,
            yoyo: true,
            repeat: -1,
          });

          this.targets.push(outer, middle, ring, inner, zone);
          this.labels.push(label);
        });
      }

      shoot(pointerX, pointerY) {
        if (arrowsLeft <= 0 || !canShoot) return;

        canShoot = false;
        this.aimLine.clear();

        arrowsLeft -= 1;
        this.updateGameHud();

        const startX = 162;
        const startY = this.scale.height / 2;
        const angle = Phaser.Math.Angle.Between(startX, startY, pointerX, pointerY);
        const speed = 900 + this.power * 650;

        this.arrow = this.add.container(startX, startY);
        const shaft = this.add.rectangle(0, 0, 84, 7, 0xf8fafc);
        const head = this.add.triangle(47, 0, 0, -10, 0, 10, 20, 0, 0xef4444);
        const feather1 = this.add.triangle(-38, -4, 0, 0, 0, 10, 14, 0, 0x38bdf8);
        const feather2 = this.add.triangle(-38, 4, 0, 0, 0, -10, 14, 0, 0x60a5fa);
        this.arrow.add([shaft, head, feather1, feather2]);
        this.arrow.rotation = angle;

        this.physics.add.existing(this.arrow);
        this.arrow.body.setSize(84, 12);
        this.arrow.body.setAllowGravity(false);
        this.arrow.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

        const trailTimer = this.time.addEvent({
          delay: 26,
          loop: true,
          callback: () => {
            if (!this.arrow || !this.arrow.active) return;
            const trail = this.add.circle(this.arrow.x, this.arrow.y, 4, 0xfacc15, 0.65);
            this.tweens.add({
              targets: trail,
              alpha: 0,
              scale: 0,
              duration: 250,
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
              if (distance < 50) hitZone = zone;
            });

            if (hitZone) {
              hitTimer.remove(false);
              trailTimer.remove(false);
              this.arrow.body.setVelocity(0, 0);
              this.checkAnswer(hitZone);
              return;
            }

            if (
              this.arrow.x > this.scale.width + 90 ||
              this.arrow.x < -90 ||
              this.arrow.y > this.scale.height + 90 ||
              this.arrow.y < -90
            ) {
              hitTimer.remove(false);
              trailTimer.remove(false);
              this.handleMiss();
            }
          },
        });
      }

      checkAnswer(zone) {
        const currentQuestion = safeQuestions[currentIndex];
        const correct =
          String(zone.answer).trim().toLowerCase() ===
          String(currentQuestion.answer).trim().toLowerCase();

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

        const comboBonus = combo >= 3 ? 10 : 0;
        const perfectBonus = arrowsLeft === 2 ? 10 : 0;
        const total = base + comboBonus + perfectBonus;

        score += total;

        this.paintTarget(zone, 0x22c55e);
        this.burst(zone.x, zone.y, 0x22c55e, true);
        this.floatText(zone.x, zone.y - 80, `+${total}`, "#22c55e");

        if (perfectBonus) this.centerMessage("PERFECT SHOT!", "#facc15");
        else if (comboBonus) this.centerMessage("COMBO BONUS!", "#38bdf8");
        else this.centerMessage("CORRECT!", "#22c55e");

        this.cameras.main.flash(130, 34, 197, 94);
        this.updateGameHud();
        syncHud(`Correct! +${total} points.`);

        this.time.delayedCall(850, () => {
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
        this.centerMessage("WRONG -5", "#ef4444");
        this.cameras.main.shake(160, 0.008);

        this.updateGameHud();

        if (arrowsLeft <= 0) {
          syncHud("No arrows left. Next question.");
          this.time.delayedCall(850, () => {
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
          syncHud("No arrows left. Next question.");
          this.time.delayedCall(850, () => {
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
        const reloadText = this.add
          .text(118, this.scale.height / 2 - 96, "Reloading...", {
            fontSize: "18px",
            color: "#facc15",
            fontFamily: "Arial",
            fontStyle: "bold",
          })
          .setOrigin(0.5);

        const arrowIcon = this.add.text(118, this.scale.height / 2 + 100, "🏹", {
          fontSize: "42px",
        }).setOrigin(0.5);

        this.tweens.add({
          targets: arrowIcon,
          y: this.scale.height / 2 + 6,
          alpha: 0,
          duration: 540,
          ease: "Back.in",
          onComplete: () => {
            arrowIcon.destroy();
            reloadText.destroy();
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
          scaleX: 1.35,
          scaleY: 1.35,
          yoyo: true,
          duration: 160,
          ease: "Back.out",
        });
      }

      burst(x, y, color, correct) {
        const count = correct ? 46 : 24;

        for (let i = 0; i < count; i++) {
          const particle = this.add.circle(
            x,
            y,
            Phaser.Math.Between(3, 8),
            color,
            Phaser.Math.FloatBetween(0.75, 1)
          );

          this.tweens.add({
            targets: particle,
            x: x + Phaser.Math.Between(-150, 150),
            y: y + Phaser.Math.Between(-130, 130),
            alpha: 0,
            scale: 0,
            duration: correct ? 680 : 470,
            ease: "Cubic.out",
            onComplete: () => particle.destroy(),
          });
        }

        if (correct) {
          for (let i = 0; i < 14; i++) {
            const star = this.add.text(x, y, "⭐", { fontSize: "19px" }).setOrigin(0.5);
            this.tweens.add({
              targets: star,
              x: x + Phaser.Math.Between(-120, 120),
              y: y + Phaser.Math.Between(-110, 110),
              alpha: 0,
              scale: 0.2,
              duration: 760,
              onComplete: () => star.destroy(),
            });
          }
        }
      }

      floatText(x, y, text, color) {
        const item = this.add
          .text(x, y, text, {
            fontSize: "26px",
            color,
            fontFamily: "Arial",
            fontStyle: "bold",
          })
          .setOrigin(0.5);

        this.tweens.add({
          targets: item,
          y: y - 45,
          alpha: 0,
          duration: 800,
          onComplete: () => item.destroy(),
        });
      }

      centerMessage(text, color) {
        const item = this.add
          .text(this.scale.width / 2, this.scale.height / 2 - 125, text, {
            fontSize: "32px",
            color,
            fontFamily: "Arial",
            fontStyle: "bold",
          })
          .setOrigin(0.5);

        this.tweens.add({
          targets: item,
          y: item.y - 45,
          alpha: 0,
          scale: 1.15,
          duration: 850,
          onComplete: () => item.destroy(),
        });
      }

      updateGameHud() {
        this.scoreText?.setText(`Score: ${score}`);
        this.comboText?.setText(`Combo: ${combo}`);
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

        this.add.rectangle(width / 2, height / 2, Math.min(width - 40, 600), 340, 0x111827, 0.96);

        this.add
          .text(width / 2, height / 2 - 122, "🏆 Arena Complete", {
            fontSize: width < 600 ? "27px" : "38px",
            color: "#ffffff",
            fontFamily: "Arial",
            fontStyle: "bold",
          })
          .setOrigin(0.5);

        this.add
          .text(width / 2, height / 2 - 42, `Final Score: ${score}`, {
            fontSize: "29px",
            color: "#facc15",
            fontFamily: "Arial",
            fontStyle: "bold",
          })
          .setOrigin(0.5);

        this.add
          .text(width / 2, height / 2 + 18, `Reward: +${xp} XP · +${coins} Coins`, {
            fontSize: "21px",
            color: "#22c55e",
            fontFamily: "Arial",
          })
          .setOrigin(0.5);

        this.add
          .text(width / 2, height / 2 + 78, "Click Exit to return to Student OS", {
            fontSize: "16px",
            color: "#cbd5e1",
            fontFamily: "Arial",
          })
          .setOrigin(0.5);

        this.burst(width / 2, height / 2 + 125, 0xfacc15, true);

        syncHud("Game complete.");

        if (!rewardSentRef.current && typeof onReward === "function") {
          rewardSentRef.current = true;
          onReward({
            xp,
            coins,
            score,
            total: safeQuestions.length,
            mode: "archery-pro",
          });
        }
      }
    }

    const config = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 1080,
      height: 640,
      backgroundColor: "#020617",
      scene: ProArcheryScene,
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
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950 p-3 text-white sm:p-5">
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col">
        <div className="mb-3 flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900/90 p-4 shadow-2xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-black sm:text-3xl">
              🏹 Archery Pro Arena
            </h2>
            <p className="text-sm text-slate-400">
              {topic || "Study Topic"} · 3 arrows per question · combo points · perfect shot bonus
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl bg-slate-800 px-3 py-2 text-sm font-bold">
              Score: {hud.score}
            </div>
            <div className="rounded-2xl bg-blue-400/10 px-3 py-2 text-sm font-bold text-blue-300">
              Combo: {hud.combo}
            </div>
            <div className="rounded-2xl bg-yellow-400/10 px-3 py-2 text-sm font-bold text-yellow-300">
              Arrows: {hud.arrows}
            </div>
            <div className="rounded-2xl bg-emerald-400/10 px-3 py-2 text-sm font-bold text-emerald-300">
              Q: {hud.current}/{hud.total}
            </div>
            <button
              onClick={onExit}
              className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600"
            >
              Exit
            </button>
          </div>
        </div>

        <div className="mb-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200">
          {hud.message}
        </div>

        <div
          ref={containerRef}
          className="min-h-[70vh] w-full flex-1 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl"
        />
      </div>
    </div>
  );
}
