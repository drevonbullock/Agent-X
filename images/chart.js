import { ChartJSNodeCanvas } from "chartjs-node-canvas";

const WIDTH = 1200;
const HEIGHT = 675;
const ACCENT_COLOR = "#ff6b35";
const ACCENT_SECONDARY = "#7c3aed";

const CHART_SETS = [
  {
    type: "bar",
    label: "Tasks Automated / Week",
    data: [120, 185, 210, 340, 480, 620, 810],
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  {
    type: "line",
    label: "Model Accuracy Over Iterations",
    data: [0.51, 0.58, 0.64, 0.71, 0.76, 0.82, 0.87],
    labels: ["v1", "v2", "v3", "v4", "v5", "v6", "v7"],
  },
  {
    type: "line",
    label: "Inference Latency (ms)",
    data: [820, 640, 510, 390, 310, 250, 190],
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
  },
  {
    type: "bar",
    label: "MLB Prediction Accuracy (%)",
    data: [54, 57, 61, 58, 63, 67, 65],
    labels: ["Wk1", "Wk2", "Wk3", "Wk4", "Wk5", "Wk6", "Wk7"],
  },
];

export async function generateChart() {
  const set = CHART_SETS[Math.floor(Math.random() * CHART_SETS.length)];
  const isBar = set.type === "bar";

  const renderer = new ChartJSNodeCanvas({
    width: WIDTH,
    height: HEIGHT,
    backgroundColour: "#0a0a0a",
  });

  const config = {
    type: set.type,
    data: {
      labels: set.labels,
      datasets: [
        {
          label: set.label,
          data: set.data,
          backgroundColor: isBar
            ? `${ACCENT_COLOR}cc`
            : `${ACCENT_SECONDARY}33`,
          borderColor: isBar ? ACCENT_COLOR : ACCENT_SECONDARY,
          borderWidth: isBar ? 0 : 3,
          borderRadius: isBar ? 6 : 0,
          pointBackgroundColor: ACCENT_SECONDARY,
          pointRadius: isBar ? 0 : 5,
          fill: !isBar,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: "#aaaaaa",
            font: { size: 18 },
          },
        },
        title: {
          display: true,
          text: "Bullock Motion Labs",
          color: "#444444",
          font: { size: 16 },
          align: "end",
          padding: { bottom: 0 },
        },
      },
      scales: {
        x: {
          ticks: { color: "#888888", font: { size: 16 } },
          grid: { color: "rgba(255,255,255,0.05)" },
          border: { color: "rgba(255,255,255,0.1)" },
        },
        y: {
          ticks: { color: "#888888", font: { size: 16 } },
          grid: { color: "rgba(255,255,255,0.05)" },
          border: { color: "rgba(255,255,255,0.1)" },
        },
      },
      layout: {
        padding: 48,
      },
    },
  };

  const buffer = await renderer.renderToBuffer(config);
  return buffer;
}
