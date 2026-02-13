"use client";
import { LineChart, Line, XAxis, YAxis } from "recharts";

const data = [
  { x: 1, y: 5 },
  { x: 2, y: 10 },
  { x: 3, y: -5 },
  { x: 4, y: 12 },
];

export default function MotionGraph() {
  return (
    <LineChart width={400} height={300} data={data}>
      <XAxis dataKey="x" />
      <YAxis />
      <Line type="monotone" dataKey="y" stroke="#0ea5e9" />
    </LineChart>
  );
}
