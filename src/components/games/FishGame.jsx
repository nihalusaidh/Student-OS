import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

/**
 * FishGame V1
 * Path: src/components/games/FishGame.jsx
 *
 * Fish Survival learning game:
 * - Fish health decreases over time
 * - Correct pellet increases health and score
 * - Wrong pellet damages fish
 * - Moving pellets
 * - Timer survival mode
 * - XP + coins reward callback
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
  const onRewardRef = useRef(onReward);

  const [hud, setHud] = useState({
    health: 100,
    score: 0,
    time: 60,
    current: 1,
    total: Math.max(questions.length, 1),
    message: "Eat the correct answer pellet. Avoid wrong food.",
  });

  useEffect(() => {
    questionsRef.current = questions;
    onRewardRef.current = onReward;
  }, [questions, onReward]);

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

    let health = 100;
    let score = 0;
    let timeLeft = 60;
    let currentIndex = 0;
    let ended = false;
    let canEat = true;

    const syncHud = (message = "") => {
      setHud({
        health,
        score,
        time: timeLeft,
        current: Math.min(currentIndex + 1, safeQuestions.length),
        total: safeQuestions.length,
        message,
      });
    };

    class FishScene extends Phaser.Scene {
      constructor() {
        super("FishSurvivalScene");
        this.fish = null;
        this.pellets = [];
        this.labels = [];
        this.questionText = null;
        this.healthBar = null;
        this.timerEvent = null;
        this.bubbles = [];
      }

      create() {
        const width = this.scale.width;
        const height = this.scale.height;

        this.createOcean(width, height);
        this.createFish(width, height);
        this.createHud(width, height);
        this.loadQuestion();

        this.input.on("pointermove", (pointer) => {
          if (ended || !this.fish) return;
          this.moveFish(pointer.x, pointer.y);
        });

        this.input.on("pointerdown", (pointer) => {
          if (ended || !this.fish) return;
          this.moveFish(pointer.x, pointer.y);
        });

        this.timerEvent = this.time.addEvent({
          delay: 1000,
          loop: true,
          callback: () => {
            if (ended) return;
            timeLeft -= 1;
            health = Math.max(0, health - 1);
            this.updateHealthBar();

            if (health <= 0 || timeLeft <= 0) {
              this.endGame(health <= 0 ? "Fish needs rest!" : "Time complete!");
              return;
            }

            syncHud("Survive by eating correct pellets.");
          },
        });

        this.time.addEvent({
          delay: 16,
          loop: true,
          callback: () => {
            if (ended || !canEat) return;
            this.checkPelletCollision();
          },
        });
      }

      createOcean(width, height) {
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0f766e, 0x0284c7, 0x0f172a, 0x020617, 1);
        bg.fillRect(0, 0, width, height);

        for (let i = 0; i < 9; i++) {
          const wave = this.add.ellipse(
            Phaser.Math.Between(0, width),
            Phaser.Math.Between(80, height - 80),
            Phaser.Math.Between(120, 230),
            Phaser.Math.Between(22, 45),
            0xffffff,
            0.06
          );

          this.tweens.add({
            targets: wave,
            x: wave.x + Phaser.Math.Between(-80, 110),
            alpha: 0.12,
            duration: Phaser.Math.Between(2600, 5200),
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
          });
        }

        for (let i = 0; i < 60; i++) {
          const bubble = this.add.circle(
            Phaser.Math.Between(0, width),
            Phaser.Math.Between(0, height),
            Phaser.Math.Between(2, 6),
            0xffffff,
            Phaser.Math.FloatBetween(0.12, 0.35)
          );

          this.bubbles.push(bubble);

          this.tweens.add({
            targets: bubble,
            y: bubble.y - Phaser.Math.Between(160, 340),
            x: bubble.x + Phaser.Math.Between(-30, 30),
            alpha: 0,
            duration: Phaser.Math.Between(2200, 5200),
            repeat: -1,
            onRepeat: () => {
              bubble.y = height + Phaser.Math.Between(20, 120);
              bubble.x = Phaser.Math.Between(0, width);
              bubble.alpha = Phaser.Math.FloatBetween(0.12, 0.35);
            },
          });
        }

        this.add.rectangle(width / 2, height - 38, width, 76, 0x78350f, 0.9);

        for (let i = 0; i < 14; i++) {
          const seaweed = this.add.text(
            Phaser.Math.Between(20, width - 20),
            height - Phaser.Math.Between(72, 95),
            "🌿",
            { fontSize: Phaser.Math.Between(24, 42) + "px" }
          );

          this.tweens.add({
            targets: seaweed,
            angle: Phaser.Math.Between(-8, 8),
            duration: Phaser.Math.Between(800, 1500),
            yoyo: true,
            repeat: -1,
          });
        }
      }

      createFish(width, height) {
        this.fish = this.add.container(width * 0.18, height * 0.55).setDepth(40);

        const body = this.add.ellipse(0, 0, 90, 50, 0xf97316);
        const belly = this.add.ellipse(8, 8, 48, 24, 0xfacc15, 0.9);
        const tail = this.add.triangle(-54, 0, 0, -26, 0, 26, -36, 0, 0xfb923c);
        const fin = this.add.triangle(8, -22, -12, 0, 22, 0, 4, -24, 0xfdba74);
        const eye = this.add.circle(28, -10, 6, 0xffffff);
        const pupil = this.add.circle(30, -10, 3, 0x020617);
        const smile = this.add.arc(30, 8, 10, 0, 180, false, 0x000000, 0);

        this.fish.add([tail, body, belly, fin, eye, pupil, smile]);

        this.tweens.add({
          targets: tail,
          scaleX: 1.25,
          duration: 180,
          yoyo: true,
          repeat: -1,
        });

        this.tweens.add({
          targets: this.fish,
          y: this.fish.y + 8,
          duration: 850,
          yoyo: true,
          repeat: -1,
          ease: "Sine.inOut",
        });
      }

      createHud(width, height) {
        this.add.rectangle(width / 2, 34, width, 68, 0x020617, 0.55).setDepth(50);

        this.questionText = this.add
          .text(32, 22, "", {
            fontSize: width < 700 ? "16px" : "24px",
            color: "#ffffff",
            fontFamily: "Arial",
            fontStyle: "bold",
            wordWrap: { width: width < 700 ? width - 64 : 760 },
            stroke: "#000000",
            strokeThickness: 5,
          })
          .setDepth(60);

        this.add.rectangle(width - 160, 34, 230, 22, 0x0f172a, 0.9).setDepth(60);
        this.healthBar = this.add.rectangle(width - 160 - 110, 34, 220, 14, 0x22c55e, 1).setOrigin(0, 0.5).setDepth(61);
      }

      moveFish(x, y) {
        const minX = 65;
        const maxX = this.scale.width - 65;
        const minY = 105;
        const maxY = this.scale.height - 90;

        const targetX = Phaser.Math.Clamp(x, minX, maxX);
        const targetY = Phaser.Math.Clamp(y, minY, maxY);

        this.tweens.add({
          targets: this.fish,
          x: targetX,
          y: targetY,
          duration: 170,
          ease: "Sine.out",
        });
      }

      shuffleOptions(options) {
        const shuffled = [...options];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Phaser.Math.Between(0, i);
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      }

      clearPellets() {
        this.pellets.forEach((item) => item.destroy());
        this.labels.forEach((item) => item.destroy());
        this.pellets = [];
        this.labels = [];
      }

      loadQuestion() {
        this.clearPellets();

        if (currentIndex >= safeQuestions.length) {
          this.endGame("Level complete!");
          return;
        }

        canEat = true;

        const width = this.scale.width;
        const height = this.scale.height;
        const q = safeQuestions[currentIndex];

        this.questionText.setText(`Q${currentIndex + 1}. ${q.question}`);

        const optionSet = new Set([...(q.options || []), q.answer]);
        const options = this.shuffleOptions([...optionSet]).slice(0, 4);

        const positions =
          width < 760
            ? [
                [width * 0.42, height * 0.28],
                [width * 0.70, height * 0.38],
                [width * 0.46, height * 0.62],
                [width * 0.72, height * 0.72],
              ]
            : [
                [width * 0.42, height * 0.28],
                [width * 0.68, height * 0.34],
                [width * 0.46, height * 0.62],
                [width * 0.72, height * 0.70],
              ];

        options.forEach((answer, index) => {
          const [x, y] = positions[index];

          const pellet = this.add.container(x, y).setDepth(35);
          const glow = this.add.circle(0, 0, 50, 0xfacc15, 0.14);
          const food = this.add.circle(0, 0, 34, [0xf97316, 0x22c55e, 0x3b82f6, 0xa855f7][index], 1);
          const shine = this.add.circle(-10, -10, 8, 0xffffff, 0.45);

          pellet.answer = answer;
          pellet.add([glow, food, shine]);

          const label = this.add
            .text(x, y + 54, answer, {
              fontSize: "18px",
              color: "#ffffff",
              fontFamily: "Arial",
              fontStyle: "bold",
              stroke: "#000000",
              strokeThickness: 5,
            })
            .setOrigin(0.5)
            .setDepth(36);

          pellet.label = label;

          this.pellets.push(pellet);
          this.labels.push(label);

          this.tweens.add({
            targets: [pellet, label],
            y: `+=${index % 2 === 0 ? 70 : -70}`,
            x: `+=${index % 2 === 0 ? 28 : -28}`,
            duration: 1300 + index * 160,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
          });

          this.tweens.add({
            targets: pellet,
            scaleX: 1.12,
            scaleY: 1.12,
            duration: 580 + index * 100,
            yoyo: true,
            repeat: -1,
          });
        });

        syncHud("Eat the correct pellet.");
      }

      checkPelletCollision() {
        if (!this.fish || !canEat) return;

        this.pellets.forEach((pellet) => {
          const distance = Phaser.Math.Distance.Between(this.fish.x, this.fish.y, pellet.x, pellet.y);
          if (distance < 58) {
            canEat = false;
            this.checkAnswer(pellet);
          }
        });
      }

      checkAnswer(pellet) {
        const q = safeQuestions[currentIndex];
        const correct =
          String(pellet.answer).trim().toLowerCase() ===
          String(q.answer).trim().toLowerCase();

        if (correct) this.correctPellet(pellet);
        else this.wrongPellet(pellet);
      }

      correctPellet(pellet) {
        score += 10;
        health = Math.min(100, health + 15);
        timeLeft = Math.min(90, timeLeft + 3);

        this.burst(pellet.x, pellet.y, 0x22c55e, true);
        this.floatText(pellet.x, pellet.y - 70, "+10 SCORE", "#22c55e");
        this.centerMessage("YUMMY! CORRECT", "#22c55e");

        this.updateHealthBar();
        syncHud("+15 health and +3 seconds.");

        this.time.delayedCall(650, () => {
          currentIndex += 1;
          this.loadQuestion();
        });
      }

      wrongPellet(pellet) {
        health = Math.max(0, health - 22);
        score = Math.max(0, score - 3);

        this.burst(pellet.x, pellet.y, 0xef4444, false);
        this.floatText(pellet.x, pellet.y - 70, "-22 HEALTH", "#ef4444");
        this.centerMessage("WRONG FOOD!", "#ef4444");
        this.cameras.main.shake(150, 0.006);

        this.updateHealthBar();
        syncHud("Wrong pellet. Fish lost health.");

        if (health <= 0) {
          this.time.delayedCall(650, () => this.endGame("Fish needs rest!"));
          return;
        }

        this.time.delayedCall(650, () => {
          currentIndex += 1;
          this.loadQuestion();
        });
      }

      updateHealthBar() {
        if (!this.healthBar) return;

        const ratio = Phaser.Math.Clamp(health / 100, 0, 1);
        this.healthBar.width = 220 * ratio;

        if (health > 60) this.healthBar.setFillStyle(0x22c55e);
        else if (health > 30) this.healthBar.setFillStyle(0xfacc15);
        else this.healthBar.setFillStyle(0xef4444);
      }

      burst(x, y, color, correct) {
        const count = correct ? 34 : 22;

        for (let i = 0; i < count; i++) {
          const p = this.add
            .circle(x, y, Phaser.Math.Between(3, 8), color, Phaser.Math.FloatBetween(0.75, 1))
            .setDepth(80);

          this.tweens.add({
            targets: p,
            x: x + Phaser.Math.Between(-120, 120),
            y: y + Phaser.Math.Between(-110, 110),
            alpha: 0,
            scale: 0,
            duration: correct ? 650 : 470,
            ease: "Cubic.out",
            onComplete: () => p.destroy(),
          });
        }

        if (correct) {
          for (let i = 0; i < 10; i++) {
            const star = this.add.text(x, y, "⭐", { fontSize: "18px" }).setOrigin(0.5).setDepth(81);
            this.tweens.add({
              targets: star,
              x: x + Phaser.Math.Between(-90, 90),
              y: y + Phaser.Math.Between(-85, 85),
              alpha: 0,
              scale: 0.2,
              duration: 700,
              onComplete: () => star.destroy(),
            });
          }
        }
      }

      floatText(x, y, text, color) {
        const item = this.add
          .text(x, y, text, {
            fontSize: "24px",
            color,
            fontFamily: "Arial",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 5,
          })
          .setOrigin(0.5)
          .setDepth(85);

        this.tweens.add({
          targets: item,
          y: y - 45,
          alpha: 0,
          scale: 1.15,
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
            stroke: "#000000",
            strokeThickness: 6,
          })
          .setOrigin(0.5)
          .setDepth(86);

        this.tweens.add({
          targets: item,
          y: item.y - 40,
          alpha: 0,
          scale: 1.14,
          duration: 850,
          onComplete: () => item.destroy(),
        });
      }

      endGame(reason = "Game complete!") {
        if (ended) return;
        ended = true;
        canEat = false;
        this.clearPellets();
        this.timerEvent?.remove(false);

        const width = this.scale.width;
        const height = this.scale.height;

        const xp = Math.max(20, Math.round(score / 2));
        const coins = Math.max(10, Math.round(score / 8));

        this.add.rectangle(width / 2, height / 2, Math.min(width - 60, 660), 370, 0x0f172a, 0.96).setDepth(100);

        this.add
          .text(width / 2, height / 2 - 135, "🐟 FISH SURVIVAL COMPLETE", {
            fontSize: width < 700 ? "27px" : "39px",
            color: "#ffffff",
            fontFamily: "Arial",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 7,
          })
          .setOrigin(0.5)
          .setDepth(101);

        this.add
          .text(width / 2, height / 2 - 55, reason, {
            fontSize: "22px",
            color: "#38bdf8",
            fontFamily: "Arial",
            fontStyle: "bold",
          })
          .setOrigin(0.5)
          .setDepth(101);

        this.add
          .text(width / 2, height / 2 + 5, `Score: ${score} · Health: ${health} · Time: ${timeLeft}s`, {
            fontSize: "22px",
            color: "#facc15",
            fontFamily: "Arial",
          })
          .setOrigin(0.5)
          .setDepth(101);

        this.add
          .text(width / 2, height / 2 + 65, `Reward: +${xp} XP · +${coins} Coins`, {
            fontSize: "22px",
            color: "#22c55e",
            fontFamily: "Arial",
          })
          .setOrigin(0.5)
          .setDepth(101);

        syncHud("Game complete.");

        if (!rewardSentRef.current && typeof onRewardRef.current === "function") {
          rewardSentRef.current = true;
          onRewardRef.current({
            xp,
            coins,
            score,
            total: safeQuestions.length,
            mode: "fish-survival",
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
      scene: FishScene,
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
            <h1 className="text-xl font-black sm:text-3xl">🐟 Fish Survival Arena</h1>
            <p className="text-xs text-slate-400 sm:text-sm">
              {topic || "Study Topic"} · eat correct answer pellets · keep fish alive
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold sm:text-sm">
              Score: {hud.score}
            </div>
            <div className="rounded-xl bg-green-400/10 px-3 py-2 text-xs font-bold text-green-300 sm:text-sm">
              Health: {hud.health}
            </div>
            <div className="rounded-xl bg-yellow-400/10 px-3 py-2 text-xs font-bold text-yellow-300 sm:text-sm">
              Time: {hud.time}s
            </div>
            <div className="rounded-xl bg-blue-400/10 px-3 py-2 text-xs font-bold text-blue-300 sm:text-sm">
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
