import { onBeforeUnmount, onMounted, ref } from "vue";

export function useClock() {
  const time = ref("00:00:00");
  const date = ref("0000.00.00");
  const weekday = ref("---");
  const timezone = ref("UTC+00 / LOCAL");
  let timer: number | undefined;

  const updateClock = () => {
    const now = new Date();
    const dateParts = new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const readDatePart = (type: Intl.DateTimeFormatPartTypes) =>
      dateParts.find((part) => part.type === type)?.value ?? "00";
    const offsetMinutes = -now.getTimezoneOffset();
    const offsetSign = offsetMinutes >= 0 ? "+" : "-";
    const offsetHours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, "0");
    const offsetRemainder = Math.abs(offsetMinutes) % 60;
    const zoneName = Intl.DateTimeFormat().resolvedOptions().timeZone.split("/").pop() ?? "LOCAL";

    time.value = new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(now);
    date.value = `${readDatePart("year")}.${readDatePart("month")}.${readDatePart("day")}`;
    weekday.value = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][now.getDay()];
    timezone.value = `UTC${offsetSign}${offsetHours}${offsetRemainder ? `:${String(offsetRemainder).padStart(2, "0")}` : ""} / ${zoneName.toUpperCase()}`;
  };

  onMounted(() => {
    updateClock();
    timer = window.setInterval(updateClock, 1000);
  });
  onBeforeUnmount(() => window.clearInterval(timer));

  return { time, date, weekday, timezone };
}
