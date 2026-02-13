import Card from "../components/Card";

export default function History() {
  return (
    <div className="space-y-6 mt-10">
      <Card>
        <h3 className="text-xl font-bold">Workout 1</h3>
        <p className="text-slate-400">Reps: 12 | Accuracy: 90%</p>
      </Card>

      <Card>
        <h3 className="text-xl font-bold">Workout 2</h3>
        <p className="text-slate-400">Reps: 10 | Accuracy: 88%</p>
      </Card>
    </div>
  );
}
