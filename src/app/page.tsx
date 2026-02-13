export default function Home() {
  return (
    <div className="flex flex-col items-center text-center mt-20">
      <h1 className="text-6xl font-bold leading-tight mb-6">
        Track Your Workout.
        <br />
        <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Improve Every Rep.
        </span>
      </h1>

      <p className="text-slate-400 max-w-xl text-lg mb-10">
        Real-time rep counting, movement accuracy tracking,
        and 3D bar path visualization directly from your device sensors.
      </p>

      <a
        href="/workout"
        className="px-8 py-4 bg-cyan-500 hover:bg-cyan-600 transition rounded-xl font-semibold text-black"
      >
        Start Workout
      </a>
    </div>
  );
}
