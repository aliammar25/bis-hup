export function taskStatus(due) {
  const days = Math.ceil((new Date(due) - Date.now()) / 864e5);
  if (days < 0) return { cls: "over", label: "انتهى الموعد" };
  if (days <= 3) return { cls: "soon", label: "موعده قريب" };
  return { cls: "open", label: "مفتوح" };
}
export const fmtDate = (d) => new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
