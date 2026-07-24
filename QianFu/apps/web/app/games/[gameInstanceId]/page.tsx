import { GameView } from "@/components/game/game-view";
export default function GamePage({ params }: { params: { gameInstanceId: string } }) { return <GameView gameInstanceId={params.gameInstanceId} />; }
