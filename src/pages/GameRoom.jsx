import { useCallback, useEffect } from "react";
import ArcheryGame from "../components/games/ArcheryGame";
import FishGame from "../components/games/FishGame";

/**
 * Path: src/pages/GameRoom.jsx
 *
 * Fixed:
 * - Fish mode opens FishGame
 * - Archery mode opens ArcheryGame
 * - EXIT button always works above Phaser
 * - Clears old stuck localStorage/sessionStorage game state
 * - Browser back / Android back exits game room
 */

export default function GameRoom({
  mode = "archery",
  questions = [],
  topic = "Study Topic",
  onExit,
  onReward,
}) {
  const clearGameStorage = () => {
    const keys = [
      "studyGameStarted",
      "studyGameMode",
      "studyGameQuestions",
      "studyGameCurrent",
      "studyGameScore",
      "studentOS_studyGameStarted",
      "studentOS_studyGameMode",
      "studentOS_studyGameQuestions",
      "studentOS_studyGameCurrent",
      "studentOS_studyGameScore",
    ];

    keys.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  };

  const hardExitGame = useCallback(() => {
    clearGameStorage();

    if (typeof onExit === "function") {
      onExit();
    }
  }, [onExit]);

  useEffect(() => {
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
  }, [hardExitGame]);

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
            <p className="mt-2 text-slate-400">
              This game mode is coming next.
            </p>
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
