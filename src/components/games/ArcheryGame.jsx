import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

/**
 * ArcheryGame Pro V1
 *
 * Replace:
 *   src/components/games/ArcheryGame.jsx
 *
 * Requires:
 *   npm install phaser
 *
 * Features:
 * - Full-screen style Game Room
 * - 3 arrows per question
 * - Arrow reload animation
 * - Moving targets
 * - Bow rotation
 * - Physics arrow
 * - Combo scoring
 * - Perfect shot bonus
 * - Particle effects
 * - XP + coins reward callback
 */

export default function ArcheryGame({
  questions = [],
  topic = "Study Topic",
  onExit,
  onReward,
}) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const rewardedRef = useRef(false);

  const [hud, setHud] = useState({
    score: 0,
    combo: 0,
    arrows: 3,
    current: 1,
    total: Math.max(questions.length, 1),
    message: "Enter the arena. You have 3 arrows for each question.",
  });

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const safeQuestions =
      questions.length > 0
        ? questions
        : [
            {
              question: "Both inputs 1 gives output 1?",
              answer: "AND",
              options: ["AND", "OR", "XOR", "NOT"],
            },
            {
              question: "Opposite output gate?",
              answer: "NOT",
              options: ["NOT", "AND", "OR", "XOR"],
            },
            {
              question: "Universal gate?",
              answer: "NAND",
              options: ["NAND", "OR", "XOR", "AND"],
            },
            {
              question: "Either input 1 gives output 1?",
              answer: "OR",
              options: ["AND", "OR", "NAND", "NOR"],
            },
            {
              question: "Exclusive OR short form?",
              answer: "XOR",
              options: ["XOR", "AND", "OR", "NOT"],
            },
          ];

    let score = 0;
    let combo = 0;
    let currentIndex = 0;
    let arrowsLeft = 3;
    let canShoot = true;
    let ended = false;

    const updateHud = (message = "") => {
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
        super("ArcheryProScene");
        this.targets = [];
        this.labels = [];
        this.aimLine = null;
        this.arrow = null;
        this.bow = null;
        this.questionText = null;
        this.scoreText = null;
        this.arrowText = null;
        this.comboText = null;
        this.levelText = null;
        this.reloadText = null;
      }

      create() {
        const width = this.scale.width;
        const height = this.scale.height;

        this.add.rectangle(width / 2, height / 2, width, height, 0x020617);

        this.createBackground(width, height);
        this.createHud(width, height);
        this.createBow(width, height);

        this.aimLine = this.add.graphics();

        this.questionText = this.add
          .text(width / 2, 74, "", {
            fontSize: width < 520 ? "15px" : "21px",
            color: "#ffffff",
            fontFamily: "Arial",
            fontStyle: "bold",
            align: "center",
            wordWrap: { width: width - 90 },
          })
          .setOrigin(0.5, 0);

        this.loadQuestion();

        this.input.on("pointermove", (pointer) => {
          if (!canShoot || ended) return;
          this.rotateBow(pointer.x, pointer.y);
          this.drawAimLine(pointer.x, pointer.y);
        });

        this.input.on("pointerdown", (pointer) => {
          if (!canShoot || ended) return;
          this.rotateBow(pointer.x, pointer.y);
          this.drawAimLine(pointer.x, pointer.y);
        });

        this.input.on("pointerup", (pointer) => {
          if (!canShoot || ended) return;
          this.rotateBow(pointer.x, pointer.y);
          this.shoot(pointer.x, pointer.y);
        });
      }

      createBackground(width, height) {
        for (let i = 0; i < 90; i++) {
          const star = this.add.circle(
            Phaser.Math.Between(0, width),
            Phaser.Math.Between(0, height),
            Phaser.Math.Between(1, 2),
            0xffffff,
            Phaser.Math.FloatBetween(0.15, 0.75)
          );

          this.tweens.add({
            targets: star,
            alpha: Phaser.Math.FloatBetween(0.15, 0.9),
            duration: Phaser.Math.Between(700, 1900),
            yoyo: true,
            repeat: -1,
          });
        }

        this.add.rectangle(width / 2, height - 30, width, 60, 0x064e3b);

        for (let i = 0; i < 12; i++) {
          this.add.text(Phaser.Math.Between(0, width), height - Phaser.Math.Between(34, 80), "🌲", {
            fontSize: Phaser.Math.Between(20, 34) + "px",
          });
        }
      }

      createHud(width, height) {
        this.add.rectangle(width / 2, 26, width, 52, 0x0f172a, 0.92);

        this.levelText = this.add.text(20, 14, "🏹 Archery Pro", {
          fontSize: width < 520 ? "15px" : "18px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
        });

        this.scoreText = this.add.text(width - 220, 14, "Score: 0", {
          fontSize: width < 520 ? "14px" : "17px",
          color: "#facc15",
          fontFamily: "Arial",
          fontStyle: "bold",
        });

        this.comboText = this.add.text(width - 118, 14, "Combo: 0", {
          fontSize: width < 520 ? "14px" : "17px",
          color: "#38bdf8",
          fontFamily: "Arial",
          fontStyle: "bold",
        });

        this.arrowText = this.add.text(20, height - 44, "Arrows: 🏹🏹🏹", {
          fontSize: "18px",
          color: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
        });

        this.add.text(width / 2, height - 45, "Aim carefully. First arrow gives maximum points.", {
          fontSize: width < 520 ? "13px" : "16px",
          color: "#bbf7d0",
          fontFamily: "Arial",
        }).setOrigin(0.5);
      }

      createBow(width, height) {
        this.add.circle(96, height / 2, 64, 0x1e293b);
        this.add.circle(96, height / 2, 52, 0x334155);

        this.bow = this.add
          .text(96, height / 2, "🏹", { fontSize: "76px" })
          .setOrigin(0.5);

        this.tweens.add({
          targets: this.bow,
          scaleX: 1.05,
          scaleY: 1.05,
          duration: 750,
          yoyo: true,
          repeat: -1,
          ease: "Sine.inOut",
        });
      }

      rotateBow(x, y) {
        const angle = Phaser.Math.Angle.Between(145, this.scale.height / 2, x, y);
        if (this.bow) this.bow.rotation = angle;
      }

      drawAimLine(x, y) {
        this.aimLine.clear();
        this.aimLine.lineStyle(3, 0xfacc15, 0.8);
        this.aimLine.beginPath();
        this.aimLine.moveTo(145, this.scale.height / 2);
        this.aimLine.lineTo(x, y);
        this.aimLine.strokePath();

        this.aimLine.fillStyle(0xfacc15, 0.9);
        this.aimLine.fillCircle(x, y, 5);
      }

      clearQuestionObjects() {
        this.targets.forEach((target) => target.destroy());
        this.labels.forEach((label) => label.destroy());
        this.targets = [];
        this.labels = [];

        if (this.arrow) {
          this.arrow.destroy();
          this.arrow = null;
        }

        if (this.aimLine) this.aimLine.clear();
      }

      loadQuestion() {
        this.clearQuestionObjects();

        if (currentIndex >= safeQuestions.length) {
          this.endGame();
          return;
        }

        arrowsLeft = 3;
        canShoot = true;

        const width = this.scale.width;
        const height = this.scale.height;
        const q = safeQuestions[currentIndex];

        this.questionText.setText(`Q${currentIndex + 1}. ${q.question}`);

        this.updateGameHud();
        updateHud("New question. You have 3 arrows.");

        const options = [...q.options].slice(0, 4);
        const startY = height < 560 ? 150 : 170;
        const gap = height < 560 ? 78 : 92;
        const targetX = width - (width < 520 ? 105 : 155);
        const difficultyBoost = currentIndex * 60;

        options.forEach((answer, index) => {
          const y = startY + index * gap;
          const radius = width < 520 ? 34 : 42;

          const outer = this.add.circle(targetX, y, radius, 0xef4444);
          const middle = this.add.circle(targetX, y, width < 520 ? 25 : 31, 0xffffff);
          const inner = this.add.circle(targetX, y, width < 520 ? 15 : 19, 0x2563eb);

          const zone = this.add
            .zone(targetX, y, width < 520 ? 82 : 96, width < 520 ? 82 : 96)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

          zone.answer = answer;
          zone.outer = outer;
          zone.middle = middle;
          zone.inner = inner;

          const label = this.add
            .text(targetX, y + (width < 520 ? 43 : 53), answer, {
              fontSize: width < 520 ? "15px" : "17px",
              color: "#ffffff",
              fontFamily: "Arial",
              fontStyle: "bold",
              backgroundColor: "#111827",
              padding: { x: 8, y: 4 },
            })
            .setOrigin(0.5);

          const group = [outer, middle, inner, zone, label];

          this.tweens.add({
            targets: group,
            x: `+=${index % 2 === 0 ? 55 : -55}`,
            y: `+=${index % 2 === 0 ? 18 : -18}`,
            duration: Math.max(620, 1050 - difficultyBoost + index * 110),
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
          });

          this.tweens.add({
            targets: [outer, middle, inner],
            scaleX: 1.08,
            scaleY: 1.08,
            duration: 560 + index * 80,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
          });

          this.targets.push(outer, middle, inner, zone);
          this.labels.push(label);
        });
      }

      shoot(targetX, targetY) {
        if (arrowsLeft <= 0) return;

        canShoot = false;
        this.aimLine.clear();

        arrowsLeft -= 1;
        this.updateGameHud();

        const startX = 145;
        const startY = this.scale.height / 2;
        const q = safeQuestions[currentIndex];

        const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
        const speed = 1040;

        this.arrow = this.add.rectangle(startX, startY, 78, 7, 0xf8fafc).setOrigin(0.5);
        this.physics.add.existing(this.arrow);

        this.arrow.rotation = angle;
        this.arrow.body.setAllowGravity(false);
        this.arrow.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

        const trailTimer = this.time.addEvent({
          delay: 28,
          loop: true,
          callback: () => {
            if (!this.arrow || !this.arrow.active) return;
            const trail = this.add.circle(this.arrow.x, this.arrow.y, 3, 0xfacc15, 0.65);
            this.tweens.add({
              targets: trail,
              alpha: 0,
              scale: 0,
              duration: 250,
              onComplete: () => trail.destroy(),
            });
          },
        });

        const checkHit = this.time.addEvent({
          delay: 16,
          loop: true,
          callback: () => {
            if (!this.arrow || !this.arrow.active) {
              checkHit.remove(false);
              trailTimer.remove(false);
              return;
            }

            let hitZone = null;
            const zones = this.targets.filter((target) => target.type === "Zone");

            zones.forEach((zone) => {
              const distance = Phaser.Math.Distance.Between(this.arrow.x, this.arrow.y, zone.x, zone.y);
              if (distance < 48) hitZone = zone;
            });

            if (hitZone) {
              checkHit.remove(false);
              trailTimer.remove(false);
              this.arrow.body.setVelocity(0, 0);

              const isCorrect =
                String(hitZone.answer).trim().toLowerCase() ===
                String(q.answer).trim().toLowerCase();

              if (isCorrect) {
                this.handleCorrect(hitZone);
              } else {
                this.handleWrong(hitZone);
              }
              return;
            }

            if (
              this.arrow.x > this.scale.width + 80 ||
              this.arrow.x < -80 ||
              this.arrow.y > this.scale.height + 80 ||
              this.arrow.y < -80
            ) {
              checkHit.remove(false);
              trailTimer.remove(false);
              this.handleMiss();
            }
          },
        });
      }

      getArrowScore() {
        if (arrowsLeft === 2) return 30;
        if (arrowsLeft === 1) return 20;
        return 10;
      }

      handleCorrect(zone) {
        if (this.arrow) {
          this.arrow.destroy();
          this.arrow = null;
        }

        const basePoints = this.getArrowScore();
        combo += 1;
        const comboBonus = combo >= 3 ? 10 : 0;
        const perfectBonus = arrowsLeft === 2 ? 10 : 0;
        const gained = basePoints + comboBonus + perfectBonus;
        score += gained;

        this.flashTarget(zone, 0x22c55e);
        this.createBurst(zone.x, zone.y, 0x22c55e, true);

        this.add
          .text(zone.x, zone.y - 78, `+${gained} pts`, {
            fontSize: "23px",
            color: "#22c55e",
            fontFamily: "Arial",
            fontStyle: "bold",
          })
          .setOrigin(0.5);

        this.cameras.main.flash(140, 34, 197, 94);

        this.showFloatingMessage(
          perfectBonus ? "PERFECT SHOT!" : comboBonus ? "COMBO BONUS!" : "CORRECT!",
          perfectBonus ? "#facc15" : "#22c55e"
        );

        this.updateGameHud();
        updateHud(`Correct! +${gained} points.`);

        this.time.delayedCall(900, () => {
          currentIndex += 1;
          if (currentIndex >= safeQuestions.length) this.endGame();
          else this.loadQuestion();
        });
      }

      handleWrong(zone) {
        if (this.arrow) {
          this.arrow.destroy();
          this.arrow = null;
        }

        combo = 0;
        score = Math.max(0, score - 5);

        this.flashTarget(zone, 0xef4444);
        this.createBurst(zone.x, zone.y, 0xef4444, false);
        this.cameras.main.shake(170, 0.008);

        this.showFloatingMessage("WRONG TARGET -5", "#ef4444");

        this.updateGameHud();

        if (arrowsLeft <= 0) {
          updateHud("No arrows left. Moving to next question.");
          this.time.delayedCall(900, () => {
            currentIndex += 1;
            if (currentIndex >= safeQuestions.length) this.endGame();
            else this.loadQuestion();
          });
        } else {
          updateHud(`Wrong target. ${arrowsLeft} arrow${arrowsLeft === 1 ? "" : "s"} left.`);
          this.reloadArrow();
        }
      }

      handleMiss() {
        if (this.arrow) {
          this.arrow.destroy();
          this.arrow = null;
        }

        combo = 0;
        this.cameras.main.shake(130, 0.005);
        this.showFloatingMessage("MISS!", "#f97316");
        this.updateGameHud();

        if (arrowsLeft <= 0) {
          updateHud("No arrows left. Moving to next question.");
          this.time.delayedCall(900, () => {
            currentIndex += 1;
            if (currentIndex >= safeQuestions.length) this.endGame();
            else this.loadQuestion();
          });
        } else {
          updateHud(`Missed. Reloading... ${arrowsLeft} arrow${arrowsLeft === 1 ? "" : "s"} left.`);
          this.reloadArrow();
        }
      }

      reloadArrow() {
        this.reloadText = this.add
          .text(145, this.scale.height / 2 - 90, "Reloading arrow...", {
            fontSize: "19px",
            color: "#facc15",
            fontFamily: "Arial",
            fontStyle: "bold",
          })
          .setOrigin(0.5);

        const reloadArrow = this.add.text(145, this.scale.height / 2 + 80, "🏹", {
          fontSize: "38px",
        }).setOrigin(0.5);

        this.tweens.add({
          targets: reloadArrow,
          y: this.scale.height / 2 + 8,
          alpha: 0,
          duration: 520,
          ease: "Back.in",
          onComplete: () => {
            reloadArrow.destroy();
            if (this.reloadText) {
              this.reloadText.destroy();
              this.reloadText = null;
            }
            canShoot = true;
          },
        });
      }

      showFloatingMessage(text, color) {
        const msg = this.add
          .text(this.scale.width / 2, this.scale.height / 2 - 125, text, {
            fontSize: "28px",
            color,
            fontFamily: "Arial",
            fontStyle: "bold",
          })
          .setOrigin(0.5);

        this.tweens.add({
          targets: msg,
          y: msg.y - 35,
          alpha: 0,
          duration: 800,
          onComplete: () => msg.destroy(),
        });
      }

      updateGameHud() {
        if (this.scoreText) this.scoreText.setText(`Score: ${score}`);
        if (this.comboText) this.comboText.setText(`Combo: ${combo}`);
        if (this.arrowText) {
          const arrows = "🏹".repeat(Math.max(0, arrowsLeft)) || "❌";
          this.arrowText.setText(`Arrows: ${arrows}`);
        }
      }

      flashTarget(zone, color) {
        if (!zone?.outer || !zone?.middle || !zone?.inner) return;

        zone.outer.setFillStyle(color);
        zone.middle.setFillStyle(0xffffff);
        zone.inner.setFillStyle(color);

        this.tweens.add({
          targets: [zone.outer, zone.middle, zone.inner],
          scaleX: 1.35,
          scaleY: 1.35,
          duration: 160,
          yoyo: true,
          ease: "Back.out",
        });
      }

      createBurst(x, y, color, correct) {
        const count = correct ? 40 : 22;

        for (let i = 0; i < count; i++) {
          const particle = this.add.circle(
            x,
            y,
            Phaser.Math.Between(3, 7),
            color,
            Phaser.Math.FloatBetween(0.75, 1)
          );

          this.tweens.add({
            targets: particle,
            x: x + Phaser.Math.Between(-140, 140),
            y: y + Phaser.Math.Between(-120, 120),
            alpha: 0,
            scale: 0,
            duration: correct ? 650 : 470,
            ease: "Cubic.out",
            onComplete: () => particle.destroy(),
          });
        }

        if (correct) {
          for (let i = 0; i < 12; i++) {
            const star = this.add.text(x, y, "⭐", { fontSize: "18px" }).setOrigin(0.5);
            this.tweens.add({
              targets: star,
              x: x + Phaser.Math.Between(-110, 110),
              y: y + Phaser.Math.Between(-100, 100),
              alpha: 0,
              scale: 0.2,
              duration: 720,
              onComplete: () => star.destroy(),
            });
          }
        }
      }

      endGame() {
        if (ended) return;
        ended = true;
        canShoot = false;
        this.clearQuestionObjects();

        const width = this.scale.width;
        const height = this.scale.height;
        const correctCount = Math.round(score / 30);
        const xp = Math.max(20, Math.round(score / 2));
        const coins = Math.max(10, Math.round(score / 8));

        this.add.rectangle(width / 2, height / 2, Math.min(width - 40, 560), 320, 0x111827, 0.96);

        this.add
          .text(width / 2, height / 2 - 112, "🏆 Arena Complete", {
            fontSize: width < 520 ? "25px" : "34px",
            color: "#ffffff",
            fontFamily: "Arial",
            fontStyle: "bold",
          })
          .setOrigin(0.5);

        this.add
          .text(width / 2, height / 2 - 42, `Final Score: ${score}`, {
            fontSize: "26px",
            color: "#facc15",
            fontFamily: "Arial",
            fontStyle: "bold",
          })
          .setOrigin(0.5);

        this.add
          .text(width / 2, height / 2 + 12, `Reward: +${xp} XP · +${coins} Coins`, {
            fontSize: "21px",
            color: "#22c55e",
            fontFamily: "Arial",
          })
          .setOrigin(0.5);

        this.add
          .text(width / 2, height / 2 + 64, "Exit to return to Student OS", {
            fontSize: "16px",
            color: "#cbd5e1",
            fontFamily: "Arial",
          })
          .setOrigin(0.5);

        this.createBurst(width / 2, height / 2 + 110, 0xfacc15, true);

        updateHud("Game complete.");

        if (!rewardedRef.current && typeof onReward === "function") {
          rewardedRef.current = true;
          onReward({
            xp,
            coins,
            score,
            total: safeQuestions.length,
            correct: correctCount,
            mode: "archery-pro",
          });
        }
      }
    }

    const config = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 960,
      height: 600,
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
  }, [questions, topic, onReward]);

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950 p-3 text-white sm:p-5">
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col">
        <div className="mb-3 flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl sm:flex-row sm:items-center sm:justify-between">
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
