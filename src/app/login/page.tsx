import Card from "../components/Card";

export default function Login() {
  return (
    <div className="flex justify-center mt-20">
      <Card>
        <h2 className="text-2xl font-bold mb-6">Login</h2>
        <input className="w-full p-3 mb-4 bg-slate-800 rounded-lg"
          placeholder="Email" />
        <input className="w-full p-3 mb-4 bg-slate-800 rounded-lg"
          type="password"
          placeholder="Password" />
        <button className="w-full bg-primary text-black py-3 rounded-lg font-semibold">
          Login
        </button>
      </Card>
    </div>
  );
}
