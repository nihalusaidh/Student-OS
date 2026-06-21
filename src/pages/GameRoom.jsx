import ArcheryGame from "../components/games/ArcheryGame";

export default function GameRoom({
  mode = "archery",
  questions = [],
  topic = "Study Topic",
  onExit,
  onReward,
}) {
  if (mode !== "archery") {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950 p-5 text-white">
        <div className="max-w-xl rounded-3xl border border-slate-700 bg-slate-900 p-8 text-center shadow-2xl">
          <div className="text-6xl">🎮</div>
          <h1 className="mt-4 text-3xl font-black">Game Room</h1>
          <p className="mt-2 text-slate-400">This game mode is coming next.</p>

          <button
            onClick={onExit}
            className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
          >
            Back to Study Games
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[99999] overflow-hidden bg-black">
      <ArcheryGame
        questions={questions}
        topic={topic}
        onExit={onExit}
        onReward={onReward}
      />
    </div>
  );
}
