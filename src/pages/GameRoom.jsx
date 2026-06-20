import ArcheryGame from "../components/games/ArcheryGame";

export default function GameRoom({
  mode = "archery",
  questions = [],
  topic = "Study Topic",
  onExit,
  onReward,
}) {
  return (
    <div className="fixed inset-0 z-[99999] bg-black">
      <ArcheryGame
        questions={questions}
        topic={topic}
        onExit={onExit}
        onReward={onReward}
      />
    </div>
  );
}