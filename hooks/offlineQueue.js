export function queue(action) {
  const q = JSON.parse(localStorage.getItem("queue") || "[]");
  q.push(action);
  localStorage.setItem("queue", JSON.stringify(q));
}

export async function sync() {
  const q = JSON.parse(localStorage.getItem("queue") || "[]");
  for (const item of q) {
    await fetch(item.url, item.options);
  }
  localStorage.removeItem("queue");
}
