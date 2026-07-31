import { GameWorkbench } from "./workbench";

export default function GamePage({ params }: { params: { id: string } }) {
  return <GameWorkbench gameId={params.id} />;
}
