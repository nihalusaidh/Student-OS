import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

/**
 * Real Archery Arena V2-V5
 * File path: src/components/games/ArcheryGame.jsx
 * Adds:
 * V2 = moving targets
 * V3 = real bow rotation
 * V4 = physics arrow movement
 * V5 = particle / hit animations
 */

export default function ArcheryGame({
  questions = [],
  topic = "Study Topic",
  onExit,
  onReward,
}) {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  const [hud, setHud] = useState({
    score: 0,
    current: 0,
    total: Math.max(questions.length, 1),
    message: "Aim and shoot the correct answer.",
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
          ];

    let score = 0;
    let currentIndex = 0;
    let canShoot = true;

    class ArcheryScene extends Phaser.Scene {
      constructor() {
        super("ArcheryScene");
        this.targets = [];
        this.labels = [];
        this.aimLine = null;
        this.arrow = null;
        this.bow = null;
        this.questionText = null;
      }

      create() {
        const width = this.scale.width;
        const height = this.scale.height;

        this.add.rectangle(width / 2, height / 2, width, height, 0x0f172a);

        for (let i = 0; i < 70; i++) {
          const star = this.add.circle(
            Phaser.Math.Between(0, width),
            Phaser.Math.Between(0, height),
            Phaser.Math.Between(1, 2),
            0xffffff,
            Phaser.Math.FloatBetween(0.18, 0.7)
          );

          this.tweens.add({
            targets: star,
            alpha: Phaser.Math.FloatBetween(0.12, 0.85),
            duration: Phaser.Math.Between(800, 1800),
            yoyo: true,
            repeat: -1,
          });
        }

        this.add.rectangle(width / 2, height - 28, width, 56, 0x064e3b);
        this.add.text(22, height - 50, "Drag / tap a target to shoot", {
          fontSize: "16px",
          color: "#bbf7d0",
          fontFamily: "Arial",
        });

        this.add.circle(95, height / 2, 58, 0x1e293b);
        this.add.circle(95, height / 2, 48, 0x334155);

        this.bow = this.add
          .text(92, height / 2, "🏹", {
            fontSize: "70px",
          })
          .setOrigin(0.5);

        this.aimLine = this.add.graphics();

        this.questionText = this.add
          .text(width / 2, 34, "", {
            fontSize: width < 520 ? "15px" : "20px",
            color: "#ffffff",
            fontFamily: "Arial",
            fontStyle: "bold",
            align: "center",
            wordWrap: { width: width - 60 },
          })
          .setOrigin(0.5, 0);

        this.loadQuestion();

        this.input.on("pointermove", (pointer) => {
          if (!canShoot) return;
          this.rotateBow(pointer.x, pointer.y);
          this.drawAimLine(pointer.x, pointer.y);
        });

        this.input.on("pointerdown", (pointer) => {
          if (!canShoot) return;
          this.rotateBow(pointer.x, pointer.y);
          this.drawAimLine(pointer.x, pointer.y);
        });

        this.input.on("pointerup", (pointer) => {
          if (!canShoot) return;
          this.rotateBow(pointer.x, pointer.y);
          this.shoot(pointer.x, pointer.y);
        });
      }

      rotateBow(x, y) {
        const angle = Phaser.Math.Angle.Between(145, this.scale.height / 2, x, y);
        if (this.bow) this.bow.rotation = angle;
      }

      drawAimLine(x, y) {
        this.aimLine.clear();
        this.aimLine.lineStyle(3, 0xfacc15, 0.75);
        this.aimLine.beginPath();
        this.aimLine.moveTo(145, this.scale.height / 2);
        this.aimLine.lineTo(x, y);
        this.aimLine.strokePath();
        this.aimLine.fillStyle(0xfacc15, 0.8);
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

        canShoot = true;

        const width = this.scale.width;
        const height = this.scale.height;
        const q = safeQuestions[currentIndex];

        this.questionText.setText(`Q${currentIndex + 1}. ${q.question}`);

        const options = [...q.options].slice(0, 4);
        const startY = height < 560 ? 145 : 165;
        const gap = height < 560 ? 78 : 95;
        const targetX = width - (width < 520 ? 105 : 150);

        options.forEach((answer, index) => {
          const y = startY + index * gap;

          const outer = this.add.circle(targetX, y, width < 520 ? 34 : 42, 0xef4444);
          const middle = this.add.circle(targetX, y, width < 520 ? 25 : 31, 0xffffff);
          const inner = this.add.circle(targetX, y, width < 520 ? 15 : 19, 0x2563eb);

          const zone = this.add
            .zone(targetX, y, width < 520 ? 76 : 92, width < 520 ? 76 : 92)
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
            x: `+=${index % 2 === 0 ? (width < 520 ? 30 : 55) : -(width < 520 ? 30 : 55)}`,
            y: `+=${index % 2 === 0 ? (width < 520 ? 9 : 16) : -(width < 520 ? 9 : 16)}`,
            duration: 900 + index * 150,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
          });

          this.tweens.add({
            targets: [outer, middle, inner],
            scaleX: 1.06,
            scaleY: 1.06,
            duration: 550 + index * 80,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
          });

          this.targets.push(outer, middle, inner, zone);
          this.labels.push(label);
        });
      }

      shoot(targetX, targetY) {
        canShoot = false;
        this.aimLine.clear();

        const startX = 145;
        const startY = this.scale.height / 2;
        const q = safeQuestions[currentIndex];

        const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);
        const speed = 950;

        this.arrow = this.add.rectangle(startX, startY, 74, 7, 0xf8fafc).setOrigin(0.5);
        this.physics.add.existing(this.arrow);

        this.arrow.rotation = angle;
        this.arrow.body.setAllowGravity(false);
        this.arrow.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

        const trailTimer = this.time.addEvent({
          delay: 35,
          loop: true,
          callback: () => {
            if (!this.arrow || !this.arrow.active) return;
            const trail = this.add.circle(this.arrow.x, this.arrow.y, 3, 0xfacc15, 0.6);
            this.tweens.add({
              targets: trail,
              alpha: 0,
              scale: 0,
              duration: 260,
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
              if (distance < 47) hitZone = zone;
            });

            if (hitZone) {
              checkHit.remove(false);
              trailTimer.remove(false);
              this.arrow.body.setVelocity(0, 0);

              const isCorrect =
                String(hitZone.answer).trim().toLowerCase() ===
                String(q.answer).trim().toLowerCase();

              if (isCorrect) {
                score += 1;
                this.correctHit(hitZone);
              } else {
                this.wrongHit(hitZone);
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
              this.missShot("Missed target!");
            }
          },
        });
      }

      correctHit(zone) {
        if (this.arrow) {
          this.arrow.destroy();
          this.arrow = null;
        }

        this.flashTarget(zone, 0x22c55e);
        this.createBurst(zone.x, zone.y, 0x22c55e, true);

        this.add
          .text(zone.x, zone.y - 72, "Correct! +10 XP", {
            fontSize: "20px",
            color: "#22c55e",
            fontFamily: "Arial",
            fontStyle: "bold",
          })
          .setOrigin(0.5);

        this.cameras.main.flash(140, 34, 197, 94);

        setHud({
          score,
          current: currentIndex + 1,
          total: safeQuestions.length,
          message: "Perfect shot! Correct answer.",
        });

        this.nextQuestion();
      }

      wrongHit(zone) {
        if (this.arrow) {
          this.arrow.destroy();
          this.arrow = null;
        }

        this.flashTarget(zone, 0xef4444);
        this.createBurst(zone.x, zone.y, 0xef4444, false);
        this.cameras.main.shake(170, 0.008);

        this.add
          .text(zone.x, zone.y - 72, "Wrong target!", {
            fontSize: "20px",
            color: "#ef4444",
            fontFamily: "Arial",
            fontStyle: "bold",
          })
          .setOrigin(0.5);

        setHud({
          score,
          current: currentIndex + 1,
          total: safeQuestions.length,
          message: "Wrong target. Think and aim carefully.",
        });

        this.nextQuestion();
      }

      missShot(message) {
        if (this.arrow) {
          this.arrow.destroy();
          this.arrow = null;
        }

        this.cameras.main.shake(150, 0.006);

        this.add
          .text(this.scale.width / 2, this.scale.height / 2 - 100, message, {
            fontSize: "22px",
            color: "#f97316",
            fontFamily: "Arial",
            fontStyle: "bold",
          })
          .setOrigin(0.5);

        setHud({
          score,
          current: currentIndex + 1,
          total: safeQuestions.length,
          message: "Missed. Try the next one.",
        });

        this.nextQuestion();
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
        const particleCount = correct ? 34 : 22;

        for (let i = 0; i < particleCount; i++) {
          const particle = this.add.circle(
            x,
            y,
            Phaser.Math.Between(3, 7),
            color,
            Phaser.Math.FloatBetween(0.7, 1)
          );

          this.tweens.add({
            targets: particle,
            x: x + Phaser.Math.Between(-130, 130),
            y: y + Phaser.Math.Between(-110, 110),
            alpha: 0,
            scale: 0,
            duration: correct ? 620 : 460,
            ease: "Cubic.out",
            onComplete: () => particle.destroy(),
          });
        }

        if (correct) {
          for (let i = 0; i < 10; i++) {
            const star = this.add.text(x, y, "⭐", { fontSize: "18px" }).setOrigin(0.5);
            this.tweens.add({
              targets: star,
              x: x + Phaser.Math.Between(-100, 100),
              y: y + Phaser.Math.Between(-95, 95),
              alpha: 0,
              scale: 0.2,
              duration: 700,
              onComplete: () => star.destroy(),
            });
          }
        }
      }

      nextQuestion() {
        this.time.delayedCall(950, () => {
          currentIndex += 1;
          if (currentIndex >= safeQuestions.length) {
            this.endGame();
          } else {
            this.loadQuestion();
          }
        });
      }

      endGame() {
        canShoot = false;
        this.clearQuestionObjects();

        const width = this.scale.width;
        const height = this.scale.height;
        const xp = Math.max(10, score * 10);
        const coins = Math.max(5, score * 3);

        this.add.rectangle(width / 2, height / 2, Math.min(width - 40, 520), 270, 0x111827, 0.95);
        this.add
          .text(width / 2, height / 2 - 92, "🏆 Archery Complete", {
            fontSize: width < 520 ? "24px" : "30px",
            color: "#ffffff",
            fontFamily: "Arial",
            fontStyle: "bold",
          })
          .setOrigin(0.5);

        this.add
          .text(width / 2, height / 2 - 28, `Score: ${score}/${safeQuestions.length}`, {
            fontSize: "24px",
            color: "#facc15",
            fontFamily: "Arial",
          })
          .setOrigin(0.5);

        this.add
          .text(width / 2, height / 2 + 25, `Reward: +${xp} XP · +${coins} Coins`, {
            fontSize: "20px",
            color: "#22c55e",
            fontFamily: "Arial",
          })
          .setOrigin(0.5);

        this.createBurst(width / 2, height / 2 + 85, 0xfacc15, true);

        setHud({
          score,
          current: safeQuestions.length,
          total: safeQuestions.length,
          message: "Game complete.",
        });

        if (typeof onReward === "function") {
          onReward({
            xp,
            coins,
            score,
            total: safeQuestions.length,
            mode: "archery",
          });
        }
      }
    }

    const config = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 900,
      height: 560,
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
    <div className="w-full rounded-3xl border border-slate-700 bg-slate-950 p-3 shadow-2xl sm:p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-white sm:text-2xl">
            🏹 Real Archery Arena
          </h2>
          <p className="text-sm text-slate-400">
            {topic || "Study Topic"} · aim at the moving correct answer target
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-2xl bg-slate-800 px-3 py-2 text-sm font-bold text-white">
            Score: {hud.score}/{hud.total}
          </div>
          <div className="rounded-2xl bg-yellow-400/10 px-3 py-2 text-sm font-bold text-yellow-300">
            Q: {Math.min(hud.current + 1, hud.total)}/{hud.total}
          </div>
          <button
            onClick={onExit}
            className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600"
          >
            Exit
          </button>
        </div>
      </div>

      <div className="mb-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200">
        {hud.message}
      </div>

      <div
        ref={containerRef}
        className="min-h-[340px] w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
      />
    </div>
  );
}
