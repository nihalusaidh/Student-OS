import { useEffect } from "react";
import ArcheryGame from "../components/games/ArcheryGame";
import FishGame from "../components/games/FishGame";

/**
 * GameRoom.jsx - Fixed Exit + Mobile Fullscreen Wrapper
 * Path: src/pages/GameRoom.jsx
 *
 * What this fixes:
 * 1. EXIT button always appears above Phaser canvas.
 * 2. EXIT clears old/stuck study game localStorage values.
 * 3. Mobile minimize/reopen will not keep trapping user in game.
 * 4. FishGame still handles portrait layout:
 *    top = question/score/map/exit, middle = horizontal ocean, bottom = joystick.
 */

export default function GameRoom({
  mode = "archery",
  questions = [],
  topic = "Study Topic",
  onExit,
  onReward,
}) {
  const hardExitGame = () => {
    // Remove all possible old game-state keys from previous versions.
    localStorage.removeItem("studyGameStarted");
    localStorage.removeItem("studyGameMode");
    localStorage.removeItem("studyGameQuestions");
    localStorage.removeItem("studyGameCurrent");
    localStorage.removeItem("studyGameScore");

    localStorage.removeItem("studentOS_studyGameStarted");
    localStorage.removeItem("studentOS_studyGameMode");
    localStorage.removeItem("studentOS_studyGameQuestions");
    localStorage.removeItem("studentOS_studyGameCurrent");
    localStorage.removeItem("studentOS_studyGameScore");

    sessionStorage.removeItem("studyGameStarted");
    sessionStorage.removeItem("studyGameMode");
    sessionStorage.removeItem("studentOS_studyGameStarted");
    sessionStorage.removeItem("studentOS_studyGameMode");

    if (typeof onExit === "function") {
      onExit();
    }
  };

  useEffect(() => {
    // Make Android back button / browser back leave the game instead of trapping.
    window.history.pushState({ studentOSGameRoom: true }, "");

    const handlePopState = () => {
      hardExitGame();
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") hardExitGame();
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commonProps = {
    questions,
    topic,
    onExit: hardExitGame,
    onReward,
  };

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-hidden bg-black text-white"
      style={{
        width: "100dvw",
        height: "100dvh",
        maxWidth: "100dvw",
        maxHeight: "100dvh",
        margin: 0,
        padding: 0,
        touchAction: "none",
        overscrollBehavior: "none",
      }}
    >
      {/* This is a REAL React button, not Phaser. It stays clickable above the game. */}
      <button
        type="button"
        onClick={hardExitGame}
        className="fixed right-3 top-3 z-[1000000] rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white shadow-2xl shadow-red-950/40 transition active:scale-95 md:right-5 md:top-5 md:text-base"
      >
        EXIT
      </button>

      {mode === "fish" ? (
        <FishGame {...commonProps} />
      ) : mode === "archery" ? (
        <ArcheryGame {...commonProps} />
      ) : (
        <div className="flex h-[100dvh] w-screen items-center justify-center bg-slate-950 p-5 text-white">
          <div className="max-w-xl rounded-3xl border border-slate-700 bg-slate-900 p-8 text-center shadow-2xl">
            <div className="text-6xl">🎮</div>
            <h1 className="mt-4 text-3xl font-black">Game Room</h1>
            <p className="mt-2 text-slate-400">This game mode is coming next.</p>
            <button
              type="button"
              onClick={hardExitGame}
              className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 active:scale-95"
            >
              Back to Study Games
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
