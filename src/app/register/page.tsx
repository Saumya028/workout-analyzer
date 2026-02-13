import Card from "../components/Card";

export default function Register() {
  return (
    <div className="flex justify-center mt-20">
      <Card>
        <h2 className="text-2xl font-bold mb-6">Register</h2>
        <input className="w-full p-3 mb-4 bg-slate-800 rounded-lg"
          placeholder="Name" />
        <input className="w-full p-3 mb-4 bg-slate-800 rounded-lg"
          placeholder="Email" />
        <input className="w-full p-3 mb-4 bg-slate-800 rounded-lg"
          type="password"
          placeholder="Password" />
        <button className="w-full bg-primary text-black py-3 rounded-lg font-semibold">
          Create Account
        </button>
      </Card>
    </div>
  );
}
