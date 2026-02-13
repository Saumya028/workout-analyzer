import Card from "../components/Card";

export default function Dashboard() {
  return (
    <div className="grid md:grid-cols-3 gap-6 mt-10">
      <Card>
        <h3 className="text-xl font-bold">Total Workouts</h3>
        <p className="text-3xl mt-4">12</p>
      </Card>

      <Card>
        <h3 className="text-xl font-bold">Best Accuracy</h3>
        <p className="text-3xl mt-4">92%</p>
      </Card>

      <Card>
        <h3 className="text-xl font-bold">Total Reps</h3>
        <p className="text-3xl mt-4">420</p>
      </Card>
    </div>
  );
}
